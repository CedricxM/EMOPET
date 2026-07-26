# EMOPET

> EMOPET produit des observations et des tendances de bien-être canin.
> Positionnement non médical : aucun diagnostic, aucune constante vitale, aucune étiquette émotionnelle affichée.
> Ce dépôt ne remplace pas l'avis d'un vétérinaire.

Monorepo TypeScript du système EMOPET : application mobile propriétaire, site web, API, moteur d'inférence ELI, protocole BLE et amorces de firmware.

## Statut du dépôt

| Zone | Technologie réelle | Maturité |
|---|---|---|
| `apps/mobile` | React Native / Expo 52, expo-router 4 | avancé |
| `apps/web` | Next.js 15, React 19, Tailwind 4 | avancé |
| `backend` | Hono 4, Drizzle ORM, PostgreSQL, `jose` (JWT) | avancé, routes capteurs encore en TODO |
| `packages/eli-engine` | EKF, RSM de fiabilité, confiance, vetoes (testé Vitest) | solide |
| `packages/ble-protocol` | trame binaire versionnée, état de fiabilité par capteur | solide |
| `packages/ai-personality` | gabarits de contenu Bleiz et garde-fous lexicaux | moyen |
| `packages/shared` | types partagés et validateurs Zod | solide |
| `firmware/collar`, `firmware/mat` | amorces DSP en C (environ 380 lignes) | embryonnaire |

N'existent pas dans ce dépôt : projet Unity, service temps réel social, connecteurs city-data, service Breiz autonome. Ces éléments appartiennent au plan plateforme cible, pas au code actuel.

## Prérequis

- Node.js 20 ou supérieur
- pnpm 10.33.0 (déclaré via `packageManager`)
- PostgreSQL 16 pour le backend

## Installation

```bash
pnpm install
cp .env.example .env   # renseigner les valeurs localement, ne jamais committer .env
```

## Commandes racine (Turborepo)

```bash
pnpm build       # turbo build
pnpm dev         # turbo dev
pnpm test        # turbo test
pnpm typecheck   # turbo typecheck
pnpm lint        # turbo lint
```

Raccourcis par application :

```bash
pnpm backend:dev   # API Hono en watch (tsx)
pnpm web:dev       # Next.js sur le port 3100
pnpm mobile:dev    # Expo
pnpm mobile:ios    # Expo iOS
pnpm mobile:android
```

## Tests

Chaque paquet porte son propre exécuteur, il n'y a pas d'exécuteur unique :

```bash
pnpm --filter @emopet/eli-engine test        # Vitest
pnpm --filter @emopet/api build && \
pnpm --filter @emopet/api test               # node:test, importe ./dist (build requis)
pnpm --filter @emopet/web test               # node:test via tsx sur lib/**/*.test.ts
pnpm --filter @emopet/ai-personality test    # node:test
```

Le paquet `@emopet/api` compile avant de tester : ses tests importent `dist/`. Un test de contrat (`backend/test/contract-affective-exposure.test.mjs`) fonctionne en analyse statique et ne nécessite ni build ni base de données.

## Base de données

Le backend utilise Drizzle Kit :

```bash
pnpm --filter @emopet/api db:generate
pnpm --filter @emopet/api db:migrate
pnpm --filter @emopet/api db:studio
```

## Environnement et secrets

- `.env.example` contient des valeurs de substitution uniquement.
- Les `.env` réels sont ignorés par `.gitignore` et ne doivent jamais être committés.
- Ce dépôt est public : voir `SECURITY_ROTATION_REQUIRED.md` et `SECURITY_CHECKLIST.md` avant toute mise en ligne.

## Invariants produit

1. Non médical : aucun diagnostic, aucune terminologie pathologique dans les sorties utilisateur.
2. Aucune donnée sans son état de fiabilité (VALID, DEGRADED, SUPPRESSED). L'abstention prime sur l'estimation.
3. Variables affectives latentes (`arousal`, `valence`, `peak_arousal`) jamais exposées à l'utilisateur ni publiquement. Voir `docs/architecture/ADR-0001-variables-affectives-latentes.md`, garde-fou automatisé dans `backend/test/contract-affective-exposure.test.mjs`.
4. Aucun audio brut stocké ni transmis.
5. Distinguer toujours observé (capteurs), déclaré (humain) et interprété (EMOPET).

## Documents de référence

- `ARCHITECTURE.md` : architecture logicielle réelle.
- `AUDIT.md` : audit du code réel.
- `docs/architecture/` : ADR et vue système.
- `CLAUDE.md`, `AGENTS.md` : conventions de travail assisté.

## Dérive documentaire connue

`docker-compose.yml` décrit encore un service `api` Python (uvicorn, `src.api.emopet_api:app`) issu de la pile historique v6. Ce service ne correspond plus au backend TypeScript et n'est pas fonctionnel en l'état. Seul le service `db` est utilisable. Correction volontairement hors périmètre du lot documentaire en cours.
