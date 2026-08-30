# EMOPET Data Act Connected-Product Access

Status: `P0 IMPLEMENTED FOR CURRENT BACKEND DATA / RAW STREAM INGESTION OPEN`

## Implemented

Authenticated users can request owner-scoped machine-readable exports at:

`GET /api/data-export?dog_id=<uuid>&format=json|csv&from=<iso>&to=<iso>`

The export separates:

- device/firmware metadata;
- preprocessed MAT/TAG sensor summaries;
- baselines;
- inferred ELI states;
- provenance and units.

The previous web export that generated fictitious measurements has been removed. The UI now fails closed when no backend session/dog context is available.

## Raw data boundary

The current backend schema does not persist high-rate raw MAT/TAG streams. The API therefore returns an explicit `rawDataStatus` instead of fabricating raw records.

When firmware/ingestion authority is established, raw product data that is actually collected and made readily available must be represented separately from preprocessed and inferred data, with:

- UTC timestamp;
- device id/type;
- firmware version;
- channel/signal name;
- unit;
- sample rate/window;
- quality flags;
- preprocessing state;
- provenance/checksum where appropriate.

## Third-party access

Direct delegated third-party API access is `GATED_AUTH_BASELINE_REQUIRED`. The current P0 mechanism gives the user a structured JSON/CSV package they can transmit to a third party without EMOPET fabricating an unaudited delegation/auth model.

A later direct-sharing slice must define revocable, scoped, expiring grants and must not expose more data than the user selected/authorised.

## Data categories

Do not collapse measured/preprocessed/inferred data into one field. In particular, ELI outputs remain derived and non-diagnostic.

## Privacy

The export is owner-scoped server-side. MAC addresses are excluded by default because they are not necessary for normal portability. Exact location and other sensitive data must only be included if actually present, legally in scope and requested.
