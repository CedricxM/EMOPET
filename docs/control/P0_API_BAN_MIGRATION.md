# P0 API BAN Migration

Status: `IMPLEMENTED_RUNTIME / REGISTRY_RECONCILIATION_OPEN`

## Reason

The legacy `api-adresse.data.gouv.fr` endpoint was deprecated and scheduled for decommissioning in January 2026. EMOPET runtime geocoding is migrated to the official IGN Géoplateforme endpoint:

`https://data.geopf.fr/geocodage`

## Runtime change

`apps/web/lib/api/adapters/adresseDataGouv.ts` now builds direct and reverse geocoding requests only against Géoplateforme.

The internal provider id `adresse-data-gouv` is temporarily retained for consumer compatibility. This is an identifier compatibility choice, not a statement that the legacy service remains active.

## Follow-up

The generated provider registry/matrix still contains the historical provider label/base URL on `main`. A later provider-registry reconciliation must rename the provider to a Géoplateforme-specific identifier and regenerate the matrix without breaking callers.

Until that reconciliation lands, runtime endpoint authority is the adapter constant `GEOPLATEFORME_GEOCODING_BASE`.

## Guardrails

- voluntary address/location input only;
- no IP geolocation fallback;
- no user/dog identifiers sent to the geocoder;
- request only the fields required for geocoding;
- preserve `geo.api.gouv.fr` for administrative boundaries, not as an address geocoder substitute.
