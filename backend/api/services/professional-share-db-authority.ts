import { and, eq } from 'drizzle-orm';

import { db } from '../../db/index.js';
import {
  dogs,
  professionalShareAccessAudits,
  professionalShareGrants,
} from '../../db/schema/index.js';
import type { ProfessionalShareAccessAuthority } from './professional-share-access.js';

export type VerifiedProfessionalRecipientResolver = () => Promise<{
  principalId: string;
} | null>;

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

/**
 * Compose the fail-closed sharing policy with durable grant/audit persistence.
 *
 * Recipient verification stays injected because the repository has no approved
 * professional identity provider. This adapter must not be used as evidence
 * that recipient identity, delivery or a production sharing route is complete.
 */
export function createProfessionalShareDbAuthority(
  resolveVerifiedRecipient: VerifiedProfessionalRecipientResolver,
): ProfessionalShareAccessAuthority {
  return {
    async readGrant(grantId, dogId) {
      const [row] = await db
        .select()
        .from(professionalShareGrants)
        .where(and(
          eq(professionalShareGrants.id, grantId),
          eq(professionalShareGrants.dogId, dogId),
        ))
        .limit(1);
      return row ? toAccessRecord(row) : null;
    },

    resolveVerifiedRecipient,

    async hasCurrentOwnerAuthority(ownerUserId, dogId) {
      const [row] = await db
        .select({ id: dogs.id })
        .from(dogs)
        .where(and(eq(dogs.id, dogId), eq(dogs.ownerId, ownerUserId)))
        .limit(1);
      return Boolean(row);
    },

    async recordDecision(event) {
      const [written] = await db
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
