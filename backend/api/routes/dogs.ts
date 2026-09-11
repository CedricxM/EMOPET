import { and, eq, sql } from 'drizzle-orm';
import { Hono, type MiddlewareHandler } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
  DogCreateSchema,
  DogUpdateSchema,
  GuardianProfessionalShareGrantCreateSchema,
  GuardianProfessionalShareGrantRevokeSchema,
  ProfessionalShareGrantIdSchema,
} from '@emopet/shared';

import { db } from '../../db/index.js';
import {
  dogs as dogsTable,
  professionalShareGrants,
} from '../../db/schema/index.js';
import {
  buildVetReportPdf,
  createVetReportShareToken,
  loadVetReportSummary,
  verifyVetReportShareToken,
} from '../services/vet-report.js';
import { requireDogOwnership } from '../middleware/authorization.js';

const dogs = new Hono();

export const ABSENCE_COMPARISON_PERSISTENCE_CODE =
  'ABSENCE_COMPARISON_PERSISTENCE_NOT_READY' as const;
export const DOG_ERASURE_LIFECYCLE_CODE =
  'DOG_ERASURE_LIFECYCLE_NOT_READY' as const;

function legacyGenericVetShareAllowed(): boolean {
  return process.env['NODE_ENV'] !== 'production' &&
    process.env['EMOPET_ALLOW_LEGACY_GENERIC_VET_SHARE'] === '1';
}

function parseReportDays(value: string | undefined): number | null {
  const parsed = Number(value ?? '14');
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 30 ? parsed : null;
}

function getUserId(c: unknown): string | undefined {
  const value = (c as { get: (key: string) => unknown }).get('userId');
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function requireUserId(c: { json: (value: unknown, status?: number) => Response } & unknown): string | Response {
  const userId = getUserId(c);
  if (userId) return userId;
  return c.json({ error: 'unauthorized' }, 401);
}

function toDbDate(value: Date): string {
  return value.toISOString().slice(0, 10);
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
async function withGuardianProfessionalShareAuthority<T>(
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

function toGuardianProfessionalShareGrant(row: typeof professionalShareGrants.$inferSelect) {
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
  const userId = requireUserId(c);
  if (typeof userId !== 'string') return userId;

  try {
    const rows = await db
      .select()
      .from(dogsTable)
      .where(eq(dogsTable.ownerId, userId))
      .orderBy(dogsTable.createdAt);
    return c.json({ dogs: rows });
  } catch {
    return databaseUnavailable(c, 'list_dogs');
  }
});

dogs.post('/', zValidator('json', DogCreateSchema), async (c) => {
  const userId = requireUserId(c);
  if (typeof userId !== 'string') return userId;
  const body = c.req.valid('json');

  try {
    const [created] = await db
      .insert(dogsTable)
      .values({
        ownerId: userId,
        name: body.name,
        breed: body.breed,
        breedFciNumber: body.breedFciNumber,
        birthDate: toDbDate(body.birthDate),
        sex: body.sex,
        weight: body.weight,
        furClass: body.furClass,
        photoUrl: body.photo,
      })
      .returning();

    if (!created) return databaseUnavailable(c, 'create_dog');
    return c.json({ dog: created }, 201);
  } catch {
    return databaseUnavailable(c, 'create_dog');
  }
});

dogs.get('/:id', async (c) => {
  const id = c.req.param('id');
  const denied = await requireDogOwnership(c, id);
  if (denied) return denied;

  const userId = getUserId(c)!;
  try {
    const [row] = await db
      .select()
      .from(dogsTable)
      .where(and(eq(dogsTable.id, id), eq(dogsTable.ownerId, userId)))
      .limit(1);
    if (!row) return c.json({ error: 'not_found' }, 404);
    return c.json({ dog: row });
  } catch {
    return databaseUnavailable(c, 'get_dog');
  }
});

dogs.get('/:id/absence-comparison', async (c) => {
  const id = c.req.param('id');
  const denied = await requireDogOwnership(c, id);
  if (denied) return denied;

  const days = parseReportDays(c.req.query('days'));
  if (days == null) return c.json({ error: 'days must be an integer between 1 and 30' }, 400);

  return c.json({
    error: 'Presence/absence comparison requires durable presence-event authority before release.',
    code: ABSENCE_COMPARISON_PERSISTENCE_CODE,
    operation: 'absence_comparison',
    retryable: false,
    maturity: 'NOT_IMPLEMENTED',
  }, 503);
});

/**
 * Guardian-side lifecycle for professional grants.
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
  zValidator('json', GuardianProfessionalShareGrantCreateSchema),
  async (c) => {
    const id = c.req.param('id');
    const denied = await requireDogOwnership(c, id);
    if (denied) return denied;

    const userId = getUserId(c)!;
    const body = c.req.valid('json');
    try {
      const created = await withGuardianProfessionalShareAuthority(userId, id, async (tx) => {
        const [row] = await tx.insert(professionalShareGrants).values({
          guardianUserId: userId,
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
        grant: toGuardianProfessionalShareGrant(created),
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
    const rows = await withGuardianProfessionalShareAuthority(userId, id, async (tx) => tx
      .select()
      .from(professionalShareGrants)
      .where(and(
        eq(professionalShareGrants.guardianUserId, userId),
        eq(professionalShareGrants.dogId, id),
      ))
      .orderBy(professionalShareGrants.createdAt));

    if (!rows) return c.json({ error: 'not_found' }, 404);
    return c.json({ grants: rows.map(toGuardianProfessionalShareGrant) });
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
  const parsedBody = GuardianProfessionalShareGrantRevokeSchema.safeParse(rawBody);
  if (!parsedBody.success) return c.json({ error: 'invalid_request' }, 400);

  const userId = getUserId(c)!;
  try {
    const revoked = await withGuardianProfessionalShareAuthority(userId, id, async (tx) => {
      const [existing] = await tx
        .select()
        .from(professionalShareGrants)
        .where(and(
          eq(professionalShareGrants.id, grantId),
          eq(professionalShareGrants.dogId, id),
          eq(professionalShareGrants.guardianUserId, userId),
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
          eq(professionalShareGrants.guardianUserId, userId),
        ))
        .returning();
      if (!row) throw new Error('Professional share revocation was not persisted');
      return row;
    });

    if (!revoked) return c.json({ error: 'not_found' }, 404);
    return c.json({ grant: toGuardianProfessionalShareGrant(revoked) });
  } catch {
    return databaseUnavailable(c, 'revoke_professional_share');
  }
});

/**
 * Legacy generic share-link endpoint.
 *
 * HOLD for release under #64: this token is not recipient-bound and has no
 * durable revocation entity. It remains available only for explicit non-production
 * compatibility testing while the scoped professional-grant backend is built.
 */
dogs.get('/:id/vet-report-link', async (c) => {
  const id = c.req.param('id');
  const denied = await requireDogOwnership(c, id);
  if (denied) return denied;

  if (!legacyGenericVetShareAllowed()) {
    return c.json({
      error: 'Generic professional sharing is disabled',
      code: 'RECIPIENT_BOUND_GRANT_REQUIRED',
      gate: 'G-GUARDIAN-PROFESSIONAL-SHARE-01',
      message: 'Create a recipient-bound, scoped, expiring professional grant instead.',
    }, 409);
  }

  const days = parseReportDays(c.req.query('days'));
  if (days == null) return c.json({ error: 'days must be an integer between 1 and 30' }, 400);

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
    authority: 'LEGACY_NON_PRODUCTION_ONLY',
    url: url.toString(),
  });
});

dogs.get('/:id/vet-report', async (c) => {
  const id = c.req.param('id');
  const days = parseReportDays(c.req.query('days'));
  if (days == null) return c.json({ error: 'days must be an integer between 1 and 30' }, 400);

  const shareToken = c.req.query('share_token');
  const isShareAccess = typeof shareToken === 'string' && shareToken.length > 0;

  if (isShareAccess) {
    if (!legacyGenericVetShareAllowed()) {
      return c.json({
        error: 'Legacy generic share access is disabled',
        code: 'RECIPIENT_BOUND_GRANT_REQUIRED',
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
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
});

dogs.patch('/:id', zValidator('json', DogUpdateSchema), async (c) => {
  const id = c.req.param('id');
  const denied = await requireDogOwnership(c, id);
  if (denied) return denied;

  const userId = getUserId(c)!;
  const body = c.req.valid('json');
  const values: Partial<typeof dogsTable.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (body.name !== undefined) values.name = body.name;
  if (body.breed !== undefined) values.breed = body.breed;
  if (body.breedFciNumber !== undefined) values.breedFciNumber = body.breedFciNumber;
  if (body.birthDate !== undefined) values.birthDate = toDbDate(body.birthDate);
  if (body.sex !== undefined) values.sex = body.sex;
  if (body.weight !== undefined) values.weight = body.weight;
  if (body.furClass !== undefined) values.furClass = body.furClass;
  if (body.photo !== undefined) values.photoUrl = body.photo;

  try {
    const [updated] = await db
      .update(dogsTable)
      .set(values)
      .where(and(eq(dogsTable.id, id), eq(dogsTable.ownerId, userId)))
      .returning();
    if (!updated) return c.json({ error: 'not_found' }, 404);
    return c.json({ dog: updated });
  } catch {
    return databaseUnavailable(c, 'update_dog');
  }
});

/**
 * Fail closed until PRIV-01 defines and implements the complete dog-erasure
 * lifecycle. Deleting only the canonical dogs row would not prove erasure of
 * dependent, derived, object-store, provider, cache/index or backup copies.
 */
dogs.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const denied = await requireDogOwnership(c, id);
  if (denied) return denied;

  c.header('Cache-Control', 'private, no-store');
  return c.json({
    error: 'Dog erasure is unavailable until the approved lifecycle covers dependent and external data.',
    code: DOG_ERASURE_LIFECYCLE_CODE,
    deleted: false,
    retryable: false,
    maturity: 'NOT_IMPLEMENTED',
    gate: 'G-PRIV-ERASURE',
  }, 409);
});

export { dogs };
