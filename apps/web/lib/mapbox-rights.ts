/**
 * DATA-LIC-G5 runtime authority boundary for Mapbox.
 *
 * A browser-visible Mapbox token is necessary to initialize Mapbox GL, but token
 * presence alone is not product-use authority. Runtime activation requires the
 * exact reviewed operator gate value `GO` as a separate condition.
 *
 * Because this value is exposed through a NEXT_PUBLIC_* variable, fail closed on
 * anything that does not look like a Mapbox public token. In particular, a
 * secret `sk.*` token (or an arbitrary non-public value) must never be accepted
 * by the browser runtime boundary.
 *
 * This helper is deliberately narrow: it does not establish account ownership,
 * billing authority, accepted terms, token custody/rotation, privacy review or
 * release authorization. Those controls remain under #116.
 */
export function getControlledMapboxToken(
  token: string | undefined = process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
  rightsGate: string | undefined = process.env.NEXT_PUBLIC_EMOPET_MAPBOX_RIGHTS_GATE,
): string | null {
  const normalizedToken = token?.trim();
  if (!normalizedToken || rightsGate !== 'GO') return null;
  if (!normalizedToken.startsWith('pk.')) return null;
  return normalizedToken;
}
