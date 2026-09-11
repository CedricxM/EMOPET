import { ProfessionalShareReadIntentSchema } from '@emopet/shared';
import { and, eq, sql } from 'drizzle-orm';

import { db } from '../../db/index.js';
import {
  dogs,
  professionalShareAccessAudits,
  professionalShareGrants,
} from '../../db/schema/index.js';
import {
  createProfessionalShareAccessChecker,
  type ProfessionalShareAccessAuthority,
  type ProfessionalShareReadDecision,
} from './professional-share-access.js';
import {
  createProfessionalShareDbAuthority,
  type VerifiedProfessionalRecipientResolver,
} from './professional-share-db-authority.js';

type ShareTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type AuthorizedDecision = Extract<ProfessionalShareReadDecision, { allowed: true }>;
type UnsuccessfulDecision = Exclude<ProfessionalShareReadDecision, { allowed: true }>;
type VerifiedRecipient = Awaited<ReturnType<VerifiedProfessionalRecipientResolver>>;
type ReadIntent = ReturnType<typeof ProfessionalShareReadIntentSchema.parse>;

export type ProfessionalShareRecipientReadResult<T> =
  | UnsuccessfulDecision
  | (AuthorizedDecision & { data: T });

export interface ProfessionalShareScopedCollectorContext {
  /**
   * Transaction-scoped database handle. The collector must remain read-only and
   * must only assemble the semantic projection represented by authorization.
   */
  tx: ShareTransaction;
  authorization: AuthorizedDecision;
}

export type ProfessionalShareScopedCollector<T> = (
  context: ProfessionalShareScopedCollectorContext,
) => Promise<T>;

const authorityUnavailable = (): UnsuccessfulDecision => ({
  allowed: false,
  status: 'UNAVAILABLE',
  reason: 'AUTHORITY_UNAVAILABLE',
});

const auditUnavailable = (): UnsuccessfulDecision => ({
  allowed: false,
  status: 'UNAVAILABLE',
  reason: 'AUDIT_UNAVAILABLE',
});

function toAccessRecord(row: typeof professionalShareGrants.$inferSelect): unknown {
  return {
    id: row.id,
    guardianUserId: row.guardianUserId,
    dogId: row.dogId,
    recipient: {
      displayName: row.recipientDisplayName,
      type: row.recipientType,
      ...(row.recipientOrganizationName
        ? { organizationName: row.recipientOrganizationName }
        : {}),
      ...(row.recipientEmail ? { email: row.recipientEmail } : {}),
      ...(row.recipientPrincipalId ? { principalId: row.recipientPrincipalId } : {}),
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
    ...(row.activatedAt ? { activatedAt: row.activatedAt.toISOString() } : {}),
    ...(row.revokedAt ? { revokedAt: row.revokedAt.toISOString() } : {}),
  };
}

function createTransactionAuthority(
  tx: ShareTransaction,
  recipient: VerifiedRecipient,
): ProfessionalShareAccessAuthority {
  return {
    async readGrant(grantId, dogId) {
      const [row] = await tx
        .select()
        .from(professionalShareGrants)
        .where(and(
          eq(professionalShareGrants.id, grantId),
          eq(professionalShareGrants.dogId, dogId),
        ))
        .limit(1);
      return row ? toAccessRecord(row) : null;
    },

    async resolveVerifiedRecipient() {
      return recipient;
    },

    async hasCurrentGuardianAuthority(guardianUserId, dogId) {
      const [row] = await tx
        .select({ id: dogs.id })
        .from(dogs)
        .where(and(eq(dogs.id, dogId), eq(dogs.ownerId, guardianUserId)))
        .limit(1);
      return Boolean(row);
    },

    async recordDecision(event) {
      const [written] = await tx
        .insert(professionalShareAccessAudits)
        .values({
          grantId: event.grantId,
          dogId: event.dogId,
          event: event.event,
          decisionStatus: event.status,
          reason: event.reason,
        })
        .returning({ id: professionalShareAccessAudits.id });
      return Boolean(written);
    },
  };
}

/**
 * Stabilize the authority consumed by publication using the same lock order as
 * Guardian grant lifecycle operations: dog first, grant second.
 *
 * A revocation/ownership change that commits first is observed by the final
 * policy check. If this read acquires the locks first, the later mutation waits
 * until this transaction commits. Collected data is never returned before this
 * publication gate succeeds.
 */
async function lockPublicationAuthority(tx: ShareTransaction, intent: ReadIntent): Promise<void> {
  await tx
    .select({ id: dogs.id })
    .from(dogs)
    .where(eq(dogs.id, intent.dogId))
    .limit(1)
    .for('share');

  await tx
    .select({ id: professionalShareGrants.id })
    .from(professionalShareGrants)
    .where(and(
      eq(professionalShareGrants.id, intent.grantId),
      eq(professionalShareGrants.dogId, intent.dogId),
    ))
    .limit(1)
    .for('share');
}

async function recordUnavailableAudit(intent: ReadIntent): Promise<void> {
  await db.insert(professionalShareAccessAudits).values({
    grantId: intent.grantId,
    dogId: intent.dogId,
    event: 'PROFESSIONAL_SHARE_POLICY_DECISION',
    decisionStatus: 'UNAVAILABLE',
    reason: 'AUTHORITY_UNAVAILABLE',
  });
}

/**
 * Internal recipient-read publication boundary for #64.
 *
 * This is intentionally not a route and does not provide professional identity,
 * activation/delivery, or an approved veterinary report projection. Identity is
 * resolved once before opening the database transaction so external/provider
 * work is never held under PostgreSQL locks.
 *
 * The first policy check is a non-publishing preflight and deliberately does not
 * write a durable AUTHORIZED audit. After collection, dog then grant are locked
 * and the policy is re-evaluated against transaction-current durable state. Only
 * that final decision is durably audited and allowed data is returned after the
 * transaction commits. A collector failure or database/lock failure returns a
 * sanitized UNAVAILABLE result and best-effort sanitized audit.
 */
export function createProfessionalShareRecipientReadBoundary(
  resolveVerifiedRecipient: VerifiedProfessionalRecipientResolver,
  clock: () => number = Date.now,
) {
  return async function readScopedRecipientData<T>(
    rawIntent: unknown,
    collect: ProfessionalShareScopedCollector<T>,
  ): Promise<ProfessionalShareRecipientReadResult<T>> {
    const parsedIntent = ProfessionalShareReadIntentSchema.safeParse(rawIntent);
    if (!parsedIntent.success) {
      return { allowed: false, status: 'DENIED', reason: 'INVALID_REQUEST' };
    }
    const intent = parsedIntent.data;

    let recipient: VerifiedRecipient;
    try {
      recipient = await resolveVerifiedRecipient();
    } catch {
      try {
        await recordUnavailableAudit(intent);
      } catch {
        // Fail closed even if the audit store is unavailable.
      }
      return authorityUnavailable();
    }

    const fixedRecipientResolver: VerifiedProfessionalRecipientResolver = async () => recipient;
    const durableAuthority = createProfessionalShareDbAuthority(fixedRecipientResolver);
    const preflightAuthority: ProfessionalShareAccessAuthority = {
      ...durableAuthority,
      // Preflight only decides whether collection may start. It is not evidence
      // that any recipient data was published.
      async recordDecision() {
        return true;
      },
    };
    const preflight = await createProfessionalShareAccessChecker(preflightAuthority, clock)(intent);

    if (!preflight.allowed) {
      // Preserve the already-computed fail-closed decision. Re-running policy
      // here could race into AUTHORIZED without collected data and would turn an
      // audit write into a second authorization attempt.
      try {
        const written = await durableAuthority.recordDecision({
          event: 'PROFESSIONAL_SHARE_POLICY_DECISION',
          grantId: intent.grantId,
          dogId: intent.dogId,
          status: preflight.status,
          reason: preflight.reason,
        });
        return written === true ? preflight : auditUnavailable();
      } catch {
        return auditUnavailable();
      }
    }

    try {
      return await db.transaction(async (tx): Promise<ProfessionalShareRecipientReadResult<T>> => {
        await tx.execute(sql`SET LOCAL lock_timeout = '5s'`);
        await tx.execute(sql`SET LOCAL statement_timeout = '15s'`);

        // No bytes leave this service here. The result remains transaction-local
        // until the final authority lock and recheck below succeed.
        const data = await collect({ tx, authorization: preflight });

        await lockPublicationAuthority(tx, intent);
        const finalAuthority = createTransactionAuthority(tx, recipient);
        const finalDecision = await createProfessionalShareAccessChecker(finalAuthority, clock)(intent);
        if (!finalDecision.allowed) return finalDecision;

        return { ...finalDecision, data };
      });
    } catch {
      // The transaction rolled back, including any final audit. Record only a
      // sanitized availability failure outside it when the audit store is usable.
      try {
        await recordUnavailableAudit(intent);
      } catch {
        // Fail closed even if audit persistence is unavailable.
      }
      return authorityUnavailable();
    }
  };
}
