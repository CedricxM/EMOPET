# EMOPET Data Layer UI Integration Report

## Status

The first progressive UI integration pass is implemented. Git status remains unavailable in this workspace because the folder is not exposed as a Git repository, so file scope is reported from the files changed during this session.

## Files changed

- `INTEGRATION_PLAN.md`
- `INTEGRATION_REPORT.md`
- `DATA_REPORT.md`
- `apps/web/app/admin/data/page.tsx`
- `apps/web/app/quartier/LocalSection.tsx`
- `apps/web/app/profil/page.tsx`
- `apps/web/app/breiz/page.tsx`
- `apps/web/components/breed/FciBreedSelect.tsx`
- `apps/web/components/breiz/LocalKnowledgePanel.tsx`
- `apps/web/lib/data/index.ts`
- `apps/web/lib/data/fci/fciToDogProfile.ts`
- `apps/web/lib/data/fci/__tests__/fciBreedSearch.test.ts`
- `apps/web/lib/data/mapbox/mapboxToCommunitySpot.ts`
- `apps/web/lib/data/mapbox/__tests__/mapboxToCommunitySpot.test.ts`
- `apps/web/lib/data/breiz/__tests__/breizRetriever.test.ts`
- `apps/web/lib/data/use-cases/dogProfileLocalMapFlow.ts`

## Routes touched

- `/admin/data`
  - New internal data route for territorial launch scoring.
  - Not added to the public sidebar or owner navigation.
- `/quartier`
  - Existing map surface now receives adapted Mapbox mock entities through the existing `CommunityMap` contract.
- `/profil`
  - Existing profile account surface now includes FCI breed search and neutral technical setup notes.
- `/breiz`
  - Existing Breiz page now includes a local sources panel in the sidebar.

## Components created or updated

- Created `FciBreedSelect`
  - Searches local FCI mock references.
  - Builds optional `DogProfile` metadata.
  - Displays group, origin, size and neutral setup notes.
- Created `LocalKnowledgePanel`
  - Queries the Breiz local mock retriever.
  - Displays retrieved chunks with source metadata.
  - Shows a fallback when the local corpus lacks enough sourced information.
- Updated existing route components only where needed to render these additions.

## Data modules used

- Territorial scoring:
  - `MOCK_SCORED_BRITTANY_TERRITORIES`
  - `DEFAULT_TERRITORY_SCORING_WEIGHTS`
- Mapbox:
  - `MOCK_MAP_PLACES`
  - `MOCK_MAP_ROUTES`
  - `mapPlacesToCommunitySpots`
  - `mergeCommunitySpots`
- FCI:
  - `searchFciBreeds`
  - `findFciBreedById`
  - `createDogProfileFromFciBreed`
- ELI placeholders:
  - `estimateSignalConstraintsFromDogProfile`
- Breiz:
  - `createBreizMockStore`
  - `retrieveBreizLocalKnowledge`

## What remains mock

- Territory metrics for Lorient, Vannes, Brest, Rennes and Quimper.
- Mapbox-ready places, route summaries and territory scoring geometry references.
- FCI breed subset used directly by the new profile component.
- Breiz local documents and lexical mock vector store.
- ELI signal-constraint and validation outputs.

## Production-ready structure

- `/admin/data` consumes the existing scored territory contract without introducing owner-facing logic.
- `/quartier` reuses the existing Mapbox/fallback map and adapts data-layer entities into the current marker model.
- `/profil` keeps breed data as optional profile metadata and setup guidance.
- `/breiz` keeps source retrieval separate from chat generation and separate from ELI.
- The ELI pipeline remains a validation placeholder and is not connected to real inference.

## Real data needed later

- INSEE and public territory datasets for scoring inputs.
- SIRENE or reviewed local directories for canine actors and services.
- Moderated, opt-in production community map contributions.
- Licensed and freshness-checked local cultural documents for Breiz.
- Reviewed FCI source files with license notes and standard URLs.
- EMOPET MAT/TAG/app observation datasets for future ELI validation.

## Replacement path for mock data

- Replace territory mocks in `apps/web/lib/data/territory/mockTerritories.ts` with imported public datasets after licensing and freshness checks.
- Replace `MOCK_MAP_PLACES` and `MOCK_MAP_ROUTES` with backend/API data that preserves `privacy_level` and `user_contributed`.
- Replace `MOCK_FCI_BREEDS` with normalized local FCI ingestion output.
- Replace `MOCK_BREIZ_DOCUMENTS` with reviewed local source files and a real vector store behind the existing retriever abstraction.
- Keep ELI outputs gated by `validateEliInput` until experimental validation supports production use.

## Intentionally not implemented

- No sidebar or route navigation changes.
- No World module changes.
- No dashboard redesign.
- No new Mapbox initialization.
- No new profile system.
- No production vector database.
- No real ELI inference.
- No public owner or private animal data exposure.
- No ranking, comparison or leaderboard between dogs or owners.

## Guardrail confirmation

- No direct dog internal-state labels were introduced.
- No dog happiness score or sadness score was introduced.
- No breed-based behavioural inference was introduced.
- No public map feature exposes private dog profile data.
- Mapbox, FCI, Breiz and ELI responsibilities remain separate.
- ELI remains mock and confidence-gated, returning insufficient-data states when signal quality is too low.
