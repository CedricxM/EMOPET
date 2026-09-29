/**
 * Canonical actor revocation (WORLD-SOCIAL-03 / #596, decision #48 L7).
 *
 * Revoking canonical credentials does not reach live realtime sessions by itself:
 * an access JWT stays valid for up to 15 minutes. Canonical revocation points
 * call `revokeActor`, and realtime surfaces (the World adapter) subscribe to close
 * the actor's live handles at once. This module never changes the JWT contract.
 *
 * Wired today: logout and logout_all (`routes/auth.ts`), World pilot access
 * revocation. Account deletion and moderation suspension do not exist yet; they
 * must call `revokeActor` when they are implemented. Surfaces must also re-check
 * canonical eligibility on each request, so a revocation made outside this
 * process still takes effect at the next request.
 */

export type ActorRevocationReason =
  | 'logout'
  | 'logout_all'
  | 'world_access_revoked'
  | 'account_deletion'
  | 'moderation_suspension';

export type ActorRevocationListener = (userId: string, reason: ActorRevocationReason) => void | Promise<void>;

const listeners = new Set<ActorRevocationListener>();

/** Subscribe; returns the unsubscribe function. */
export function onActorRevoked(listener: ActorRevocationListener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/**
 * Notify every surface. A failing listener never undoes or blocks the canonical
 * revocation that already happened; it is logged without any identifier.
 */
export async function revokeActor(userId: string, reason: ActorRevocationReason): Promise<void> {
  const results = await Promise.allSettled([...listeners].map(async (listener) => listener(userId, reason)));
  const failed = results.filter((result) => result.status === 'rejected').length;
  if (failed) console.warn('[actor-revocation] listener failed', { reason, failed });
}
