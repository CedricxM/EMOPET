/**
 * Explicit coarse-region selector for controlled World reads.
 *
 * This module is intentionally stateless. It accepts only an explicit region
 * code supplied by a future Owner-facing selector and never derives region
 * from coordinates, browser geolocation, passive movement or persisted
 * browser state.
 *
 * The supported codes mirror config/world/world-regional-collections-v1.json.
 * Tests bind this list to the canonical catalogue so new regions cannot drift
 * silently between backend and web.
 */
export const WORLD_COARSE_REGION_CODES = ['GLOBAL', 'FR-BRE'] as const;

export type WorldCoarseRegionCode = (typeof WORLD_COARSE_REGION_CODES)[number];

const KNOWN_REGION_CODES = new Set<string>(WORLD_COARSE_REGION_CODES);

/**
 * Resolve an explicit Owner-selected regional code.
 *
 * Unknown, malformed or non-string values fail closed to GLOBAL, matching the
 * canonical World regional catalogue fallback. This function performs no I/O.
 */
export function resolveExplicitWorldCoarseRegion(value: unknown): WorldCoarseRegionCode {
  if (typeof value !== 'string') return 'GLOBAL';

  const normalized = value.trim().toUpperCase();
  if (!normalized) return 'GLOBAL';
  if (normalized !== 'GLOBAL' && !/^[A-Z]{2}-[A-Z0-9]{1,3}$/.test(normalized)) {
    return 'GLOBAL';
  }

  return KNOWN_REGION_CODES.has(normalized)
    ? normalized as WorldCoarseRegionCode
    : 'GLOBAL';
}
