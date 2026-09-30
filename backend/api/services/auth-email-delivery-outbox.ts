import { createHash } from 'node:crypto';

import {
  and,
  asc,
  desc,
  eq,
  gt,
  isNull,
  lte,
  or,
  sql,
} from 'drizzle-orm';

import { db } from '../../db/index.js';
import {
  authEmailVerificationDeliveryRequests,
  users,
} from '../../db/schema/index.js';
import { normalizeEmail } from './auth-security.js';
import {
  buildEmailVerificationUrl,
  deliverEmailVerification,
  type EmailVerificationDeliveryDeps,
  type EmailVerificationDeliveryResult,
} from './auth-email-delivery.js';
import {
  EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS,
  issueEmailVerificationToken,
} from './auth-email-verification.js';

export const EMAIL_VERIFICATION_DELIVERY_REQUEST_COOLDOWN_SECONDS = 60;
export const EMAIL_VERIFICATION_DELIVERY_CLAIM_LEASE_SECONDS = 5 * 60;
export const EMAIL_VERIFICATION_DELIVERY_MAX_ATTEMPTS = 5;
export const EMAIL_VERIFICATION_DELIVERY_RETRY_SECONDS = [60, 300, 900, 1800] as const;

type DeliveryFunction = (
  input: { to: string; verificationUrl: string },
  deps?: EmailVerificationDeliveryDeps,
) => Promise<EmailVerificationDeliveryResult>;

export interface EmailVerificationDeliveryWorkerDeps {
  clock?: () => Date;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  deliver?: DeliveryFunction;
}

export type EmailVerificationDeliveryProcessResult =
  | { status: 'no_work' }
  | { status: 'delivered' }
  | { status: 'not_eligible' }
  | { status: 'retry_scheduled' }
  | { status: 'failed' };

export function hashEmailVerificationDeliveryAddress(emailInput: string): string {
  const email = normalizeEmail(emailInput);
  return createHash('sha256').update(email, 'utf8').digest('hex');
}

/**
 * Public-path enqueue. It intentionally performs no user lookup and no provider
 * I/O, so registration/resend latency does not branch on account eligibility.
 *
 * Requests for the same normalized email are coalesced for 60 seconds. A
 * partial unique index also guarantees at most one active intent per email.
 */
export async function enqueueEmailVerificationDeliveryRequest(
  emailInput: string,
  clock: () => Date = () => new Date(),
): Promise<{ queued: boolean; coalesced: boolean }> {
  const email = normalizeEmail(emailInput);
  const emailHash = hashEmailVerificationDeliveryAddress(email);
  const now = clock();
  const cutoff = new Date(
    now.getTime() - EMAIL_VERIFICATION_DELIVERY_REQUEST_COOLDOWN_SECONDS * 1_000,
  );

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${emailHash}, 0))`);

    const [recent] = await tx
      .select({ id: authEmailVerificationDeliveryRequests.id })
      .from(authEmailVerificationDeliveryRequests)
      .where(and(
        eq(authEmailVerificationDeliveryRequests.emailHash, emailHash),
        gt(authEmailVerificationDeliveryRequests.requestedAt, cutoff),
      ))
      .orderBy(desc(authEmailVerificationDeliveryRequests.requestedAt))
      .limit(1);

    if (recent) return { queued: false, coalesced: true };

    const inserted = await tx
      .insert(authEmailVerificationDeliveryRequests)
      .values({
        email,
        emailHash,
        requestedAt: now,
        availableAt: now,
        attemptCount: 0,
        updatedAt: now,
      })
      .onConflictDoNothing()
      .returning({ id: authEmailVerificationDeliveryRequests.id });

    return {
      queued: inserted.length === 1,
      coalesced: inserted.length === 0,
    };
  });
}

async function claimNextDeliveryRequest(now: Date) {
  return db.transaction(async (tx) => {
    const [candidate] = await tx
      .select({
        id: authEmailVerificationDeliveryRequests.id,
        email: authEmailVerificationDeliveryRequests.email,
        attemptCount: authEmailVerificationDeliveryRequests.attemptCount,
      })
      .from(authEmailVerificationDeliveryRequests)
      .where(and(
        isNull(authEmailVerificationDeliveryRequests.completedAt),
        lte(authEmailVerificationDeliveryRequests.availableAt, now),
        or(
          isNull(authEmailVerificationDeliveryRequests.claimExpiresAt),
          lte(authEmailVerificationDeliveryRequests.claimExpiresAt, now),
        ),
      ))
      .orderBy(
        asc(authEmailVerificationDeliveryRequests.availableAt),
        asc(authEmailVerificationDeliveryRequests.requestedAt),
      )
      .limit(1)
      .for('update', { skipLocked: true });

    if (!candidate?.email) return null;

    const claimExpiresAt = new Date(
      now.getTime() + EMAIL_VERIFICATION_DELIVERY_CLAIM_LEASE_SECONDS * 1_000,
    );

    const [claimed] = await tx
      .update(authEmailVerificationDeliveryRequests)
      .set({
        claimedAt: now,
        claimExpiresAt,
        updatedAt: now,
      })
      .where(eq(authEmailVerificationDeliveryRequests.id, candidate.id))
      .returning({
        id: authEmailVerificationDeliveryRequests.id,
        email: authEmailVerificationDeliveryRequests.email,
        attemptCount: authEmailVerificationDeliveryRequests.attemptCount,
      });

    if (!claimed?.email) return null;
    return {
      id: claimed.id,
      email: claimed.email,
      attemptCount: claimed.attemptCount,
    };
  });
}

async function completeDeliveryRequest(
  id: string,
  outcome: 'delivered' | 'not_eligible' | 'failed',
  now: Date,
  options: {
    attemptCount?: number;
    lastError?: 'provider_not_configured' | 'provider_rejected' | 'provider_unavailable' | 'invalid_input' | null;
    providerMessageId?: string | null;
  } = {},
): Promise<void> {
  const update = {
    email: null,
    claimedAt: null,
    claimExpiresAt: null,
    completedAt: now,
    outcome,
    lastError: options.lastError ?? null,
    providerMessageId: options.providerMessageId ?? null,
    updatedAt: now,
    ...(options.attemptCount === undefined
      ? {}
      : { attemptCount: options.attemptCount }),
  };

  await db
    .update(authEmailVerificationDeliveryRequests)
    .set(update)
    .where(eq(authEmailVerificationDeliveryRequests.id, id));
}

async function releaseForCooldown(id: string, now: Date): Promise<void> {
  await db
    .update(authEmailVerificationDeliveryRequests)
    .set({
      claimedAt: null,
      claimExpiresAt: null,
      availableAt: new Date(
        now.getTime() + EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS * 1_000,
      ),
      updatedAt: now,
    })
    .where(eq(authEmailVerificationDeliveryRequests.id, id));
}

async function recordDeliveryFailure(
  id: string,
  priorAttemptCount: number,
  error: 'provider_not_configured' | 'provider_rejected' | 'provider_unavailable' | 'invalid_input',
  now: Date,
): Promise<'retry_scheduled' | 'failed'> {
  const attemptCount = priorAttemptCount + 1;

  if (attemptCount >= EMAIL_VERIFICATION_DELIVERY_MAX_ATTEMPTS) {
    await completeDeliveryRequest(id, 'failed', now, {
      attemptCount,
      lastError: error,
    });
    return 'failed';
  }

  const delaySeconds =
    EMAIL_VERIFICATION_DELIVERY_RETRY_SECONDS[attemptCount - 1] ?? 1800;

  await db
    .update(authEmailVerificationDeliveryRequests)
    .set({
      claimedAt: null,
      claimExpiresAt: null,
      attemptCount,
      lastError: error,
      availableAt: new Date(now.getTime() + delaySeconds * 1_000),
      updatedAt: now,
    })
    .where(eq(authEmailVerificationDeliveryRequests.id, id));

  return 'retry_scheduled';
}

/**
 * Process at most one durable delivery intent.
 *
 * Eligibility, token issuance and provider I/O happen only after the public
 * request has returned. No raw token or verification URL is written to the
 * outbox. A worker crash is recovered by the claim lease; provider ambiguity
 * may cause a later superseding token/email, but never durable raw-token state.
 */
export async function processNextEmailVerificationDeliveryRequest(
  deps: EmailVerificationDeliveryWorkerDeps = {},
): Promise<EmailVerificationDeliveryProcessResult> {
  const clock = deps.clock ?? (() => new Date());
  const now = clock();
  const claimed = await claimNextDeliveryRequest(now);
  if (!claimed) return { status: 'no_work' };

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      emailVerifiedAt: users.emailVerifiedAt,
      emailVerificationRequiredAt: users.emailVerificationRequiredAt,
    })
    .from(users)
    .where(eq(users.email, claimed.email))
    .limit(1);

  if (
    !user
    || user.emailVerifiedAt !== null
    || user.emailVerificationRequiredAt === null
  ) {
    await completeDeliveryRequest(claimed.id, 'not_eligible', now);
    return { status: 'not_eligible' };
  }

  const issued = await issueEmailVerificationToken(user.id, user.email, clock);
  if (!issued.ok) {
    if (issued.reason === 'cooldown') {
      await releaseForCooldown(claimed.id, now);
      return { status: 'retry_scheduled' };
    }

    await completeDeliveryRequest(claimed.id, 'not_eligible', now);
    return { status: 'not_eligible' };
  }

  const env = deps.env ?? process.env;
  const verificationUrl = buildEmailVerificationUrl(issued.rawToken, env);
  if (!verificationUrl) {
    const status = await recordDeliveryFailure(
      claimed.id,
      claimed.attemptCount,
      'provider_not_configured',
      now,
    );
    return { status };
  }

  const deliver = deps.deliver ?? deliverEmailVerification;
  const result = await deliver(
    { to: user.email, verificationUrl },
    { env, fetchImpl: deps.fetchImpl },
  );

  if (!result.ok) {
    const status = await recordDeliveryFailure(
      claimed.id,
      claimed.attemptCount,
      result.error,
      now,
    );
    return { status };
  }

  await completeDeliveryRequest(claimed.id, 'delivered', now, {
    attemptCount: claimed.attemptCount + 1,
    providerMessageId: result.providerMessageId,
  });
  return { status: 'delivered' };
}

export async function dispatchEmailVerificationDeliveryBatch(
  limit = 25,
  deps: EmailVerificationDeliveryWorkerDeps = {},
): Promise<Record<EmailVerificationDeliveryProcessResult['status'], number>> {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    throw new Error('email verification delivery batch limit must be 1..100');
  }

  const counts: Record<EmailVerificationDeliveryProcessResult['status'], number> = {
    no_work: 0,
    delivered: 0,
    not_eligible: 0,
    retry_scheduled: 0,
    failed: 0,
  };

  for (let i = 0; i < limit; i += 1) {
    const result = await processNextEmailVerificationDeliveryRequest(deps);
    counts[result.status] += 1;
    if (result.status === 'no_work') break;
  }

  return counts;
}
