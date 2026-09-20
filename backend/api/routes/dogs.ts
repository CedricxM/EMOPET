import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { DogCreateSchema, DogUpdateSchema } from '@emopet/shared';

import { db } from '../../db/index.js';
import {
  dogs as dogsTable,
  users,
} from '../../db/schema/index.js';
import {
  buildVetReportPdf,
  createVetReportShareToken,
  loadVetReportSummary,
  VetReportDataUnavailableError,
  verifyVetReportShareToken,
} from '../services/vet-report.js';
import { isCanonicalUuid, requireDogOwnership } from '../middleware/authorization.js';
import { parseLookbackWindow } from '../utils/temporal-window.js';

const dogs = new Hono();

export const ABSENCE_COMPARISON_PERSISTENCE_CODE =
  'ABSENCE_COMPARISON_PERSISTENCE_NOT_READY' as const;
export const DOG_ERASURE_LIFECYCLE_CODE =
  'DOG_ERASURE_LIFECYCLE_NOT_READY' as const;

function getUserId(c: unknown): string | undefined {
  const value = (c as { get: (key: string) => unknown }).get('userId');
  return isCanonicalUuid(value) ? value : undefined;
}

function requireUserId(
  c: { json: (value: unknown, status?: number) => Response } & unknown,
): string | Response {
  const userId = getUserId(c);
  return userId ?? c.json({ error: 'unauthorized' }, 401);
}

function toDbDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function serializeDog(row: typeof dogsTable.$inferSelect) {
  return {
    ...row,
    photo: row.photoUrl,
  };
}

function databaseUnavailable(
  c: {
    header: (name: string, value: string) => void;
    json: (value: unknown, status?: number) => Response;
  },
  operation: string,
): Response {
  c.header('Cache-Control', 'private, max-age=0, no-store');
  return c.json(
    {
      error: 'PRODUCT_DATABASE_OPERATION_UNAVAILABLE',
      operation,
      retryable: true,
    },
    503,
  );
}

function parseVetReportDays(rawValue: string | undefined): number | null {
  if (rawValue === undefined) return 14;
  const normalized = rawValue.trim();
  if (!/^\d+$/.test(normalized)) return null;
  const days = Number(normalized);
  return Number.isSafeInteger(days) && days > 0 ? days : null;
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
    return c.json({ dogs: rows.map(serializeDog) });
  } catch {
    return databaseUnavailable(c, 'list_dogs');
  }
});

dogs.post('/', zValidator('json', DogCreateSchema), async (c) => {
  const userId = requireUserId(c);
  if (typeof userId !== 'string') return userId;
  const body = c.req.valid('json');

  try {
    const created = await db.transaction(async (tx) => {
      const [guardian] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      if (!guardian) return null;

      const [row] = await tx
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
      return row ?? null;
    });

    if (!created) return c.json({ error: 'unauthorized' }, 401);
    return c.json({ dog: serializeDog(created) }, 201);
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
    return c.json({ dog: serializeDog(row) });
  } catch {
    return databaseUnavailable(c, 'get_dog');
  }
});

dogs.get('/:id/absence-comparison', async (c) => {
  const id = c.req.param('id');
  const denied = await requireDogOwnership(c, id);
  if (denied) return denied;

  const window = parseLookbackWindow(c.req.query('days'));
  if (!window) {
    return c.json({ error: 'invalid_presence_window', parameter: 'days' }, 400);
  }

  c.header('Cache-Control', 'private, no-store');
  return c.json({
    error: 'Presence/absence comparison requires durable presence-event authority before release.',
    code: ABSENCE_COMPARISON_PERSISTENCE_CODE,
    operation: 'absence_comparison',
    retryable: false,
    maturity: 'NOT_IMPLEMENTED',
  }, 503);
});
dogs.get('/:id/vet-report-link', async (c) => {
  const id = c.req.param('id');
  const denied = await requireDogOwnership(c, id);
  if (denied) return denied;

  const days = parseVetReportDays(c.req.query('days'));
  if (days === null) return c.json({ error: 'invalid_report_period' }, 400);

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
  const days = parseVetReportDays(c.req.query('days'));
  if (days === null) return c.json({ error: 'invalid_report_period' }, 400);

  const shareToken = c.req.query('share_token');
  const isShareAccess = typeof shareToken === 'string' && shareToken.length > 0;

  if (isShareAccess) {
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

  try {
    const summary = await loadVetReportSummary(id, days);
    const pdf = buildVetReportPdf(summary);
    return new Response(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="emopet-vet-report-${id}.pdf"`,
        'Cache-Control': 'private, max-age=0, no-store',
      },
    });
  } catch (error) {
    if (error instanceof VetReportDataUnavailableError) {
      c.header('Cache-Control', 'private, max-age=0, no-store');
      return c.json(
        {
          error: error.code,
          message: 'Vet report data is temporarily unavailable.',
        },
        503,
      );
    }
    throw error;
  }
});

dogs.patch('/:id', zValidator('json', DogUpdateSchema), async (c) => {
  const id = c.req.param('id');
  const denied = await requireDogOwnership(c, id);
  if (denied) return denied;

  const userId = getUserId(c)!;
  const body = c.req.valid('json');
  const values: Partial<typeof dogsTable.$inferInsert> = {};

  if (body.name !== undefined) values.name = body.name;
  if (body.breed !== undefined) values.breed = body.breed;
  if (body.breedFciNumber !== undefined) values.breedFciNumber = body.breedFciNumber;
  if (body.birthDate !== undefined) values.birthDate = toDbDate(body.birthDate);
  if (body.sex !== undefined) values.sex = body.sex;
  if (body.weight !== undefined) values.weight = body.weight;
  if (body.furClass !== undefined) values.furClass = body.furClass;
  if (body.photo !== undefined) values.photoUrl = body.photo;

  if (Object.keys(values).length === 0) {
    return c.json({ error: 'no_updates' }, 400);
  }
  values.updatedAt = new Date();

  try {
    const [updated] = await db
      .update(dogsTable)
      .set(values)
      .where(and(eq(dogsTable.id, id), eq(dogsTable.ownerId, userId)))
      .returning();

    if (!updated) return c.json({ error: 'not_found' }, 404);
    return c.json({ dog: serializeDog(updated) });
  } catch {
    return databaseUnavailable(c, 'update_dog');
  }
});

dogs.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const denied = await requireDogOwnership(c, id);
  if (denied) return denied;

  c.header('Cache-Control', 'private, max-age=0, no-store');
  return c.json(
    {
      error: 'Dog erasure is unavailable until the approved lifecycle covers dependent and external data.',
      code: DOG_ERASURE_LIFECYCLE_CODE,
      deleted: false,
      retryable: false,
      maturity: 'NOT_IMPLEMENTED',
      gate: 'G-PRIV-ERASURE',
    },
    409,
  );
});

export { dogs };
