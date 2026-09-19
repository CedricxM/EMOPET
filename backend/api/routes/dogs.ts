import { and, eq, gte, sql } from 'drizzle-orm';
import { Hono, type MiddlewareHandler } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
  DogCreateSchema,
  DogUpdateSchema,
  OwnerProfessionalShareGrantCreateSchema,
  OwnerProfessionalShareGrantRevokeSchema,
  ProfessionalShareGrantIdSchema,
} from '@emopet/shared';

import { db } from '../../db/index.js';
import {
  sensorSummaries,
  dogs as dogsTable,
  professionalShareGrants,
} from '../../db/schema/index.js';
import {
  computePresenceComparison,
  getPresenceEventsForDog,
  type PresenceEventInput,
} from '../services/presence.js';
import {
  buildVetReportPdf,
  createVetReportShareToken,
  loadVetReportSummary,
  verifyVetReportShareToken,
} from '../services/vet-report.js';
import { requireDogOwnership } from '../middleware/authorization.js';

const dogs = new Hono();

function buildFallbackPresenceEvents(): PresenceEventInput[] {
  const now = new Date();
  return [
    { phoneSeen: true, timestamp: new Date(now.getTime() - 12 * 60 * 60 * 1000) },
    { phoneSeen: false, timestamp: new Date(now.getTime() - 8 * 60 * 60 * 1000) },
    { phoneSeen: true, timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000) },
  ];
}

function buildFallbackSummaries(dogId: string) {
  const now = Date.now();
  return [
    {
      id: 'fallback-1',
      dogId,
      timestamp: new Date(now - 11 * 60 * 60 * 1000),
      source: 'TAG',
      matPresenceMinutes: 28,
      respiratoryRateMean: null,
      respiratoryRateStd: null,
      respiratoryRateConfidence: null,
      weightKg: null,
      positionChanges: null,
      activityMinutes: 22,
      distanceKm: 1.8,
      vocalEvents: 3,
      vocalEnergyMean: null,
      postureDistribution: null,
      agitationEvents: 2,
      temperatureC: 15,
      humidityPct: 74,
      createdAt: new Date(),
    },
    {
      id: 'fallback-2',
      dogId,
      timestamp: new Date(now - 7 * 60 * 60 * 1000),
      source: 'TAG',
      matPresenceMinutes: 12,
      respiratoryRateMean: null,
      respiratoryRateStd: null,
      respiratoryRateConfidence: null,
      weightKg: null,
      positionChanges: null,
      activityMinutes: 16,
      distanceKm: 1.4,
      vocalEvents: 7,
      vocalEnergyMean: null,
      postureDistribution: null,
      agitationEvents: 5,
      temperatureC: 17,
      humidityPct: 68,
      createdAt: new Date(),
    },
    {
      id: 'fallback-3',
      dogId,
      timestamp: new Date(now - 3 * 60 * 60 * 1000),
      source: 'MAT',
      matPresenceMinutes: 36,
      respiratoryRateMean: 22,
      respiratoryRateStd: 1.2,
      respiratoryRateConfidence: 0.8,
      weightKg: 24.8,
      positionChanges: 4,
      activityMinutes: 10,
      distanceKm: 0.8,
      vocalEvents: 2,
      vocalEnergyMean: null,
      postureDistribution: null,
      agitationEvents: 1,
      temperatureC: 18,
      humidityPct: 65,
      createdAt: new Date(),
    },
  ];
}

function getUserId(c: unknown): string | undefined {
  return (c as { get: (key: string) => unknown }).get('userId') as string | undefined;
}

function legacyGenericVetShareAllowed(): boolean {
  return process.env['NODE_ENV'] !== 'production' &&
    process.env['EMOPET_ALLOW_LEGACY_GENERIC_VET_SHARE'] === '1';
}

function databaseUnavailable(
  c: { json: (value: unknown, status?: number) => Response },
  operation: string,
): Response {
  return c.json({
    error: 'Product V1 database operation unavailable.',
    code: 'PRODUCT_DATABASE_OPERATION_UNAVAILABLE',
    operation,
    retryable: true,
  }, 503);
}

type ShareTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Recheck current ownership in the transaction that consumes it. FOR SHARE
 * blocks owner changes/deletion until commit (FOR KEY SHARE would not).
 * Always lock dog before grant; keep network calls outside these transactions.
 */
async function withOwnerProfessionalShareAuthority<T>(
  userId: string,
  dogId: string,
  operation: (tx: ShareTransaction) => Promise<T>,
): Promise<T | null> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL lock_timeout = '5s'`);
    await tx.execute(sql`SET LOCAL statement_timeout = '10s'`);
    const [ownedDog] = await tx
      .select({ id: dogsTable.id })
      .from(dogsTable)
      .where(and(eq(dogsTable.id, dogId), eq(dogsTable.ownerId, userId)))
      .limit(1)
      .for('share');
    if (!ownedDog) return null;
    return operation(tx);
  });
}

function toOwnerProfessionalShareGrant(row: typeof professionalShareGrants.$inferSelect) {
  return {
    id: row.id,
    dogId: row.dogId,
    recipient: {
      displayName: row.recipientDisplayName,
      type: row.recipientType,
      ...(row.recipientOrganizationName
        ? { organizationName: row.recipientOrganizationName }
        : {}),
      ...(row.recipientEmail ? { email: row.recipientEmail } : {}),
    },
    purpose: row.purpose,
    ...(row.purposeNote ? { purposeNote: row.purposeNote } : {}),
    scopes: row.scopes,
    window: {
      dataFrom: row.dataFrom.toISOString(),
      dataTo: row.dataTo.toISOString(),
      accessExpiresAt: row.accessExpiresAt.toISOString(),
    },
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ...(row.activatedAt ? { activatedAt: row.activatedAt.toISOString() } : {}),
    ...(row.revokedAt ? { revokedAt: row.revokedAt.toISOString() } : {}),
    ...(row.revocationReason ? { revocationReason: row.revocationReason } : {}),
  };
}

dogs.get('/', async (c) => {
  return c.json({ dogs: [] });
});

dogs.post('/', zValidator('json', DogCreateSchema), async (c) => {
  const body = c.req.valid('json');
  return c.json({ message: 'created', name: body.name }, 201);
});

dogs.get('/:id', async (c) => {
  const id = c.req.param('id');
  const denied = await requireDogOwnership(c, id);
  if (denied) return denied;
  return c.json({ id });
});

dogs.get('/:id/absence-comparison', async (c) => {
  const id = c.req.param('id');
  const denied = await requireDogOwnership(c, id);
  if (denied) return denied;

  const days = Number(c.req.query('days') ?? '14');
  const since = new Date();
  since.setDate(since.getDate() - days);

  let summaries: Array<typeof sensorSummaries.$inferSelect> = [];
  try {
    summaries = await db
      .select()
      .from(sensorSummaries)
      .where(and(eq(sensorSummaries.dogId, id), gte(sensorSummaries.timestamp, since)))
      .orderBy(sensorSummaries.timestamp);
  } catch {
    summaries = [];
  }

  const comparison = computePresenceComparison(
    (summaries.length > 0 ? summaries : buildFallbackSummaries(id)).map((item) => ({
      timestamp: item.timestamp,
      matPresenceMinutes: item.matPresenceMinutes ?? undefined,
      vocalEvents: item.vocalEvents ?? undefined,
      agitationEvents: item.agitationEvents ?? undefined,
      respiratoryRateMean: item.respiratoryRateMean ?? undefined,
      respiratoryRateConfidence: item.respiratoryRateConfidence ?? undefined,
      weightKg: item.weightKg ?? undefined,
    })),
    getPresenceEventsForDog(id, since).length > 0
      ? getPresenceEventsForDog(id, since)
      : buildFallbackPresenceEvents(),
  );

  return c.json({
    dogId: id,
    days,
    comparison,
    message:
      comparison.gate === 'REJECT'
        ? 'Pas assez de donnees pour comparer presence et absence.'
        : 'Comparaison presence / absence disponible.',
  });
});

/**
 * Owner-side lifecycle for professional grants.
 *
 * Creation is deliberately PENDING. Email is contact metadata only and cannot
 * become professional authentication. There is no activation route until an
 * approved server-side professional identity/binding authority exists.
 */
const privateProfessionalShareResponse: MiddlewareHandler = async (c, next) => {
  c.header('Cache-Control', 'private, no-store');
  await next();
};
dogs.use('/:id/professional-shares', privateProfessionalShareResponse);
dogs.use('/:id/professional-shares/*', privateProfessionalShareResponse);

dogs.post(
  '/:id/professional-shares',
  zValidator('json', OwnerProfessionalShareGrantCreateSchema),
  async (c) => {
    const id = c.req.param('id');
    const denied = await requireDogOwnership(c, id);
    if (denied) return denied;

    const userId = getUserId(c)!;
    const body = c.req.valid('json');
    try {
      const created = await withOwnerProfessionalShareAuthority(userId, id, async (tx) => {
        const [row] = await tx.insert(professionalShareGrants).values({
          ownerUserId: userId,
          dogId: id,
          recipientDisplayName: body.recipient.displayName,
          recipientType: body.recipient.type,
          recipientOrganizationName: body.recipient.organizationName,
          recipientEmail: body.recipient.email,
          recipientPrincipalId: null,
          purpose: body.purpose,
          purposeNote: body.purposeNote,
          scopes: body.scopes,
          dataFrom: new Date(body.window.dataFrom),
          dataTo: new Date(body.window.dataTo),
          accessExpiresAt: new Date(body.window.accessExpiresAt),
          status: 'PENDING',
          activatedAt: null,
        })
          .returning();
        if (!row) throw new Error('Professional share was not persisted');
        return row;
      });

      if (!created) return c.json({ error: 'not_found' }, 404);
      return c.json({
        grant: toOwnerProfessionalShareGrant(created),
        activation: 'REQUIRES_VERIFIED_PROFESSIONAL_IDENTITY',
      }, 201);
    } catch {
      return databaseUnavailable(c, 'create_professional_share');
    }
  },
);

dogs.get('/:id/professional-shares', async (c) => {
  const id = c.req.param('id');
  const denied = await requireDogOwnership(c, id);
  if (denied) return denied;

  const userId = getUserId(c)!;
  try {
    const rows = await withOwnerProfessionalShareAuthority(userId, id, async (tx) => tx
      .select()
      .from(professionalShareGrants)
      .where(and(
        eq(professionalShareGrants.ownerUserId, userId),
        eq(professionalShareGrants.dogId, id),
      ))
      .orderBy(professionalShareGrants.createdAt));

    if (!rows) return c.json({ error: 'not_found' }, 404);
    return c.json({ grants: rows.map(toOwnerProfessionalShareGrant) });
  } catch {
    return databaseUnavailable(c, 'list_professional_shares');
  }
});

dogs.post('/:id/professional-shares/:grantId/revoke', async (c) => {
  const id = c.req.param('id');
  const denied = await requireDogOwnership(c, id);
  if (denied) return denied;

  const grantId = c.req.param('grantId');
  if (!ProfessionalShareGrantIdSchema.safeParse(grantId).success) {
    return c.json({ error: 'not_found' }, 404);
  }

  const bodyText = await c.req.text();
  let rawBody: unknown;
  try {
    rawBody = bodyText.trim() ? JSON.parse(bodyText) : {};
  } catch {
    return c.json({ error: 'invalid_request' }, 400);
  }
  const parsedBody = OwnerProfessionalShareGrantRevokeSchema.safeParse(rawBody);
  if (!parsedBody.success) return c.json({ error: 'invalid_request' }, 400);

  const userId = getUserId(c)!;
  try {
    const revoked = await withOwnerProfessionalShareAuthority(userId, id, async (tx) => {
      const [existing] = await tx
        .select()
        .from(professionalShareGrants)
        .where(and(
          eq(professionalShareGrants.id, grantId),
          eq(professionalShareGrants.dogId, id),
          eq(professionalShareGrants.ownerUserId, userId),
        ))
        .limit(1)
        .for('update');

      if (!existing) return null;
      // Serialize the read and write: concurrent retries must preserve the
      // first committed revocation timestamp and reason.
      if (existing.status === 'REVOKED') return existing;

      const now = new Date();
      const [row] = await tx
        .update(professionalShareGrants)
        .set({
          status: 'REVOKED',
          revokedAt: now,
          revocationReason: parsedBody.data.reason ?? null,
          updatedAt: now,
        })
        .where(and(
          eq(professionalShareGrants.id, grantId),
          eq(professionalShareGrants.dogId, id),
          eq(professionalShareGrants.ownerUserId, userId),
        ))
        .returning();
      if (!row) throw new Error('Professional share revocation was not persisted');
      return row;
    });

    if (!revoked) return c.json({ error: 'not_found' }, 404);
    return c.json({ grant: toOwnerProfessionalShareGrant(revoked) });
  } catch {
    return databaseUnavailable(c, 'revoke_professional_share');
  }
});

dogs.get('/:id/vet-report-link', async (c) => {
  const id = c.req.param('id');
  const denied = await requireDogOwnership(c, id);
  if (denied) return denied;

  if (!legacyGenericVetShareAllowed()) {
    return c.json({
      error: 'Generic professional sharing is disabled',
      code: 'RECIPIENT_BOUND_GRANT_REQUIRED',
      // Legacy gate identifier retained for evidence/history compatibility.
      gate: 'G-GUARDIAN-PROFESSIONAL-SHARE-01',
      message: 'Create a recipient-bound, scoped, expiring professional grant instead.',
    }, 409);
  }

  const days = Number(c.req.query('days') ?? '14');
  const userId = String(getUserId(c) ?? '');
  const token = await createVetReportShareToken(userId, id, days);
  const url = new URL(c.req.url);
  url.pathname = `/api/dogs/${id}/vet-report`;
  url.search = '';
  url.searchParams.set('days', String(days));
  url.searchParams.set('share_token', token);

  return c.json({
    dogId: id,
    days,
    expiresInMinutes: 30,
    url: url.toString(),
  });
});

dogs.get('/:id/vet-report', async (c) => {
  const id = c.req.param('id');
  const days = Number(c.req.query('days') ?? '14');
  const shareToken = c.req.query('share_token');
  const isShareAccess = typeof shareToken === 'string' && shareToken.length > 0;

  if (isShareAccess) {
    if (!legacyGenericVetShareAllowed()) {
      return c.json({
        error: 'Legacy generic share access is disabled',
        code: 'RECIPIENT_BOUND_GRANT_REQUIRED',
        // Legacy gate identifier retained for evidence/history compatibility.
        gate: 'G-GUARDIAN-PROFESSIONAL-SHARE-01',
      }, 401);
    }

    const isValid = await verifyVetReportShareToken(shareToken, id, days);
    if (!isValid) {
      return c.json({ error: 'Invalid or expired share token' }, 401);
    }
  } else if (!getUserId(c)) {
    return c.json({ error: 'Unauthorized' }, 401);
  } else {
    const denied = await requireDogOwnership(c, id);
    if (denied) return denied;
  }

  const summary = await loadVetReportSummary(id, days);
  const pdf = buildVetReportPdf(summary);
  return new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="emopet-vet-report-${id}.pdf"`,
      'Cache-Control': 'private, max-age=0, no-store',
    },
  });
});

dogs.patch('/:id', zValidator('json', DogUpdateSchema), async (c) => {
  const id = c.req.param('id');
  const denied = await requireDogOwnership(c, id);
  if (denied) return denied;
  return c.json({ id, message: 'updated' });
});

dogs.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const denied = await requireDogOwnership(c, id);
  if (denied) return denied;
  return c.json({ id, message: 'deleted' });
});

export { dogs };
