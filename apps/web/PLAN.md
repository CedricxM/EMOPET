# PLAN — Refonte architecture (14→6 routes) + World animé

> Phase 0 (audit) terminée. **Point de validation humaine — lire avant Phase 1.**
> Racine de travail : `apps/web` (monorepo pnpm ; le reste = backend/firmware/packages, non touchés).

## Constat d'audit (état réel du code)

**15 routes-pages** existent : `/` (landing), `/dashboard`, `/bien-etre`, `/breiz`, `/communaute`, `/contact`, `/contact/mes-demandes`, `/donnees`, `/journal`, `/local`, `/mobile-preview`, `/profil`, `/rapport`, `/world`, `/admin`. + 13 routes API.

**Déjà en place (≠ brief, qui supposait tout à construire) :**
- **`/world` + `WorldBuilder.tsx` (357 l.) + `lib/mock-world.ts`** : économie COMPLÈTE et bien séparée (9 ressources symboliques, 7 événements typés, 10 objets constructibles, 5 quêtes, état communautaire, fonctions pures). La grille est **statique** (35 cellules, motifs SVG). → Phase 2 = **animer + unifier**, pas reconstruire.
- La **Community Map vit déjà dans le World** (`COMMUNITY_WORLD`) → à déplacer vers `/quartier`.
- **i18n** (10 namespaces FR/EN), **gamification** (`/profil` badges/niveaux/points via `lib/gamification.ts`), **store serveur** JSON (`lib/server/store.ts`), **carte Mapbox** (`/local`), **cercles/événements** (`/communaute`).
- Rendu animé dispo : **animejs uniquement** (pas de framer-motion/pixi/three). Décision : World en **CSS/SVG + animejs**, lazy-loadé, `prefers-reduced-motion` respecté.
- **Pas de script d'audit vocabulaire** trouvé (le brief le suppose « existant »). → je le **crée** : `scripts/vocab-audit.mjs`.
- Tests : **node:test via `pnpm test`** (~57 verts). Pas de Vitest. → je continue sur node:test.

## Arbitrages (spec vs réalité)

1. **`PLAN.md` à `apps/web/`** (et non racine monorepo) : c'est la racine de l'app web.
2. **World déjà construit** → je n'invente pas une nouvelle techno (pas de PixiJS). J'enrichis `WorldBuilder` + un moteur d'ambiance CSS/SVG/animejs. Économie conservée telle quelle (déjà conforme).
3. **Deux systèmes de progression** confirmés : `/profil` (gamification badges/niveaux) **et** `/world` (ressources). Le brief tranche : **World = progression unique**. Je **retire** badges/niveaux de `/profil` de la navigation, mais je **conserve `lib/gamification.ts`** (compteurs dérivés serveur utiles) en le reliant au World comme **quêtes douces** ; les fiches d'apprentissage (valeur pédagogique) deviennent des quêtes World. `/profil/apprentissage` reste accessible (contenu éducatif), hors progression.
4. **`/quartier`** = fusion `/local` (carte Mapbox + annuaire) + `/communaute` (cercles/posts/événements) + Community Map du World. Grosse page → je la structure en sections (Carte, Lieux utiles, Cercles, Événements, Entraide).
5. **Redirects** : Next.js `redirects()` dans `next.config.mjs` (301-like) pour `/local`→`/quartier`, `/communaute`→`/quartier`, `/bien-etre`→`/dashboard`, `/donnees`→`/profil`, `/rapport`→`/dashboard`, `/contact/mes-demandes`→`/contact`. `/mobile-preview` retiré de la nav (route conservée non listée, ou supprimée — voir Q3).

## Phase 1 — Fusions (fichier par fichier)

| Action | Détail |
|---|---|
| **bien-etre → dashboard** | Migrer le contenu ELI v6 (`app/bien-etre/page.tsx`) dans `/dashboard` ; le pédagogique (confiance/fenêtres/non-médical) → section/drawer « Comprendre les indicateurs ». Supprimer `app/bien-etre/`. Redirect. |
| **rapport → action dashboard** | Bouton « Exporter la synthèse 14 j » sur `/dashboard`. `app/rapport/` devient route technique non listée (impression). Redirect nav. |
| **local + communaute → quartier** | Créer `app/quartier/page.tsx` réunissant carte + annuaire + cercles + événements + entraide. Supprimer `app/local/`, `app/communaute/`. Redirects. |
| **donnees → profil** | Migrer `app/donnees/*` en section « Mes données » de `/profil`. Supprimer `app/donnees/`. Redirect. |
| **profil : retirer progression** | Retirer onglets Badges/Progression de `/profil` ; garder Compte + Chien(s) + Préférences + Mes données. Progression → World. |
| **contact/mes-demandes → contact** | Historique sous le formulaire de `/contact`. Supprimer la sous-route. Redirect. |
| **mobile-preview** | Retirer de la nav. (Q3 : supprimer ou garder hors-nav ?) |
| **sidebar** | 6 entrées : dashboard, journal, quartier, world, breiz, profil. |
| **i18n** | Nouveaux namespaces `quartier`, maj `nav`. |

## Phase 2 — World animé
Ambiance vivante (cycle jour/nuit doux, mer/écume, végétation qui ondule, oiseaux/papillons occasionnels, lanternes le soir) en CSS/SVG + animejs, lazy-load, reduced-motion → version statique élégante. Placement = scale-in + particules douces. Gain ressource = compteur animé. Clavier (sélection cellule + placement) + tactile. Tests économie (gains/coûts/fusion progression profil).

## Phase 3 — `/quartier` enrichi, Breiz global (bouton flottant + module garde-fous partagé), signature « confiance » du dashboard (état vide assumé), cohérence landing.

## Phase 4 — QA : responsive 6 pages + landing, a11y (clavier World, contrastes orange/cream), `scripts/vocab-audit.mjs` propre, `RAPPORT.md`.

## ❓ Questions de validation (avant Phase 1)
1. **Périmètre session** : le brief = 4 phases (très gros). Je propose d'exécuter **Phase 1 (fusions) d'abord**, valider, puis Phase 2 (World) — sprint par sprint comme tout le projet. OK ?
2. **`/profil` progression** : je **retire de la nav** mais **conserve `gamification.ts`** relié au World (plutôt que supprimer le code). OK ?
3. **`/mobile-preview`** : supprimer complètement, ou garder hors-nav comme outil interne ?
4. **`/world` reste-t-il une entrée de sidebar à part entière** (le brief le liste dans les 6), confirmé ?
