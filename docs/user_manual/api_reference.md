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
| GET | `/api/dogs` | Liste PostgreSQL limitée au Guardian authentifié |
| POST | `/api/dogs` | Création PostgreSQL owner-scoped ; l’identité Guardian doit être un UUID canonique avec un compte persistant |
| GET | `/api/dogs/:id` | Contrôle propriétaire + relecture de l’entité PostgreSQL persistée |
| PATCH | `/api/dogs/:id` | UPDATE PostgreSQL owner-scoped ; un patch vide échoue avec `400 no_updates` |
| DELETE | `/api/dogs/:id` | `409 DOG_ERASURE_LIFECYCLE_NOT_READY` ; aucune suppression tant que `G-PRIV-ERASURE` reste ouvert |
| GET | `/api/dogs/:id/absence-comparison` | Comparaison présence/absence depuis les données réelles disponibles ; fenêtre `days` validée fail-closed ; `REJECT` si la lecture réussit mais les données sont insuffisantes ; `503 presence_comparison_data_unavailable` si la source PostgreSQL est indisponible ; aucun fallback physiologique synthétique côté serveur |
| GET | `/api/dogs/:id/vet-report-link` | Création d'un lien temporaire signé |
| GET | `/api/dogs/:id/vet-report` | PDF via propriétaire ou `share_token` valide ; `503 vet_report_data_unavailable` si les sources autoritatives sont illisibles |

Les lectures et mutations non destructives du profil chien utilisent désormais la table PostgreSQL `dogs`. Les réponses de liste/détail restent owner-scoped ; CREATE vérifie aussi l’existence du compte Guardian avant insertion. DELETE reste volontairement fail-closed : le dépôt n’invente pas un effacement partiel tant que la topologie complète d’effacement et les données dépendantes/externalisées ne sont pas autorisées par `G-PRIV-ERASURE`.

Le paramètre `days` de la comparaison présence/absence est contrôlé après l'autorisation propriétaire : omission = 14 jours ; valeur fournie = entier décimal positif sûr et représentable comme date, sinon `400 invalid_presence_window`. Aucun plafond métier n'est choisi ici. Une lecture PostgreSQL réussie sans ligne reste un état d'absence de données ; une erreur de lecture reste une indisponibilité distincte (`503`, réponse `private, no-store`).

Le mode démo sans token de l'application mobile peut construire une comparaison locale explicitement étiquetée comme telle ; il ne constitue pas une source de données backend et ne doit pas être confondu avec une mesure du chien.

### Capteurs et ELI

| Méthode | Chemin | État observé |
|---|---|---|
| POST | `/api/sensors/summaries` | Persistance PostgreSQL owner-scoped avec provenance `ingestionId` + `deviceId`, liaison dog/source, snapshot firmware serveur et retry idempotent |
| GET | `/api/sensors/summaries/:dogId` | Lecture PostgreSQL owner-scoped ; fenêtres bornées `1h/6h/12h/24h/48h/72h/7d/14d/30d`, ordre décroissant ; source indisponible => `503 PRODUCT_DATABASE_OPERATION_UNAVAILABLE` |
| GET | `/api/sensors/eli/:dogId` | Contrôle propriétaire ; `501 eli_runtime_not_implemented` tant qu’aucun producteur ELI autoritatif n’est câblé |
| GET | `/api/sensors/eli/:dogId/history` | Contrôle propriétaire ; `501 eli_runtime_not_implemented` tant qu’aucun runtime/lecteur ELI autoritatif n’est câblé |
| GET | `/api/sensors/baseline/:dogId` | Contrôle propriétaire ; `501 baseline_read_not_implemented` tant qu’aucune projection autoritative n’est câblée |
| POST, GET | `/api/sensors/presence/:dogId/events` | Événements conservés en mémoire du processus ; le GET valide `days` fail-closed et renvoie `400 invalid_presence_window` si la fenêtre fournie est invalide |

Le `POST /api/sensors/summaries` persiste désormais dans PostgreSQL uniquement avec une provenance canonique : `ingestionId` et `deviceId` sont requis par le runtime, le device doit appartenir au chien et correspondre à la source MAT/TAG, les champs propres à l'autre source sont rejetés, et la version firmware est lue depuis le registre serveur. Un retry strictement identique réutilise la ligne existante ; la réutilisation d'un même `ingestionId` avec un contenu différent échoue. Cette provenance relationnelle ne constitue pas une authentification cryptographique du matériel.

### Communauté

| Méthode | Chemin | État observé |
|---|---|---|
| GET | `/api/community` | `503 COMMUNITY_PERSISTENCE_NOT_READY` tant que la liste durable member-scoped n’est pas intégrée |
| GET | `/api/community/:id` | `503 COMMUNITY_PERSISTENCE_NOT_READY` tant que le détail durable n’est pas intégré |
| GET | `/api/community/:id/feed` | `503 COMMUNITY_PERSISTENCE_NOT_READY` tant que le feed durable n’est pas intégré |
| POST | `/api/community/rules/accept` | Acceptation conservée en mémoire |
| POST | `/api/community/reports` | Signalement conservé en mémoire |
| POST | `/api/community/blocks` | Blocage conservé en mémoire |
| POST | `/api/community/posts` | Validation/règles/filtre puis `501 community_post_persistence_not_implemented`; aucun succès de création tant qu'aucun writer Hono n'est prouvé |
| POST | `/api/community/comments` | Validation/règles/filtre puis `501 community_comment_persistence_not_implemented`; aucun succès de création tant qu'aucun writer Hono n'est prouvé |
| GET | `/api/community/:id/events` | `503 COMMUNITY_PERSISTENCE_NOT_READY` tant que la lecture durable des événements n’est pas intégrée |
| POST | `/api/community/events` | Validation/règles/filtre puis `501 community_event_persistence_not_implemented`; aucun succès de création tant qu'aucun writer Hono n'est prouvé |
| GET | `/api/community/copresence/:dogId` | Contrôle propriétaire puis `503 COMMUNITY_PERSISTENCE_NOT_READY` tant que le runtime de coprésence n’est pas implémenté ; aucun `200` vide n’est utilisé pour simuler l’absence de correspondances |

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
| GET | `/api/health/:dogId` | Contrôle propriétaire ; `501 health_entry_read_not_implemented` tant qu’aucun lecteur autoritatif n’est câblé |
| POST | `/api/health` | Validation + contrôle propriétaire ; `501 health_entry_persistence_not_implemented` tant qu'aucun writer durable n'est actif |
| GET | `/api/health/:dogId/reminders` | Contrôle propriétaire ; `501 health_reminder_read_not_implemented` tant que la lecture/sémantique des rappels n’est pas implémentée |

Ces routes portent un nom historique `health`, mais leurs sorties ne doivent pas être présentées comme un diagnostic.

### Annuaire

| Méthode | Chemin | État observé |
|---|---|---|
| GET | `/api/directory/search` | Production : `503 DATA_RIGHTS_GATE_HOLD` tant que l’autorité revue reste HOLD ; démo explicite uniquement hors production |
| GET | `/api/directory/categories` | Même gate de droits : HOLD par défaut ; aucune publication par simple flag d’environnement |
| GET | `/api/directory/:id` | Même gate de droits ; démo non-production sanitise les claims de rating/vérification/provenance |

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
