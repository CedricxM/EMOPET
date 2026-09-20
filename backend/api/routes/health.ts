import { desc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { HealthEntryCreateSchema } from '@emopet/shared';

import { db } from '../../db/index.js';
import { healthEntries } from '../../db/schema/index.js';
import { requireDogOwnership } from '../middleware/authorization.js';

const health = new Hono();

export const HEALTH_DATABASE_UNAVAILABLE = 'HEALTH_DATABASE_UNAVAILABLE' as const;
export const HEALTH_REMINDER_POLICY_NOT_READY = 'HEALTH_REMINDER_POLICY_NOT_READY' as const;

function markPrivate(c: { header: (name: string, value: string) => void }): void {
  c.header('Cache-Control', 'private, no-store');
}

function databaseUnavailable(
  c: {
    header: (name: string, value: string) => void;
    json: (value: unknown, status?: number) => Response;
  },
  operation: 'list_entries' | 'create_entry',
): Response {
  markPrivate(c);
  return c.json({
    error: 'Health journal authoritative database operation unavailable.',
    code: HEALTH_DATABASE_UNAVAILABLE,
    operation,
    retryable: true,
  }, 503);
}

function reminderPolicyUnavailable(
  c: {
    header: (name: string, value: string) => void;
    json: (value: unknown, status?: number) => Response;
  },
): Response {
  markPrivate(c);
  return c.json({
    error: 'Health reminder scheduling semantics are not yet Product V1 authority.',
    code: HEALTH_REMINDER_POLICY_NOT_READY,
    operation: 'list_reminders',
    retryable: false,
    maturity: 'POLICY_NOT_IMPLEMENTED',
  }, 503);
}

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

health.get('/:dogId', async (c) => {
  const dogId = c.req.param('dogId');
  const denied = await requireDogOwnership(c, dogId);
  if (denied) return denied;

  try {
    const entries = await db
      .select()
      .from(healthEntries)
      .where(eq(healthEntries.dogId, dogId))
      .orderBy(desc(healthEntries.date), desc(healthEntries.createdAt));

    markPrivate(c);
    return c.json({ dogId, entries });
  } catch {
    return databaseUnavailable(c, 'list_entries');
  }
});

health.post('/', zValidator('json', HealthEntryCreateSchema), async (c) => {
  const body = c.req.valid('json');
  const denied = await requireDogOwnership(c, body.dogId);
  if (denied) return denied;

  try {
    const [created] = await db
      .insert(healthEntries)
      .values({
        dogId: body.dogId,
        type: body.type,
        date: toDateOnly(body.date),
        title: body.title,
        details: body.details,
        value: body.value,
        nextDueDate: body.nextDueDate ? toDateOnly(body.nextDueDate) : undefined,
      })
      .returning();

    if (!created) return databaseUnavailable(c, 'create_entry');

    markPrivate(c);
    return c.json({ entry: created }, 201);
  } catch {
    return databaseUnavailable(c, 'create_entry');
  }
});

health.get('/:dogId/reminders', async (c) => {
  const dogId = c.req.param('dogId');
  const denied = await requireDogOwnership(c, dogId);
  if (denied) return denied;

  return reminderPolicyUnavailable(c);
});

export { health };
