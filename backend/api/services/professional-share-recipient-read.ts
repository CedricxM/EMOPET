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
import {
  projectProfessionalShareSnapshot,
  type ProfessionalShareProjectedData,
} from './professional-share-projection.js';
import { collectProfessionalShareVetSnapshot } from './professional-share-vet-snapshot.js';
import type { VetReportSummary } from './vet-report.js';

type ShareTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type AuthorizedDecision = Extract<ProfessionalShareReadDecision, { allowed: true }>;
type UnsuccessfulDecision = Exclude<ProfessionalShareReadDecision, { allowed: true }>;
type VerifiedRecipient = Awaited<ReturnType<VerifiedProfessionalRecipientResolver>>;
type ReadIntent = ReturnType<typeof ProfessionalShareReadIntentSchema.parse>;

export type ProfessionalShareRecipientReadResult =
  | UnsuccessfulDecision
  | (AuthorizedDecision & { data: ProfessionalShareProjectedData });

export interface ProfessionalShareScopedCollectorContext {
  /**
   * Transaction-scoped database handle. The collector must remain read-only.
   * Its VetReportSummary result is internal-only and is never published as-is.
   */
  tx: ShareTransaction;
  authorization: AuthorizedDecision;
}

export type ProfessionalShareScopedCollector = (
  context: ProfessionalShareScopedCollectorContext,
) => Promise<VetReportSummary>;

export interface ProfessionalShareRecipientReadBoundaryOptions {
  /** Test/internal dependency seam. Production callers should use the bounded default collector. */
  collect?: ProfessionalShareScopedCollector;
  clock?: () => number;
}

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
    ownerUserId: row.ownerUserId,
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

    async hasCurrentOwnerAuthority(ownerUserId, dogId) {
      const [row] = await tx
        .select({ id: dogs.id })
        .from(dogs)
        .where(and(eq(dogs.id, dogId), eq(dogs.ownerId, ownerUserId)))
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
 * Owner grant lifecycle operations: dog first, grant second.
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
 * activation or delivery. Identity is resolved once before opening the database
 * transaction so external/provider work is never held under PostgreSQL locks.
 *
 * The default collector reads only the authorized dog and exact data window.
 * After collection, dog then grant are locked and policy is re-evaluated against
 * transaction-current durable state. Only after that final durable check succeeds
 * does the centralized scope projector rebuild the exact fields allowed to leave
 * the boundary. Projection failure rolls back the final AUTHORIZED audit and
 * fails closed.
 */
export function createProfessionalShareRecipientReadBoundary(
  resolveVerifiedRecipient: VerifiedProfessionalRecipientResolver,
  options: ProfessionalShareRecipientReadBoundaryOptions = {},
) {
  const collect = options.collect ?? collectProfessionalShareVetSnapshot;
  const clock = options.clock ?? Date.now;

  return async function readScopedRecipientData(
    rawIntent: unknown,
  ): Promise<ProfessionalShareRecipientReadResult> {
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
      return await db.transaction(async (tx): Promise<ProfessionalShareRecipientReadResult> => {
        await tx.execute(sql`SET LOCAL lock_timeout = '5s'`);
        await tx.execute(sql`SET LOCAL statement_timeout = '15s'`);

        // No bytes leave this service here. This is an internal snapshot only.
        const collectedSnapshot = await collect({ tx, authorization: preflight });

        await lockPublicationAuthority(tx, intent);
        const finalAuthority = createTransactionAuthority(tx, recipient);
        const finalDecision = await createProfessionalShareAccessChecker(finalAuthority, clock)(intent);
        if (!finalDecision.allowed) return finalDecision;

        const data = projectProfessionalShareSnapshot(finalDecision, collectedSnapshot);
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
