import { and, eq } from 'drizzle-orm';

import { db } from '../../db/index.js';
import { dogs } from '../../db/schema/index.js';
import { isCanonicalUserId } from './auth-security.js';

export { isCanonicalUserId as isCanonicalSubjectUuid };

/**
 * Convenience lookup for non-transactional callers only.
 *
 * Security-sensitive discovery does not use this helper because its ownership
 * decision must be held in the same transaction as the subject-linked reads.
 */
export async function findOwnedDog(userId: string, dogId: string) {
  if (!isCanonicalUserId(userId) || !isCanonicalUserId(dogId)) return null;

  return db.query.dogs.findFirst({
    where: and(eq(dogs.id, dogId), eq(dogs.ownerId, userId)),
  });
}
