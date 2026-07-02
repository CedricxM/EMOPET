# EMOPET Data Layer Validation Report

## Implemented

- Territorial scoring module with typed territory records, configurable scoring weights, Brittany pilot mock territories and ranking helpers.
- Breiz local knowledge module with ingestion-ready document schema, local JSON/CSV/Markdown ingestion, chunking, metadata-preserving vector-store export, mock lexical store and sourced retrieval response shape.
- Mapbox data module with typed map places, routes, territory scores, EMOPET map colors, marker descriptors and mock Brittany map entities.
- FCI module with normalized breed schema, local CSV ingestion, local profile-record ingestion, nullable missing fields, search helpers and mock FCI records.
- Future ELI data module with MAT, TAG, app observation and dog profile schemas, neutral observable situation labels, signal-quality validation, technical profile constraints and mock pipeline outputs.
- Combined pure data flow for breed selection, dog profile creation, technical signal notes and local map marker retrieval.

## Mock Data

- `territory/mockTerritories.ts`: synthetic Brittany pilot territory metrics for Lorient, Vannes, Brest, Rennes and Quimper.
- `breiz/mockDocuments.ts`: curated local knowledge examples for product development.
- `mapbox/mockMapEntities.ts`: Mapbox-ready places, routes and territory scores for Brittany pilots.
- `fci/mockFciBreeds.ts`: small FCI-compatible subset for tests and onboarding examples.
- `eli/mockSensorEvents.ts`: synthetic MAT/TAG/app events for validation tests.

Mock data is isolated from production-ready schemas and functions.

## Production-Ready Structure

- TypeScript interfaces and validators define the expected contracts for future data ingestion.
- Scoring weights are centralized and configurable.
- Breiz document chunks preserve source, license, territory, freshness and allowed-use metadata.
- Mapbox entities include privacy level and opt-in fields before any UI rendering.
- FCI normalization keeps missing fields nullable instead of guessing.
- ELI validation refuses weak signal inputs and returns an insufficient-data status instead of producing unsupported certainty.

## Real Datasets Needed Later

- INSEE / data.gouv.fr territory metrics: population, density, income, housing, tourism and mobility.
- SIRENE / local directories: veterinarians, trainers, groomers, shelters, clubs and pet services.
- Licensed local knowledge sources: BCD Bretagne Culture Diversite, Bretania, POP, tourism offices and municipal rules.
- Reviewed FCI source package with license notes and standard URLs where available.
- EMOPET MAT/TAG recordings and app observation events collected under the project privacy policy.
- Moderated community map contributions with explicit opt-in.

## Future UI Connection Rules

- UI pages should consume the data layer through the module exports in `apps/web/lib/data/index.ts`.
- Breiz should use only the Breiz retrieval module for local/cultural context and must keep source metadata available.
- ELI screens should use only ELI validation and sensor-data contracts for observation windows and signal confidence.
- FCI should support onboarding, breed taxonomy, cohort grouping and sensor-quality interpretation only.
- Mapbox UI should consume Mapbox schemas and marker descriptors, keeping privacy and opt-in filters before rendering.
- These layers must not be merged into one inference shortcut: public territory, location and breed data are not proxies for a dog's internal state.

## Progressive UI Integration

- Territorial scoring is prepared for internal display only through an admin data route.
- Mapbox mock entities are adapted into the existing community map contract instead of creating a second map setup.
- FCI data is connected to the existing profile surface as onboarding and technical setup metadata.
- Breiz local knowledge is exposed as sourced retrieval context, separate from ELI and FCI.
- ELI remains a mock validation pipeline and should only expose insufficient-data or confidence-gated demonstration states until real EMOPET sensor validation exists.

## Guardrails

- No direct dog internal-state labels were added.
- No dog-state scoring mechanic was added.
- No public map field exposes private animal data.
- All community map entries remain privacy-level aware and opt-in capable.
- Future ELI outputs are marked mock / not validated until real EMOPET data supports validation.
