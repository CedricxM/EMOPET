# EMOPET — Guide de développement local observé

Ce guide décrit les commandes déclarées par les manifests du monorepo au 2026-08-29. Il ne prouve pas que chaque workspace compile ou que l'environnement est prêt pour la production.

Les anciennes instructions Python, FastAPI, Flutter et Streamlit de ce fichier ne correspondent plus aux points d'entrée actifs. Elles restent accessibles dans l'historique Git.

## 1. Prérequis

- Node.js 20 ou plus récent ;
- pnpm 10.33.0 ;
- PostgreSQL pour les parcours qui utilisent `backend/db` ;
- les SDK Expo/Android/iOS nécessaires uniquement pour les cibles mobiles choisies.

Docker Compose n'est pas un chemin de démarrage valide actuellement : `docker-compose.yml` référence encore Python/Uvicorn, un `Dockerfile` racine absent et une chaîne d'initialisation Alembic historique.

## 2. Installer les dépendances

Depuis la racine du dépôt :

```powershell
pnpm install --frozen-lockfile
```

Ne pas remplacer le lockfile ni mélanger npm/yarn avec le workspace pnpm.

## 3. Application web

```powershell
pnpm web:dev
```

Le script démarre Next.js sur `http://localhost:3100`.

Les Route Handlers sous `apps/web/app/api` utilisent des chemins prototype distincts du backend Hono. Certaines routes écrivent des fichiers JSON sous `apps/web/.data` et certains clients ont des replis localStorage/sessionStorage. Ces stores ne constituent pas une autorité de production.

## 4. Backend Hono

Variables à configurer dans l'environnement local, sans les committer :

- `JWT_SECRET` — obligatoire hors `NODE_ENV=test` ;
- `DATABASE_URL` — connexion PostgreSQL utilisée par Drizzle/Postgres.js ;
- `CORS_ORIGIN` — obligatoire en production, optionnelle en développement ;
- `PORT` — optionnelle, port `3000` par défaut.

Puis :

```powershell
pnpm backend:dev
```

Vérification technique minimale :

```powershell
Invoke-RestMethod "http://127.0.0.1:3000/health"
```

Les routes `register`, `login` et `refresh` sont encore des stubs et n'émettent pas de jeton. Le démarrage du serveur ne constitue donc pas une preuve d'authentification fonctionnelle.

## 5. Application mobile

```powershell
pnpm mobile:dev
```

Raccourcis déclarés :

```powershell
pnpm mobile:android
pnpm mobile:ios
```

L'application mobile est un workspace Expo/React Native distinct de l'application web.

## 6. Validations déclarées

À la racine :

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Validation ciblée du web :

```powershell
pnpm --filter @emopet/web lint
pnpm --filter @emopet/web typecheck
pnpm --filter @emopet/web test
pnpm --filter @emopet/web build
```

Les tests backend importent `backend/dist`. Compiler avant de les lancer :

```powershell
pnpm --filter @emopet/api build
pnpm --filter @emopet/api test
```

Le mobile ne déclare actuellement qu'un script `typecheck`, pas de script de test.

## 7. Base de données : blocage connu

Ne pas utiliser `pnpm --filter @emopet/api db:migrate` comme preuve d'installation propre. La suite de migrations committée ne crée pas toutes les tables de base qu'elle modifie et la métadonnée Drizzle attendue est absente.

La réparation de la baseline et la compatibilité avec d'éventuelles bases existantes nécessitent un changement séparé, une stratégie d'upgrade/rollback et une validation sur base vide.

## 8. Références

- `README.md` — état et commandes du dépôt ;
- `ARCHITECTURE.md` — architecture observée et limites d'autorité ;
- `docs/user_manual/api_reference.md` — surface Hono observée ;
- `docs/APP_OVERVIEW.md` — routes et données de l'application web.
