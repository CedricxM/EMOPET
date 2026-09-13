/**
 * DATA-LIC-G5 runtime authority boundary for Mapbox.
 *
 * A public token is necessary to initialize Mapbox GL, but token presence alone
 * is not product-use authority. Runtime activation requires the exact reviewed
 * operator gate value `GO` as a separate condition.
 *
 * This helper is deliberately narrow: it does not establish account ownership,
 * billing authority, accepted terms, token custody, privacy review or release
 * authorization. Those controls remain under #116.
 */
export function getControlledMapboxToken(
  token: string | undefined = process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
  rightsGate: string | undefined = process.env.NEXT_PUBLIC_EMOPET_MAPBOX_RIGHTS_GATE,
): string | null {
  const normalizedToken = token?.trim();
  if (!normalizedToken || rightsGate !== 'GO') return null;
  return normalizedToken;
}
