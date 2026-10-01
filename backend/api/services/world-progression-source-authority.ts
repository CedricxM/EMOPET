import type {
  WorldProgressionEventKind,
  WorldProgressionSourceAuthority,
  WorldProgressionSourceClaim,
} from './world-progression-ledger';

export interface WorldProgressionSourceRoute {
  authorityDomain: 'knowledge' | 'local' | 'community' | 'world' | 'memories';
  sourceRefPrefix: string;
}

export type WorldProgressionSourceVerifier = (
  claim: WorldProgressionSourceClaim,
) => Promise<boolean>;

export const WORLD_PROGRESSION_SOURCE_ROUTES: Readonly<Record<
  WorldProgressionEventKind,
  WorldProgressionSourceRoute
>> = Object.freeze({
  'knowledge.card_read': Object.freeze({
    authorityDomain: 'knowledge',
    sourceRefPrefix: 'knowledge:',
  }),
  'local.place_saved': Object.freeze({
    authorityDomain: 'local',
    sourceRefPrefix: 'place:',
  }),
  'local.route_saved': Object.freeze({
    authorityDomain: 'local',
    sourceRefPrefix: 'route:',
  }),
  'community.contribution_created': Object.freeze({
    authorityDomain: 'community',
    sourceRefPrefix: 'community:',
  }),
  'world.group_joined': Object.freeze({
    authorityDomain: 'world',
    sourceRefPrefix: 'world-group:',
  }),
  'memory.created': Object.freeze({
    authorityDomain: 'memories',
    sourceRefPrefix: 'memory:',
  }),
});

/**
 * G1F source-authority router.
 *
 * This boundary does not prove ownership itself. It routes an already bounded
 * claim to the canonical domain verifier for that event kind and fails closed
 * when no verifier exists.
 *
 * A sourceRef prefix is only a namespace guard, never authorization evidence.
 */
export class RoutedWorldProgressionSourceAuthority implements WorldProgressionSourceAuthority {
  constructor(
    private readonly verifiers: Readonly<
      Partial<Record<WorldProgressionEventKind, WorldProgressionSourceVerifier>>
    >,
  ) {}

  async isAuthorizedSource(claim: WorldProgressionSourceClaim): Promise<boolean> {
    const route = WORLD_PROGRESSION_SOURCE_ROUTES[claim.kind];
    if (!hasCanonicalPrefix(claim.sourceRef, route.sourceRefPrefix)) return false;

    const verifier = this.verifiers[claim.kind];
    if (!verifier) return false;

    // Verifier exceptions intentionally propagate. The ledger translates them
    // to WORLD_PROGRESSION_SOURCE_AUTHORITY_UNAVAILABLE and fails closed.
    return verifier(claim);
  }
}

function hasCanonicalPrefix(sourceRef: string, prefix: string): boolean {
  return sourceRef.startsWith(prefix) && sourceRef.length > prefix.length;
}
