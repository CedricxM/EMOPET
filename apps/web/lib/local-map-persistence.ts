import type { CommunitySpot } from '../components/bretagne-map/spots';

export type SpotStorageWriteResult =
  | { ok: true }
  | { ok: false; reason: 'existing_payload_unreadable' | 'storage_unavailable' };

/**
 * Append one locally-created spot without ever replacing an unreadable payload.
 *
 * This fallback is used only when the authoritative server write is unavailable.
 * A corrupt/blocked local store is therefore a failed persistence attempt, never
 * permission to present an in-memory-only spot as saved.
 */
export function persistUserSpotFallback(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  key: string,
  spot: CommunitySpot,
): SpotStorageWriteResult {
  let existing: CommunitySpot[] = [];

  try {
    const raw = storage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return { ok: false, reason: 'existing_payload_unreadable' };
      }
      existing = parsed as CommunitySpot[];
    }
  } catch {
    return { ok: false, reason: 'existing_payload_unreadable' };
  }

  if (!spot.id.startsWith('user-')) {
    return { ok: false, reason: 'existing_payload_unreadable' };
  }

  const next = existing.some((item) => item.id === spot.id)
    ? existing.map((item) => (item.id === spot.id ? spot : item))
    : [...existing, spot];

  try {
    storage.setItem(key, JSON.stringify(next));
    return { ok: true };
  } catch {
    return { ok: false, reason: 'storage_unavailable' };
  }
}
