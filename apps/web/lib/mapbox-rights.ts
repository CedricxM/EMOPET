/**
 * DATA-LIC-G5 runtime authority boundary for Mapbox.
 *
 * Browser token presence is necessary to initialize Mapbox GL, but it is not
 * product-use authority. Activation requires the exact operator gate GO and a
 * separately reviewed repository authority record.
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
