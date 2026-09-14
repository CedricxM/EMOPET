import { and, eq } from 'drizzle-orm';

import { db } from '../../db/index.js';
import { dogs } from '../../db/schema/index.js';
import { isCanonicalUserId } from './auth-security.js';

export { isCanonicalUserId as isCanonicalSubjectUuid };

export async function findOwnedDog(userId: string, dogId: string) {
  if (!isCanonicalUserId(userId) || !isCanonicalUserId(dogId)) return null;

  return db.query.dogs.findFirst({
    where: and(eq(dogs.id, dogId), eq(dogs.ownerId, userId)),
  });
}
