# Couche API & Context Intelligence EMOPET

> Infrastructure modulaire pour enrichir EMOPET avec du **contexte externe**
> (météo, qualité de l'air, territoire, calendrier, connaissance chien…), de façon
> **prudente, auditable et NON médicale**. Une API externe est un **signal**, jamais
> une vérité. Aucune API externe ne pilote une conclusion EMOPET.

## Où ça vit (intégration, pas de système parallèle)

La spec d'origine proposait `/src/api` et `/src/context-engine`. Le dépôt n'a pas de
`/src` : tout le code applicatif est sous `apps/web/`. On **mappe** donc :

| Cible spec | Emplacement réel | Raison |
|---|---|---|
| `/src/api/*` | `apps/web/lib/api/*` | sibling de `lib/server`, `lib/data`, `lib/regional` |
| `/src/context-engine/*` | `apps/web/lib/context-engine/*` | idem, couche au-dessus des adapters |
| `/docs/api-layer/*` | `docs/api-layer/*` | le dépôt a déjà une arbo `docs/` riche |
| `.env.example` | `apps/web/.env.example` (étendu) | variables existantes conservées |

**Réutilisations (zéro duplication) :**
- `lib/weather.ts` (Open-Meteo, déjà intégré) → enveloppé par l'adaptateur `open-meteo`.
- `lib/server/rate-limit.ts` (`createFixedWindowRateLimiter`) → réutilisé par `lib/api/rateLimit.ts`.
- `lib/server/store.ts` (persistance JSON) → modèle pour un cache durable futur.
- `lib/data/territory/*` (territoire/INSEE open data) et `lib/osm-spots.ts` → sources de
  contexte déjà présentes que les adapters open-data/transport viendront compléter.
- Tests `node:test` co-localisés dans `__tests__/`. Style de schéma = **interfaces TS +
  `validateX(): string[]`** (pas de Zod), conforme à `lib/data/*.schema.ts`.

La couche est **framework-agnostique** (aucune dépendance React/Next) : promouvable vers
`packages/` si le backend NestJS doit la partager.

## Architecture

```
lib/api/
  types.ts            ContextSignal, ArbitratedSignal, ProviderDescriptor, enums
  errors.ts           erreurs typées (timeout, auth, rate-limit, privacy…)
  config.ts           feature flags + activation (flag + env)
  fetchWithTimeout.ts seul point d'appel réseau bas niveau
  cache.ts            cache TTL par catégorie (sensibles = non cachables)
  rateLimit.ts        réutilise le limiteur serveur + backoff/retry
  providerHealth.ts   échecs consécutifs → désactivation temporaire
  providerRegistry.ts MATRICE typée de tous les providers (12 catégories)
  adapters/           1 fichier par provider (fetch + normalize + health + mock)
lib/context-engine/
  contextAggregator.ts          compose les contextes en EMOPETContext
  arbitration/contextArbitrator.ts   consensus pondéré / conflits / outliers
  arbitration/evidenceResolver.ts    normalisation unités/temps/précision
  scoring/                      poids de confiance par catégorie
  policies/nonMedicalPolicy.ts  garde-fou non médical
```

## Flux

1. L'aggregator demande un contexte (ex. météo à `lat/lon`).
2. Le registre fournit les providers `active` (flag ON + env présentes) + `fallback`.
3. Chaque adaptateur : `fetchWithTimeout` → `normalize()` → `ContextSignal` (jamais le
   payload brut). Cache selon la catégorie. Retry/backoff sur erreurs réessayables.
   Santé mise à jour ; provider en cooldown → repli.
4. L'arbitre fusionne les `ContextSignal` → `ArbitratedSignal` (consensus pondéré pour
   le numérique sûr ; **incertitude** si conflit fort ; provenance conservée).
5. La politique non médicale tamponne la sortie ; aucune conclusion sur l'animal.

## Statuts

- **Provider** : `active` | `fallback` | `experimental` | `disabled` | `scaffold`.
- **Recommandé (matrice)** : `active_now` | `fallback` | `premium_candidate` |
  `experimental` | `scaffold_now` | `disabled_by_default` | `rejected`.
- **Signal arbitré** : `confirmed` | `consensus` | `fallback_used` | `stale` |
  `conflicting_sources` | `insufficient_data` | `provider_error` | `outlier_removed` |
  `not_available`.

## Feature flags

Chaque provider est piloté par `API_<NOM>_ENABLED` (OFF par défaut). Voir `.env.example`.
Activation réelle = flag ON **et** (si auth) variables d'env présentes (`resolveActivation`).

## Ajouter un provider

1. Ajouter un `ProviderDescriptor` dans `providerRegistry.ts` (risques, valeur, flag,
   `fallbackProvider`, statut). Le test d'intégrité du registre valide nom/flag uniques.
2. Créer `lib/api/adapters/<provider>.ts` exposant `descriptor`, des `fetch*`, un
   `normalize` (→ `ContextSignal`), `healthCheck`, `mockResponse`.
3. Ajouter le flag (+ éventuelles clés) à `.env.example`.
4. Câbler dans l'aggregator/arbitre si pertinent (poids de confiance par catégorie).
5. Tests mockés co-localisés. Documenter dans `API_PROVIDER_MATRIX.md`.

## Tester / mocker

- `pnpm test` (node:test). Aucun appel réseau dans les tests : on utilise `mockResponse()`
  des adapters et des réponses injectées. Tests de conflit météo/air = arbitrage.
- Barre verte projet : `pnpm verify` (typecheck + lint + test + vocab + build).

## Docs liées

- `API_PROVIDER_MATRIX.md` — matrice complète des providers.
- `CONFLICT_RESOLUTION.md` — normalisation, poids, consensus, outliers, incertitude.
- `EMOPET_CONTEXT_POLICY.md` — contexte autorisé/interdit, règles de formulation.
- `PRIVACY_AND_API_KEYS.md` — clés, minimisation, géoloc IP, k-anonymité.

## État d'avancement

- ✅ **Incrément 1 (fondation)** : types, erreurs, config/flags, fetch, cache, rate-limit,
  santé, **registre/matrice (12 catégories, 79 providers)**, politique non médicale, tests, `.env.example`, docs.
- ✅ **Incrément 2 (adapters cœur, 9)** : Open-Meteo (enveloppe `lib/weather.ts`), OpenAQ,
  BAN, geo.api.gouv, Nager.Date, dog.ceo, LibreTranslate, Disify (+ repli EVA), PurgoMalum —
  chacun `normalize* → ContextSignal` + `fetch*` + `healthCheck` + `mockResponse`, testés.
- ✅ **Incrément 3 (arbitrage)** : `evidenceResolver` (pondération trust × fraîcheur),
  `contextArbitrator` (consensus pondéré + retrait d'outliers + conflit→incertitude),
  `scoring/providerTrust`, `contextAggregator` ; **2 tests de conflit** verts.
- ✅ **Incrément 4** : `API_PROVIDER_MATRIX.md` (généré du registre via
  `scripts/gen-provider-matrix.ts`), `CONFLICT_RESOLUTION.md`, fabrique `createScaffoldAdapter`.
- ✅ **Incrément 5 (orchestration live)** : `buildContext({lat,lon,date,country})` appelle les
  `activeProviders` par catégorie via `runProvider`/`resilientFetch` (cache · santé · retry ·
  repli) puis arbitre ; route `GET /api/context` (rate-limit + timeout) ; tests résolveurs
  injectés + résilience.
- ✅ **Incrément 6 (repli + 2ᵉ source météo)** : adaptateur **met.no** (repli météo,
  User-Agent obligatoire) ; logique de repli dans l'orchestrateur (`resolveWithFallback`)
  + statut `fallback_used` ; **vérifié en live** (open-meteo OFF → météo servie par met.no).
- ⏳ Suite : implémentation progressive des scaffolds, persistance du cache
  (`lib/server/store.ts`), promotion d'une 2ᵉ source ACTIVE pour le consensus multi-sources en live.
