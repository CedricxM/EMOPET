import type { Context } from 'hono';
import { eq } from 'drizzle-orm';

import { db } from '../../db/index.js';
import { dogs } from '../../db/schema/index.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface DogOwnershipLookup {
  findDogOwnerId(dogId: string): Promise<string | null>;
}

export interface AuthorizationResult {
  ok: boolean;
  status: 400 | 401 | 404;
  error: 'invalid_dog_id' | 'unauthorized' | 'not_found';
}

export function getCurrentUserId(c: Context): string | null {
  const userId = c.get('userId');
  return typeof userId === 'string' && userId.trim() ? userId : null;
}

export function createDogOwnershipAuthorizer(lookup: DogOwnershipLookup) {
  return async function assertUserOwnsDog(userId: string | null, dogId: string): Promise<AuthorizationResult> {
    if (!userId) return { ok: false, status: 401, error: 'unauthorized' };
    if (!UUID_RE.test(dogId)) return { ok: false, status: 400, error: 'invalid_dog_id' };

    const ownerId = await lookup.findDogOwnerId(dogId);
    if (!ownerId || ownerId !== userId) return { ok: false, status: 404, error: 'not_found' };

    return { ok: true, status: 404, error: 'not_found' };
  };
}

export const assertUserOwnsDog = createDogOwnershipAuthorizer({
  async findDogOwnerId(dogId: string): Promise<string | null> {
    const [row] = await db
      .select({ ownerId: dogs.ownerId })
      .from(dogs)
      .where(eq(dogs.id, dogId))
      .limit(1);
    return row?.ownerId ?? null;
  },
});

export async function requireDogOwnership(c: Context, dogId: string): Promise<Response | null> {
  const result = await assertUserOwnsDog(getCurrentUserId(c), dogId);
  if (result.ok) return null;
  return c.json({ error: result.error }, result.status);
}
