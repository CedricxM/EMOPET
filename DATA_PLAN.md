# EMOPET Data Intelligence Layer Plan

Scope confirmed after repository inspection:

- Stack: pnpm monorepo, TypeScript, Next.js app in `apps/web`, Node test runner via `node --import tsx --test "lib/**/*.test.ts"`.
- Existing Mapbox integration: `apps/web/components/bretagne-map/CommunityMap.tsx` and `MapboxMap.tsx` already use `mapbox-gl` when `NEXT_PUBLIC_MAPBOX_TOKEN` exists, with SVG fallback. This work will not duplicate or modify that setup.
- Existing data folders: root `data/` contains runtime/demo DB files, `data/reference/fci_breeds.csv`, `data/reference/fci_breeds.zip`, `data/breed_profiles.json`, and VBO/reference outputs.
- Existing Breiz RAG: `apps/web/lib/breiz-rag/*` provides a static lexical retriever. This work will add a data-layer ingestion/RAG-ready structure without replacing the existing UI-facing module.
- FCI source files present: `data/reference/fci_breeds.csv` and `data/breed_profiles.json` are safe local references. The noisy `data/reference/fci_breeds/` download folder contains unrelated/incomplete files and will not be consumed.

Files to create or modify, limited to data-layer boundaries:

Create:

- `apps/web/lib/data/README.md`
- `apps/web/lib/data/index.ts`
- `apps/web/lib/data/territory/territory.schema.ts`
- `apps/web/lib/data/territory/territoryScoring.ts`
- `apps/web/lib/data/territory/mockTerritories.ts`
- `apps/web/lib/data/territory/__tests__/territoryScoring.test.ts`
- `apps/web/lib/data/breiz/breizDocument.schema.ts`
- `apps/web/lib/data/breiz/ingestDocuments.ts`
- `apps/web/lib/data/breiz/chunkDocuments.ts`
- `apps/web/lib/data/breiz/mockDocuments.ts`
- `apps/web/lib/data/breiz/mockVectorStore.ts`
- `apps/web/lib/data/breiz/breizRetriever.ts`
- `apps/web/lib/data/breiz/__tests__/breizRetriever.test.ts`
- `apps/web/lib/data/eli/dogProfile.schema.ts`
- `apps/web/lib/data/eli/matEvent.schema.ts`
- `apps/web/lib/data/eli/tagEvent.schema.ts`
- `apps/web/lib/data/eli/appObservation.schema.ts`
- `apps/web/lib/data/eli/eliLabels.ts`
- `apps/web/lib/data/eli/eliValidation.ts`
- `apps/web/lib/data/eli/mockSensorEvents.ts`
- `apps/web/lib/data/eli/mockEliPipeline.ts`
- `apps/web/lib/data/eli/__tests__/eliValidation.test.ts`
- `apps/web/lib/data/mapbox/mapbox.schema.ts`
- `apps/web/lib/data/mapbox/mockMapEntities.ts`
- `apps/web/lib/data/mapbox/mapboxStyles.ts`
- `apps/web/lib/data/mapbox/mapboxMarkers.ts`
- `apps/web/lib/data/fci/fciBreed.schema.ts`
- `apps/web/lib/data/fci/normalizeFciBreed.ts`
- `apps/web/lib/data/fci/ingestFciBreeds.ts`
- `apps/web/lib/data/fci/mockFciBreeds.ts`
- `apps/web/lib/data/fci/fciBreedSearch.ts`
- `apps/web/lib/data/fci/README.md`
- `apps/web/lib/data/fci/__tests__/fciBreedSearch.test.ts`
- `apps/web/lib/data/use-cases/dogProfileLocalMapFlow.ts`

Modify only if needed:

- `data/README.md` to reference the new data intelligence layer and clarify FCI local source usage.

Explicit exclusions:

- No route, navigation, sidebar, landing page, dashboard UI, World UI, Breiz UI, profile UI, quartier/local UI, shared layout component, or visual identity component changes.
- No dependency installation.
- No web scraping.
- No direct animal emotion labels, medical claims, dog rankings, or public animal state data.
