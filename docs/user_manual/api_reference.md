# EMOPET — Référence de l'API Hono observée

Cette référence décrit les routes montées par `backend/api/index.ts` au 2026-08-29. Elle n'est ni un contrat OpenAPI versionné ni une preuve de disponibilité en production.

L'ancienne référence FastAPI (`/predict`, `/insights`, rapports CSV et extensions Python) ne correspond pas au serveur actif. Elle reste consultable dans l'historique Git.

## 1. Adresse locale et format

- adresse par défaut : `http://127.0.0.1:3000` ;
- surcharge du port : variable `PORT` ;
- corps et réponses applicatives : JSON, sauf le rapport vétérinaire PDF.

## 2. Authentification et autorisation

`GET /health` et le groupe `/api/auth` sont publics. Toutes les autres routes `/api/*` passent par le middleware JWT.

Pour une route protégée :

```http
Authorization: Bearer <token>
```

Limites importantes :

- `JWT_SECRET` est obligatoire hors `NODE_ENV=test` ;
- le helper `signToken` émet des jetons HS256 à sept jours ; le middleware vérifie leur signature et toute expiration présente ;
- `register`, `login` et `refresh` sont des stubs et ne fournissent pas encore de cycle d'identité utilisable ;
- plusieurs routes chien/capteur appliquent `requireDogOwnership`, mais la couverture négative de toutes les routes n'est pas démontrée ;
- un `share_token` signé peut donner un accès temporaire au PDF vétérinaire sans Bearer token ;
- l'identité, la récupération, la révocation, la rotation et la suppression restent `OPEN / GATED`.

## 3. Routes publiques

| Méthode | Chemin | État observé |
|---|---|---|
| GET | `/health` | Probe `{ status, version }` |
| POST | `/api/auth/register` | Validation d'entrée, inscription non implémentée |
| POST | `/api/auth/login` | Validation d'entrée, vérification/émission JWT non implémentée |
| POST | `/api/auth/refresh` | Renouvellement non implémenté |

## 4. Routes protégées

### Chiens

| Méthode | Chemin | État observé |
|---|---|---|
| GET, POST | `/api/dogs` | Liste/création placeholder |
| GET, PATCH, DELETE | `/api/dogs/:id` | Contrôle propriétaire, réponse encore partielle |
| GET | `/api/dogs/:id/absence-comparison` | Comparaison présence/absence avec données DB ou fallback |
| GET | `/api/dogs/:id/vet-report-link` | Création d'un lien temporaire signé |
| GET | `/api/dogs/:id/vet-report` | PDF, via propriétaire ou `share_token` valide |

### Capteurs et ELI

| Méthode | Chemin | État observé |
|---|---|---|
| POST | `/api/sensors/summaries` | Validation + contrôle propriétaire, persistance TODO |
| GET | `/api/sensors/summaries/:dogId` | Résultats placeholder |
| GET | `/api/sensors/eli/:dogId` | État ELI placeholder |
| GET | `/api/sensors/eli/:dogId/history` | Historique placeholder |
| GET | `/api/sensors/baseline/:dogId` | Baseline placeholder |
| POST, GET | `/api/sensors/presence/:dogId/events` | Événements conservés en mémoire du processus |

### Communauté

| Méthode | Chemin | État observé |
|---|---|---|
| GET | `/api/community` | Liste placeholder |
| GET | `/api/community/:id` | Détail minimal |
| GET | `/api/community/:id/feed` | Feed placeholder |
| POST | `/api/community/rules/accept` | Acceptation conservée en mémoire |
| POST | `/api/community/reports` | Signalement conservé en mémoire |
| POST | `/api/community/blocks` | Blocage conservé en mémoire |
| POST | `/api/community/posts` | Validation/règles/filtre puis `501 community_post_persistence_not_implemented`; aucun succès de création tant qu'aucun writer Hono n'est prouvé |
| POST | `/api/community/comments` | Validation/règles/filtre puis `501 community_comment_persistence_not_implemented`; aucun succès de création tant qu'aucun writer Hono n'est prouvé |
| GET | `/api/community/:id/events` | Liste placeholder |
| POST | `/api/community/events` | Validation/règles/filtre puis `501 community_event_persistence_not_implemented`; aucun succès de création tant qu'aucun writer Hono n'est prouvé |
| GET | `/api/community/copresence/:dogId` | Contrôle propriétaire, résultats placeholder |

Les contrôles de règles et de modération déterminent uniquement si une requête est autorisée à poursuivre. Ils ne constituent pas une preuve qu'un post, commentaire ou événement a été créé ou persisté.

### Progression, consentements et waitlist

| Méthode | Chemin | État observé |
|---|---|---|
| GET | `/api/feature-progress` | État calculé depuis les stores mémoire |
| GET, POST | `/api/feature-progress/consents` | Consentements en mémoire |
| POST | `/api/feature-progress/waitlist` | Waitlist en mémoire |

### Journal dit « health »

| Méthode | Chemin | État observé |
|---|---|---|
| GET | `/api/health/:dogId` | Contrôle propriétaire, entrées placeholder |
| POST | `/api/health` | Validation + contrôle propriétaire, persistance non démontrée |
| GET | `/api/health/:dogId/reminders` | Contrôle propriétaire, rappels placeholder |

Ces routes portent un nom historique `health`, mais leurs sorties ne doivent pas être présentées comme un diagnostic.

### Annuaire

| Méthode | Chemin | État observé |
|---|---|---|
| GET | `/api/directory/search` | Recherche PostgreSQL, rayon borné à 50 km |
| GET | `/api/directory/categories` | Catégories et comptes PostgreSQL |
| GET | `/api/directory/:id` | Entrée PostgreSQL par identifiant |

## 5. Plan API web distinct

`apps/web/app/api/**` contient des Route Handlers Next.js pour Breiz, contact, journal, communauté, carte, races, contexte et administration. Ils ne sont pas montés dans l'application Hono et ne partagent pas automatiquement son middleware JWT/ownership.

Le web possède notamment un plan Community Next.js sous des chemins publics ressemblant à `/api/community/*`. Le fait qu'un handler Next.js persiste actuellement du contenu ne rend pas le handler Hono homonyme persistant, et les deux plans ne doivent pas être présentés comme un contrat unique tant que l'autorité Community n'a pas été explicitement choisie et consolidée.

Certains handlers web écrivent dans `apps/web/.data` ou utilisent des replis navigateur. Ils constituent un plan prototype séparé, décrit dans `docs/APP_OVERVIEW.md`, pas l'autorité durable du backend par simple existence.

## 6. Source du contrat

En l'absence d'OpenAPI versionné, les sources observées sont :

- `backend/api/index.ts` pour le montage et les middlewares ;
- `backend/api/routes/*` pour les routes ;
- `backend/api/middleware/*` pour l'authentification et l'autorisation ;
- `packages/shared/src` pour les schémas Zod partagés ;
- `backend/test` pour la couverture disponible.

Toute stabilisation du contrat nécessite un changement séparé avec tests de compatibilité et d'isolation.
