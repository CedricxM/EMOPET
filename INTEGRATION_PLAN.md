# EMOPET Data Layer UI Integration Plan

## Current gate status

Git status cannot be verified in this environment because the workspace is not exposed as a Git repository (`git status` reports that no `.git` directory is available). The user explicitly approved continuing after this limitation was reported.

This plan is the only file created in the current step. No app UI, routes, navigation, sidebar, World module, Breiz page, dashboard, profile page, quartier page or shared visual components are modified before the user reviews this plan.

## Existing architecture observed

- Web app: `apps/web`, Next.js app router, React 19, local UI primitives.
- Existing public app routes include:
  - `apps/web/app/page.tsx`
  - `apps/web/app/dashboard/page.tsx`
  - `apps/web/app/breiz/page.tsx`
  - `apps/web/app/journal/page.tsx`
  - `apps/web/app/quartier/page.tsx`
  - `apps/web/app/rapport/page.tsx`
  - `apps/web/app/profil/page.tsx`
  - `apps/web/app/world/page.tsx`
  - `apps/web/app/mobile-preview/page.tsx`
- Existing internal route:
  - `apps/web/app/admin/page.tsx`
- Existing Mapbox integration:
  - `apps/web/components/bretagne-map/CommunityMap.tsx`
  - `apps/web/components/bretagne-map/MapboxMap.tsx`
  - `apps/web/components/bretagne-map/Map.tsx`
  - `apps/web/components/bretagne-map/spots.ts`
  - `apps/web/app/quartier/LocalSection.tsx`
- Existing profile / breed surfaces:
  - `apps/web/app/profil/page.tsx`
  - `apps/web/components/breed/BreedStoryCard.tsx`
  - `apps/web/app/api/breeds/route.ts`
  - `apps/web/lib/breeds.ts`
  - `apps/web/lib/server/breeds.ts`
- Existing Breiz surfaces:
  - `apps/web/app/breiz/page.tsx`
  - `apps/web/lib/breiz-rag/useBreizChat.ts`
  - `apps/web/lib/breiz-rag/index.ts`
  - `apps/web/lib/breiz-rag/retrieve.ts`
- Existing data layer:
  - `apps/web/lib/data/territory/*`
  - `apps/web/lib/data/mapbox/*`
  - `apps/web/lib/data/fci/*`
  - `apps/web/lib/data/breiz/*`
  - `apps/web/lib/data/eli/*`
  - `apps/web/lib/data/use-cases/dogProfileLocalMapFlow.ts`

## Integration principles

1. Keep UI changes incremental and route-scoped.
2. Reuse existing UI primitives from `apps/web/components/ui`.
3. Reuse the existing Mapbox wrapper and fallback SVG map.
4. Do not add a second profile system.
5. Keep mock data visibly separated from production-ready schemas.
6. Keep Mapbox, FCI, Breiz and ELI responsibilities separate.
7. Keep ELI in mock validation mode only.
8. Use only cautious, non-medical wording:
   - observation quality
   - signal confidence
   - reliable observation window
   - routine stability
   - rest consistency
   - behavioural context
   - local contribution
   - community map
   - non-medical indicators
   - interpretation prudente
   - donnees insuffisantes
9. Do not assign direct animal internal-state labels.
10. Do not expose private owner or animal data on public map features.

## Phase 1: Baseline validation and reporting

Commands to run before UI integration:

- `pnpm.cmd --filter @emopet/web typecheck`
- `pnpm.cmd --filter @emopet/web lint`
- `pnpm.cmd --filter @emopet/web test`
- `pnpm.cmd --filter @emopet/web build`

Planned file changes:

- `DATA_REPORT.md`
  - Update only if it is missing current integration guidance or mock/production separation notes.
  - Do not rewrite data-layer documentation unless needed.

Why:

- Establish the baseline before adding any UI connection.
- Avoid chasing unrelated app failures as if they came from the integration.

## Phase 2: Internal territorial scoring page

Preferred new route:

- `apps/web/app/admin/data/page.tsx`

Data imports:

- `MOCK_SCORED_BRITTANY_TERRITORIES`
- `DEFAULT_TERRITORY_SCORING_WEIGHTS`
- territory scoring types from `apps/web/lib/data/territory/*`

UI behavior:

- Show Lorient, Vannes, Brest, Rennes and Quimper.
- Show launch score and rank.
- Show score dimensions:
  - population / density potential
  - canine ecosystem density
  - purchasing power / median income
  - housing / lifestyle compatibility
  - tourism / mobility
  - community potential
  - heritage / local identity
- Include a clear note that this is a strategic launch scoring layer and not an animal wellbeing model.

Files intentionally not touched:

- `apps/web/components/sidebar.tsx`
- public route navigation
- dashboard
- quartier
- Breiz page
- profile page
- World page

Why:

- The scoring is business/internal context only and should not appear in the public owner sidebar.

## Phase 3: Mapbox mock data adapter for quartier

Planned files:

- `apps/web/lib/data/mapbox/mapboxToCommunitySpot.ts`  
  Create a pure adapter from `MapPlace` to existing `CommunitySpot` where possible.
- `apps/web/app/quartier/LocalSection.tsx`  
  Minimal change: feed existing `CommunityMap` with data-layer mock places after adapting them to the current spot type.
- Optional test file if adapter is added:
  - `apps/web/lib/data/mapbox/__tests__/mapboxToCommunitySpot.test.ts`

Data imports:

- `MOCK_MAP_PLACES`
- `MOCK_MAP_ROUTES`
- marker/category helpers if needed from `apps/web/lib/data/mapbox/*`

UI behavior:

- Preserve the existing Mapbox setup.
- Preserve fallback SVG behavior.
- Add or prepare layer filters for:
  - dog-friendly places
  - calm walking spots
  - local routes
  - veterinarians
  - dog trainers
  - groomers
  - shelters
  - dog clubs
  - local community contributions
- Public map cards should show only:
  - name
  - category/type
  - commune
  - verification status
  - source name when available
  - privacy note for user-contributed entries

Why:

- The map already works. The correct integration is to adapt data-layer entities into the existing map model, not duplicate initialization or token handling.

## Phase 4: FCI breed search inside existing profile flow

Planned files:

- `apps/web/components/breed/FciBreedSelect.tsx`  
  New focused client component for local breed search/select.
- `apps/web/app/profil/page.tsx`  
  Small extension of the current account section to render the selector and neutral setup guidance.
- Optional utility if needed:
  - `apps/web/lib/data/fci/fciToDogProfile.ts`

Data imports:

- `searchFciBreeds`
- `findFciBreedById`
- `estimateSignalConstraintsFromDogProfile`
- `DogProfile`

Fields to support in the UI model:

- `breed_id_optional`
- `breed_name_optional`
- `fci_group_optional`
- `age_optional`
- `sex_optional`
- `weight_kg_optional`
- `size_category_optional`
- `coat_type_optional`
- `coat_length_optional`
- `morphology_notes_optional`
- `owner_provided_notes_optional`

UI behavior:

- Search and select a breed.
- Show FCI group and origin when available.
- Keep missing metadata nullable.
- Show neutral setup notes only:
  - possible fur-related signal damping
  - MAT variant check for very small or very large size
  - positioning validation when morphology notes exist
  - no known setup constraint

Why:

- This extends the existing profile page instead of creating a parallel onboarding flow.

## Phase 5: Breiz local knowledge retrieval panel

Preferred minimal route-scoped change:

- `apps/web/app/breiz/page.tsx`

Possible supporting component:

- `apps/web/components/breiz/LocalKnowledgePanel.tsx`

Data imports:

- `retrieveBreizLocalKnowledge`
- `createBreizMockStore`
- local mock Breiz documents

UI behavior:

- Add a compact "sources locales" panel without replacing the chat UI.
- Let a user query local documents.
- Show top retrieved chunks with:
  - source name
  - source URL when available
  - territory
  - theme
- Fallback copy:
  - `Je n'ai pas encore assez d'informations sourcees sur ce point.`

Why:

- The existing `/breiz` chat already has a RAG path. A source panel makes the new data layer visible while keeping the current conversation architecture intact.

## Phase 6: ELI mock validation remains data-only

Planned files:

- No dashboard UI changes by default.
- Only add tests or documentation if needed.

Possible future display, only if a relevant existing dashboard state requires it:

- `Fenetre de capture insuffisante - aucune donnee affichee.`
- `Signal trop faible pour produire une estimation fiable.`
- `Donnees de demonstration - non validees experimentalement.`

Why:

- The current step is integration, not an animal wellbeing model. ELI must remain a validation and confidence placeholder.

## Phase 7: Tests and QA

Tests to add or improve only where needed:

- territorial scoring and ranking
- Mapbox mock privacy and opt-in rules
- Mapbox adapter from `MapPlace` to current map marker model
- FCI search and DogProfile metadata mapping
- `estimateSignalConstraintsFromDogProfile`
- Breiz retrieval fallback
- ELI low-signal `insufficient_data` behavior

Commands to run after implementation:

- `pnpm.cmd --filter @emopet/web typecheck`
- `pnpm.cmd --filter @emopet/web lint`
- `pnpm.cmd --filter @emopet/web test`
- `pnpm.cmd --filter @emopet/web build`
- `pnpm.cmd --filter @emopet/web vocab`

## Phase 8: Final integration report

Planned new file:

- `INTEGRATION_REPORT.md`

Report content:

- files changed
- routes touched
- components created or updated
- data modules used
- what remains mock
- what needs real data later
- how to replace mock data with production data
- what was intentionally not implemented
- confirmation that no direct animal internal-state labels were introduced
- confirmation that no public map feature exposes private animal or owner data
- confirmation that Mapbox, FCI, Breiz and ELI responsibilities remain separate

## Non-goals for this pass

- No sidebar or navigation redesign.
- No landing page work.
- No World module work.
- No dashboard redesign.
- No second Mapbox setup.
- No second profile system.
- No production vector database.
- No real ELI model output.
- No public animal or owner data exposure.
- No ranking or comparison between animals or owners.

## Expected first implementation order after approval

1. Run baseline validation commands.
2. Update `DATA_REPORT.md` only if needed.
3. Add `/admin/data` for territorial scoring.
4. Add data adapter tests.
5. Integrate Mapbox mock data into `/quartier` through the existing map wrapper.
6. Add FCI breed selector to the existing profile page.
7. Add Breiz local sources panel.
8. Run full validation and create `INTEGRATION_REPORT.md`.
