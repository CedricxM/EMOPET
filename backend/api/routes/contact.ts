import { desc, eq } from 'drizzle-orm';
import { Hono } from 'hono';

import { db } from '../../db/index.js';
import { contactRequests } from '../../db/schema/index.js';
import { getCurrentUserId } from '../middleware/authorization.js';

const contact = new Hono();

export const CONTACT_PRODUCT_V1_CANDIDATE_DISABLED = 'CONTACT_PRODUCT_V1_CANDIDATE_DISABLED' as const;
export const CONTACT_DATABASE_UNAVAILABLE = 'CONTACT_DATABASE_UNAVAILABLE' as const;

const ALLOWED_REASONS = new Set([
  'retour_experience',
  'question_usage',
  'probleme_technique',
  'autre',
]);
const ALLOWED_INPUT_FIELDS = new Set(['reason', 'message', 'consentGiven']);

interface ContactCreateInput {
  reason: string;
  message: string;
  consentGiven: true;
}

type ContactInputResult =
  | { ok: true; value: ContactCreateInput }
  | { ok: false; errors: string[] };

function markPrivate(c: { header: (name: string, value: string) => void }): void {
  c.header('Cache-Control', 'private, no-store');
  c.header('Pragma', 'no-cache');
  c.header('X-Content-Type-Options', 'nosniff');
}

export function isContactProductV1CandidateAllowed(): boolean {
  if (process.env['NODE_ENV'] === 'production') return false;
  const value = process.env['EMOPET_ENABLE_CONTACT_PRODUCT_V1_CANDIDATE']?.trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes' || value === 'on';
}

export function parseContactCreateInput(value: unknown): ContactInputResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, errors: ['Request body must be an object.'] };
  }

  const body = value as Record<string, unknown>;
  const errors: string[] = [];
  for (const key of Object.keys(body)) {
    if (!ALLOWED_INPUT_FIELDS.has(key)) {
      errors.push(`Unsupported Contact field: ${key}`);
    }
  }

  const reason = typeof body['reason'] === 'string' ? body['reason'].trim() : '';
  if (!ALLOWED_REASONS.has(reason)) {
    errors.push('Invalid Contact reason.');
  }

  const message = typeof body['message'] === 'string' ? body['message'].trim() : '';
  if (!message) errors.push('Contact message is required.');
  if (message.length > 500) errors.push('Contact message must be at most 500 characters.');

  if (body['consentGiven'] !== true) {
    errors.push('Explicit Contact consent is required.');
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { reason, message, consentGiven: true } };
}

function databaseUnavailable(
  c: {
    header: (name: string, value: string) => void;
    json: (value: unknown, status?: number) => Response;
  },
  operation: 'list_requests' | 'create_request',
): Response {
  markPrivate(c);
  return c.json({
    error: 'Contact authoritative database operation unavailable.',
    code: CONTACT_DATABASE_UNAVAILABLE,
    operation,
    retryable: true,
  }, 503);
}

contact.use('*', async (c, next) => {
  markPrivate(c);
  if (!isContactProductV1CandidateAllowed()) {
    return c.json({
      error: 'Contact Product V1 authority is not enabled.',
      code: CONTACT_PRODUCT_V1_CANDIDATE_DISABLED,
      retryable: false,
      maturity: 'CANDIDATE_NOT_PRODUCTION_AUTHORITY',
    }, 503);
  }
  await next();
});

contact.get('/', async (c) => {
  const requesterUserId = getCurrentUserId(c);
  if (!requesterUserId) return c.json({ error: 'unauthorized' }, 401);

  try {
    const requests = await db
      .select({
        id: contactRequests.id,
        reason: contactRequests.reason,
        message: contactRequests.message,
        status: contactRequests.status,
        consentAt: contactRequests.consentAt,
        createdAt: contactRequests.createdAt,
        updatedAt: contactRequests.updatedAt,
      })
      .from(contactRequests)
      .where(eq(contactRequests.requesterUserId, requesterUserId))
      .orderBy(desc(contactRequests.createdAt), desc(contactRequests.id));

    return c.json({ requests });
  } catch {
    return databaseUnavailable(c, 'list_requests');
  }
});

contact.post('/', async (c) => {
  const requesterUserId = getCurrentUserId(c);
  if (!requesterUserId) return c.json({ error: 'unauthorized' }, 401);

  let rawBody: unknown;
  try {
    rawBody = await c.req.json();
  } catch {
    return c.json({
      error: 'Invalid Contact request.',
      code: 'CONTACT_INVALID_REQUEST',
      errors: ['Request body must be valid JSON.'],
    }, 400);
  }

  const parsed = parseContactCreateInput(rawBody);
  if (!parsed.ok) {
    return c.json({
      error: 'Invalid Contact request.',
      code: 'CONTACT_INVALID_REQUEST',
      errors: parsed.errors,
    }, 400);
  }

  try {
    const [created] = await db
      .insert(contactRequests)
      .values({
        requesterUserId,
        reason: parsed.value.reason,
        message: parsed.value.message,
        consentAt: new Date(),
      })
      .returning({
        id: contactRequests.id,
        reason: contactRequests.reason,
        message: contactRequests.message,
        status: contactRequests.status,
        consentAt: contactRequests.consentAt,
        createdAt: contactRequests.createdAt,
        updatedAt: contactRequests.updatedAt,
      });

    if (!created) return databaseUnavailable(c, 'create_request');
    return c.json({ request: created }, 201);
  } catch {
    return databaseUnavailable(c, 'create_request');
  }
});

export { contact };
