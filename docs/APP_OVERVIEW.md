# EMOPET — Aperçu observé de l'application web

Ce document oriente les personnes qui découvrent `apps/web` au 2026-08-29. Il décrit les routes et dépendances committées ; il ne constitue ni une spécification produit figée, ni une preuve de déploiement ou de maturité.

## 1. Stack et limites

- Next.js 15 App Router, React 19, TypeScript ;
- HeroUI 3, Tailwind 4 et primitives maison ;
- tokens de design dans `apps/web/styles/tokens.css` ;
- Route Handlers Next.js sous `apps/web/app/api` ;
- stockage JSON prototype via `apps/web/lib/server/store.ts` ;
- replis localStorage/sessionStorage dans certains clients ;
- backend Hono/PostgreSQL séparé dans `backend`, pas encore consommé de manière uniforme par le web.

Les stores JSON et navigateur ne sont pas une autorité de production. Le code présent ne prouve pas que le web compile, passe ses tests ou est déployable sur le commit courant.

## 2. Contraintes de contenu et conflit ouvert

- aucune revendication diagnostique ou médicale ;
- aucune attribution d'émotion humaine au chien ;
- aucune anthropomorphisation ;
- consentement explicite et données privées par défaut pour les parcours sensibles ;
- données vocales limitées aux caractéristiques dérivées, sans audio brut ;
- accessibilité et réduction de mouvement prévues dans les composants.

Le code contient une gamification centrée propriétaire et une page `world`, tandis que `AGENTS.md` interdit toute gamification. Ce conflit d'autorité reste ouvert : ne pas étendre, supprimer ou déclarer conforme ce comportement sans décision contrôlée.

## 3. Routes de pages observées

| Route | État / rôle observé |
|---|---|
| `/` | Landing publique avec scènes produit et contrôles de présentation |
| `/dashboard` | Synthèse ELI/observation |
| `/breiz` | Interface assistant Breiz |
| `/journal` | Journal et observations |
| `/quartier` | Carte, annuaire et communauté regroupés |
| `/world` | Espace de world-building centré routines/qualité d'observation ; conflit gamification ouvert |
| `/profil` | Profil, données et progression propriétaire |
| `/contact` | Parcours de contact humain |
| `/mobile-preview` | Prévisualisation web hors navigation principale |
| `/admin` | Interface d'administration prototype |
| `/admin/data` | Vue d'administration des données |
| `/rapport` | Fichier de page conservé, mais la configuration redirige actuellement l'URL vers `/dashboard` |

Navigation sidebar observée : `/dashboard`, `/journal`, `/quartier`, `/world`, `/breiz`, `/profil`.

Redirections déclarées dans `apps/web/next.config.mjs` :

| Ancienne route | Destination |
|---|---|
| `/bien-etre` | `/dashboard` |
| `/rapport` | `/dashboard` (temporaire) |
| `/local` | `/quartier` |
| `/communaute` | `/quartier` |
| `/donnees` | `/profil` |
| `/contact/mes-demandes` | `/contact` |

Les anciennes routes ne doivent plus être documentées comme des pages principales indépendantes.

## 4. Route Handlers Next.js observés

| Groupe | Chemins principaux | Persistance / dépendance |
|---|---|---|
| Breiz | `/api/breiz` | fournisseurs externes si configurés, repli local |
| Contexte | `/api/context` | agrégation de contexte prototype |
| Races | `/api/breeds` | données de référence web |
| Journal | `/api/journal` | store JSON + replis client |
| Carte | `/api/map/spots`, commentaires | store JSON + données cartographiques |
| Communauté | posts, réponses, signalements, événements | store JSON et modération prototype |
| Contact | `/api/contact` | store JSON, notification externe si configurée |
| Administration | modération, contact et posts | token/admin prototype |

Chemins exacts : `apps/web/app/api/**/route.ts`.

Ces handlers ne sont pas montés dans le backend Hono et ne partagent pas automatiquement son middleware JWT ou son contrôle propriétaire. « Serveur » ne signifie donc pas « autorité durable » dans cette architecture actuelle.

## 5. Données et intégrations

### Données locales/prototype

- `apps/web/.data` — collections JSON créées au runtime et ignorées par Git ;
- localStorage/sessionStorage — cache, replis et identifiants prototype ;
- données mock et corpus sous `apps/web/lib`.

### Intégrations conditionnelles

Le web contient des chemins conditionnés par des variables d'environnement pour Mapbox, des fournisseurs de génération, la notification et l'analytics. Leur présence dans le code ne prouve ni qu'une clé est configurée, ni qu'un fournisseur est approuvé, ni qu'un déploiement fonctionne.

Ne jamais committer de valeur secrète. Les noms et attentes doivent rester dans les fichiers `.env.example` contrôlés.

## 6. Backend et mobile séparés

- `backend` expose une API Hono protégée par JWT après le groupe public `/api/auth` ; l'inscription, la connexion et le refresh restent des stubs ;
- `backend/db` contient les schémas Drizzle/PostgreSQL, mais la baseline de migration est bloquée ;
- `apps/mobile` est une application Expo 52 / React 18 distincte ;
- Unity et Nakama sont absents du dépôt et restent `GATED`.

Voir `docs/user_manual/api_reference.md` pour la surface Hono observée et `ARCHITECTURE.md` pour les frontières de données.

## 7. Validation déclarée par le manifest web

Depuis la racine :

```powershell
pnpm --filter @emopet/web lint
pnpm --filter @emopet/web typecheck
pnpm --filter @emopet/web test
pnpm --filter @emopet/web build
```

Autres scripts déclarés : `vocab`, `smoke`, `check` et `verify`. La présence de ces scripts n'est pas un résultat de test.

## 8. Références

- `README.md` — état général et commandes ;
- `ARCHITECTURE.md` — architecture et statuts ouverts/gated ;
- `apps/web/components/sidebar.tsx` — navigation principale ;
- `apps/web/next.config.mjs` — redirections ;
- `apps/web/app/api` — handlers web ;
- `apps/web/lib/server/store.ts` — store JSON prototype ;
- `docs/user_manual/installation_guide.md` — démarrage local observé.
