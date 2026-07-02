# RAPPORT — Refonte architecture (14→6) + World animé

> Chantier exécuté sur `apps/web` (Next.js 15 + TS). Toutes les phases se terminent
> sur un état propre : `pnpm typecheck` + `pnpm lint` + `pnpm test` + `pnpm build` verts,
> `pnpm vocab` (audit vocabulaire) propre.

## Résultat global

- **Architecture** : 6 entrées de sidebar (`/dashboard /journal /quartier /world /breiz /profil`).
  Hors-nav : `/` (landing), `/contact`, `/admin` (interne), `/rapport` (technique/impression),
  `/mobile-preview` (démo interne). 22 routes au build.
- **World vivant** : décor animé (cycle jour/nuit, mer/écume, herbes, oiseaux, lanternes),
  placement animé, économie unifiée et testée, accessibilité clavier, `prefers-reduced-motion`.
- **Tests** : 80 (node:test). **Build** : OK. **Vocabulaire interdit** : 0.

## Ce qui a été fait, par phase

### Phase 1 — Fusions d'architecture
| Avant | Après | Mécanisme |
|---|---|---|
| `/local` + `/communaute` | **`/quartier`** (onglets Carte & lieux / Communauté) | sections `LocalSection` + `CommunitySection` extraites des anciennes pages |
| `/bien-etre` | **`/dashboard`** | `BienEtreSection` + bouton « Comprendre les indicateurs » (dépliable) |
| `/rapport` | action **dashboard** | bouton « Exporter la synthèse 14 j » (`window.print`) ; route conservée hors-nav |
| `/donnees` | **`/profil`** (« Mes données ») | `DonneesSection` |
| progression `/profil` | **World** | onglets Badges/Progression retirés ; passerelle vers `/world` ; profil = Compte + Apprentissage + Mes données |
| `/contact/mes-demandes` | **`/contact`** | `RequestHistory` sous le formulaire |
| `/mobile-preview` | hors-nav | retiré de la sidebar, route conservée |

Redirects Next (`next.config.mjs`) sur toutes les anciennes URL (308) — vérifiés en exécution.

### Phase 2 — World animé
- `components/world/LivingWorldScene.tsx` + `living-world.module.css` : décor SVG/CSS
  lazy-loadé (`next/dynamic`, `ssr:false`), posé derrière la grille. Cycle jour/nuit selon
  l'heure réelle, mer + écume, herbes qui ondulent, oiseaux qui dérivent, lanternes le soir.
- Placement : `.placing` (scale-in) + `.sparkle` (étincelle teal) sur la cellule construite.
- Économie : `lib/mock-world.ts` (déjà présente) — fonctions pures testées dans
  `lib/__tests__/mock-world.test.ts` (gains/coûts/affordabilité + invariant « pas d'émotion »).
- `prefers-reduced-motion` : toutes les animations désactivées, version statique.

### Phase 3 — Enrichissements
- **Breiz global** : `components/breiz/BreizDock.tsx` (bouton flottant + panneau) monté dans
  `AppFrame` sur les pages applicatives, **jamais la landing**. Logique partagée via
  `lib/breiz-rag/useBreizChat.ts` (mêmes garde-fous que la page `/breiz`, qui l'utilise aussi).
- **Signature « confiance » dashboard** : bannière d'état vide assumé (« Fenêtre de capture
  insuffisante — aucune donnée affichée ») + lien vers « Comprendre les indicateurs ».
- **`/quartier` opt-in** : bannière d'activité de proximité, **désactivée par défaut**,
  affichée seulement après opt-in explicite (RGPD).

### Phase 4 — QA
- `tsc` strict, `eslint` 0 warning, 80 tests, build 22 routes : verts.
- Routes 200 : dashboard, journal, quartier, world, breiz, profil, contact. Redirects 308 OK.
- A11y World : grille `role="grid"` + 35 `role="gridcell"` `tabIndex=0` `aria-label`, focus visible.
- `scripts/vocab-audit.mjs` (recréé — absent du repo) : 0 violation. Exposé via `pnpm vocab`.

## Arbitrages pris face au code réel

1. **World déjà existant** : `/world` + `WorldBuilder` + économie complète étaient déjà en place
   (le brief supposait tout à construire). → j'ai **animé/enrichi**, pas reconstruit. Pas de
   PixiJS/Three (seul `animejs` présent, et CSS/SVG suffisent) → rendu CSS/SVG, évolutif.
2. **Progression conservée** : `lib/gamification.ts` n'est pas supprimé (compteurs dérivés
   serveur utiles) mais retiré de la navigation ; le World est la progression visible.
   L'apprentissage (valeur pédagogique) reste accessible dans `/profil`.
3. **Palette `--emopet-*`** déjà consolidée dans `tokens.css` (les échelles granit/terracotta/
   lichen en dérivent) — conforme au brief, rien réinventé.
4. **PLAN.md / RAPPORT.md** placés dans `apps/web/` (racine réelle de l'app web).

## Reste à faire / brancher le backend réel

- **Événements World → backend** : `lib/mock-world.ts` expose `MOCK_WORLD_EVENTS` (typés :
  `reliable_rest_window_completed`, `walk_added`, `calm_place_discovered`,
  `community_place_contributed`, `signal_quality_high`, `educational_tip_read`,
  `mat_setup_completed`). Pour brancher le vrai backend : remplacer `computeResourceBalance()`
  (qui somme les mocks) par un flux d'événements réels du backend, en gardant l'API pure
  (`addResources` / `canAfford` / `spendResources`) inchangée. La couche rendu (`WorldBuilder`,
  `LivingWorldScene`) n'a pas à changer.
- **Persistance World** : les `builtIds`/ressources sont en state local ; à persister via le
  store serveur existant (`lib/server/store.ts`, patron `collection<T>`) quand souhaité.
- **i18n** : sidebar + plusieurs pages migrées (FR/EN) ; finir la migration des libellés
  profonds restants (corps de `/world`, `/quartier`, etc.).
- **Anthropic / Resend / Mapbox / Plausible** : activés par variables d'env (déjà câblés,
  voir `.env.local`). Postgres : swap du store JSON quand `DATABASE_URL` disponible.

## Commandes de vérification

```
pnpm --filter @emopet/web typecheck
pnpm --filter @emopet/web lint
pnpm --filter @emopet/web test
pnpm --filter @emopet/web build
pnpm --filter @emopet/web vocab
```
