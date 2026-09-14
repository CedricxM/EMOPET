/**
 * DATA-LIC-G5 runtime authority boundary for Mapbox.
 *
 * A browser-visible Mapbox token is necessary to initialize Mapbox GL, but token
 * presence and a deployment flag are not product-use authority. Runtime
 * activation requires BOTH the exact operator gate value `GO` and a separately
 * reviewed repository authority record.
 *
 * Because this value is exposed through a NEXT_PUBLIC_* variable, fail closed on
 * anything that does not look like a Mapbox public token. In particular, a
 * secret `sk.*` token (or an arbitrary non-public value) must never be accepted
 * by the browser runtime boundary.
 */
import {
  isMapboxProductionUseAuthorized,
  MAPBOX_PRODUCTION_AUTHORITY,
  type MapboxReleaseAuthority,
} from './mapbox-service-authority';

export function normalizeMapboxPublicToken(token: string | undefined): string | null {
  const normalizedToken = token?.trim();
  if (!normalizedToken || !normalizedToken.startsWith('pk.')) return null;
  return normalizedToken;
}

export function getControlledMapboxToken(
  token: string | undefined = process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
  rightsGate: string | undefined = process.env.NEXT_PUBLIC_EMOPET_MAPBOX_RIGHTS_GATE,
  authority: MapboxReleaseAuthority = MAPBOX_PRODUCTION_AUTHORITY,
): string | null {
  if (rightsGate !== 'GO') return null;
  if (!isMapboxProductionUseAuthorized(authority)) return null;
  return normalizeMapboxPublicToken(token);
}
