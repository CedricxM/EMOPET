# EMOPET — Guide de développement local observé

Ce guide décrit les commandes et frontières de développement du monorepo, réconciliées avec le runtime courant le 2026-10-03. Il ne prouve pas que chaque workspace compile ou que l'environnement est prêt pour la production.

Les anciennes instructions Python, FastAPI, Flutter et Streamlit de ce fichier ne correspondent plus aux points d'entrée actifs. Elles restent accessibles dans l'historique Git.

## 1. Prérequis

- Node.js 20 ou plus récent ;
- pnpm 10.33.0 ;
- PostgreSQL pour les parcours qui utilisent `backend/db` ;
- les SDK Expo/Android/iOS nécessaires uniquement pour les cibles mobiles choisies.

Le chemin applicatif canonique reste le monorepo Node/pnpm. Le Compose racine historique Python/Uvicorn/Alembic ne démarre pas le backend Hono. Le runtime World/Nakama dispose d'une infrastructure Compose isolée sous `infra/nakama` ; elle ne constitue pas le déploiement production de l'API Hono.

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
- `DATABASE_URL` — connexion PostgreSQL du **runtime applicatif** ; en production elle doit utiliser un rôle DML limité, sans privilèges d'administration/DDL ;
- `MIGRATION_DATABASE_URL` — connexion réservée aux migrations/DDL ; elle ne doit pas être injectée dans le processus API longue durée ;
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

Les routes d'inscription/vérification e-mail/login/refresh/logout sont implémentées et disposent de tests PostgreSQL. Le démarrage du serveur seul ne constitue ni une preuve de livraison e-mail réelle ni une autorité d'exploitation production. Le provider web Owner exige un `EMOPET_INTERNAL_BACKEND_URL` configuré (HTTPS en production, loopback HTTP permis en développement) ; son single-flight refresh est instance-local. La coordination interne sélectionnée reste non implémentée sur main et #1103 est différée ; ce guide n'autorise aucune activation.

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

## 7. Base de données : autorité runtime vs migrations

Le dépôt valide désormais sa baseline PostgreSQL sur des bases jetables par deux chemins : migrations historiques et baseline Drizzle générée. Cette CI reste une preuve de cohérence de dépôt, **pas** une autorisation de migration d'une base de production existante.

Séparer les autorités :

- le serveur Hono lit `DATABASE_URL` et, en production, refuse de démarrer sans cette variable ;
- le runtime production vérifie que son rôle PostgreSQL n'est ni `SUPERUSER`, ni `CREATEDB`, ni `CREATEROLE`, ni `REPLICATION`, ni `BYPASSRLS`, et qu'il ne peut pas créer d'objets dans le schéma `public` ;
- `drizzle-kit` utilise `MIGRATION_DATABASE_URL` pour les migrations de production ;
- les environnements de développement/test peuvent conserver le fallback local pour ne pas alourdir le bootstrap.

Une vraie migration de production exige encore une stratégie d'upgrade/rollback, un backup/restore prouvé et les credentials/opérations du fournisseur.

## 8. Références

- `README.md` — état et commandes du dépôt ;
- `ARCHITECTURE.md` — architecture observée et limites d'autorité ;
- `docs/user_manual/api_reference.md` — surface Hono observée ;
- `docs/APP_OVERVIEW.md` — routes et données de l'application web.
