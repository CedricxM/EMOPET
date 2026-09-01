import { and, eq } from 'drizzle-orm';

import { db } from '../../db/index.js';
import { dogs } from '../../db/schema/index.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isCanonicalSubjectUuid(value: string | null | undefined): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

export async function findOwnedDog(userId: string, dogId: string) {
  if (!isCanonicalSubjectUuid(userId) || !isCanonicalSubjectUuid(dogId)) {
    return null;
  }

  return db.query.dogs.findFirst({
    where: and(eq(dogs.id, dogId), eq(dogs.ownerId, userId)),
  });
}
