# EMOPET — Référence de l'API Hono observée

Cette référence décrit les routes montées par `backend/api/index.ts` sur la branche de durcissement au 2026-09-10. Elle n'est ni un contrat OpenAPI versionné ni une preuve de disponibilité en production.

L'ancienne référence FastAPI (`/predict`, `/insights`, rapports CSV et extensions Python) ne correspond pas au serveur actif. Elle reste consultable dans l'historique Git.

## 1. Adresse locale et format

- adresse par défaut : `http://127.0.0.1:3000` ;
- surcharge du port : variable `PORT` ;
- corps et réponses applicatives : JSON, sauf le rapport vétérinaire PDF historique ;
- `CORS_ORIGIN` est obligatoire en production ; hors production seulement, le fallback CORS est `*`.

## 2. Authentification et autorisation

`GET /health` et le groupe `/api/auth` sont publics, à l'exception de `/api/auth/logout-all` qui applique lui-même `authMiddleware`. Toutes les autres routes `/api/*` passent par le middleware JWT.

Pour une route protégée :

```http
Authorization: Bearer <token>
```

État et limites importants :

- `JWT_SECRET` est obligatoire hors `NODE_ENV=test` et doit contenir au moins 32 caractères ; les tests sans secret explicite utilisent une clé aléatoire limitée au processus ;
- `register` et `login` utilisent désormais PostgreSQL, des mots de passe hachés et des identités utilisateur UUID canoniques ;
- `refresh` utilise des jetons opaques dont seul le hash est persisté, avec rotation et détection de réutilisation par famille ;
- `logout` révoque le jeton de rafraîchissement présenté et `logout-all` révoque les sessions de rafraîchissement actives de l'utilisateur authentifié ;
- les jetons d'accès restent valides jusqu'à leur expiration bornée après une révocation de session de rafraîchissement ; aucune révocation instantanée de chaque JWT d'accès n'est revendiquée ;
- plusieurs routes chien/capteur appliquent `requireDogOwnership`, avec non-divulgation cross-owner (`404`) sur les chemins couverts ;
- le lien vétérinaire générique est bloqué en production et n'est disponible qu'avec l'opt-in explicite non-production `EMOPET_ALLOW_LEGACY_GENERIC_VET_SHARE=1` ;
- le backend durable de partage professionnel recipient-bound reste ouvert ;
- stockage sécurisé côté client, transport cookie/native, vérification e-mail, récupération de mot de passe, MFA/IdP, politique de secrets production, rétention et tests de sécurité de production restent `OPEN / GATED` sous AUTH-01/PRIV-01.

## 3. Routes d'authentification

| Méthode | Chemin | État observé |
|---|---|---|
| GET | `/health` | Probe `{ status, version }` |
| POST | `/api/auth/register` | Création PostgreSQL + session de rafraîchissement ; `201` si succès, `409` sur compte existant |
| POST | `/api/auth/login` | Vérification des credentials + émission access/refresh ; `401` générique si credentials invalides |
| POST | `/api/auth/refresh` | Rotation du refresh token ; réutilisation/révocation/expiration échouent sans recréer une session valide |
| POST | `/api/auth/logout` | Révocation du refresh token présenté ; `204` |
| POST | `/api/auth/logout-all` | Protégé par bearer access token ; révoque les refresh sessions actives ; `204` |

Ces routes constituent une implémentation candidate testée sur PostgreSQL jetable. Elles ne constituent pas à elles seules une autorisation d'authentification production.

## 4. Routes protégées

### Chiens

| Méthode | Chemin | État observé |
|---|---|---|
| GET, POST | `/api/dogs` | Liste/création PostgreSQL, liées à l'utilisateur authentifié |
| GET, PATCH, DELETE | `/api/dogs/:id` | PostgreSQL + contrôle propriétaire ; cross-owner non divulgué |
| GET | `/api/dogs/:id/absence-comparison` | `503 ABSENCE_COMPARISON_PERSISTENCE_NOT_READY` tant que les événements de présence ne sont pas durables |
| GET | `/api/dogs/:id/vet-report-link` | Bloqué en production (`RECIPIENT_BOUND_GRANT_REQUIRED`) ; compatibilité non-production uniquement |
| GET | `/api/dogs/:id/vet-report` | Accès propriétaire ; ancien `share_token` accepté uniquement dans le mode legacy non-production explicite |

### Capteurs et ELI

| Méthode | Chemin | État observé |
|---|---|---|
| POST | `/api/sensors/summaries` | Contrôle propriétaire + persistance PostgreSQL |
| GET | `/api/sensors/summaries/:dogId` | Lecture PostgreSQL bornée par une plage validée ; erreur source distincte d'une lecture vide |
| GET | `/api/sensors/eli/:dogId` | `501 ELI_RUNTIME_NOT_IMPLEMENTED` après contrôle propriétaire ; aucun état persistant n'est promu en résultat live sans producteur ELI autoritaire |
| GET | `/api/sensors/eli/:dogId/history` | `501 ELI_RUNTIME_NOT_IMPLEMENTED` après contrôle propriétaire ; aucune API historique live n'est revendiquée |
| GET | `/api/sensors/baseline/:dogId` | Lecture PostgreSQL de la baseline, projetée sur l'autorité Guardian ; le JSON `metrics` opaque est retenu hors réponse |
| POST, GET | `/api/sensors/presence/:dogId/events` | `503 PRESENCE_PERSISTENCE_NOT_READY` ; aucun faux succès mémoire |

**Frontière importante :** le parseur BLE produit `ParsedBleSensorFrame`, tandis que l'ELI consomme un `FeatureVector`/`EliInput`. Le transformateur physique device → feature extraction → ELI n'est pas démontré end-to-end par le dépôt actuel. La présence de types, de tables `eli_states` ou du parseur ne doit pas être interprétée comme une chaîne runtime validée. Le hook mobile v6 est explicitement `UNWIRED / authoritative=false / endpoint=null` et ne nomme aucun endpoint futur comme acquis.

### Communauté

Toutes les routes Community exigent une identité réelle dans le contexte. Aucune route ne retombe sur `demo-user`.

| Méthode | Chemin | État observé |
|---|---|---|
| GET | `/api/community`, `/api/community/:id`, `/api/community/:id/feed` | `503 COMMUNITY_PERSISTENCE_NOT_READY` après authentification |
| POST | `/api/community/rules/accept` | `503` ; aucune acceptation mémoire revendiquée comme durable |
| POST | `/api/community/reports`, `/api/community/blocks` | `503` jusqu'à persistance durable |
| POST | `/api/community/posts`, `/api/community/comments` | `503` jusqu'à persistance durable |
| GET, POST | événements Community | `503` jusqu'à persistance durable |
| GET | `/api/community/copresence/:dogId` | contrôle propriétaire puis `503` jusqu'à persistance durable |

### Progression, consentements et waitlist

Le service mémoire historique reste utilisable comme preuve/prototype interne, mais il n'est plus exposé comme autorité de release.

| Méthode | Chemin | État observé |
|---|---|---|
| GET | `/api/feature-progress` | `503 FEATURE_PROGRESS_PERSISTENCE_NOT_READY` après authentification |
| GET, POST | `/api/feature-progress/consents` | `503` ; aucun consentement mémoire présenté comme durable |
| POST | `/api/feature-progress/waitlist` | `503` tant que la waitlist n'a pas de persistance autoritaire |

Les defaults sensibles de l'application mobile (`location_opt_in`, `community_opt_in`, `vet_export_opt_in`) sont `false` et vérifiés par un gate CI statique. Ce gate prouve uniquement le default client, pas une persistance serveur de consentement.

### Journal historique dit « health »

| Méthode | Chemin | État observé |
|---|---|---|
| GET | `/api/health/:dogId` | contrôle propriétaire puis `503 HEALTH_PERSISTENCE_NOT_READY` |
| POST | `/api/health` | validation + contrôle propriétaire puis `503` ; aucun faux `201` |
| GET | `/api/health/:dogId/reminders` | contrôle propriétaire puis `503` |

Ces routes portent un nom historique `health`, mais aucune sortie ne doit être présentée comme diagnostic ou persistance disponible tant que le gate n'est pas fermé.

### Annuaire

Les routes annuaire sont PostgreSQL, mais leur exposition reste soumise aux gates de droits/données de la branche.

| Méthode | Chemin | État observé |
|---|---|---|
| GET | `/api/directory/search` | Recherche PostgreSQL, avec gate de release/démo côté route |
| GET | `/api/directory/categories` | Catégories PostgreSQL sous la même autorité |
| GET | `/api/directory/:id` | Entrée PostgreSQL par identifiant sous la même autorité |

### Export de données

`/api/data-export` est monté derrière le middleware JWT. Les exports sont owner-scoped et ne constituent pas, par leur présence dans le dépôt, une preuve de conformité juridique complète.

État observé sur la branche :

- `rawDataStatus = NOT_PERSISTED_BY_CURRENT_BACKEND_SCHEMA` plutôt que fabrication de flux MAT/TAG bruts ;
- sorties ELI dérivées projetées sur une whitelist Guardian, avec variables internes retenues hors export ;
- baseline exposée uniquement comme métadonnées de cycle de vie, avec `metricsStatus = WITHHELD_PENDING_DISCLOSURE_AUTHORITY` ;
- les bornes `from` / `to` absentes peuvent rester ouvertes, mais une borne fournie invalide retourne `400 invalid_from` ou `400 invalid_to` ;
- `from > to` retourne `400 invalid_interval` avant toute lecture d'export, afin qu'un filtre malformé ne puisse pas élargir silencieusement le périmètre demandé ;
- JSON et CSV partagent les mêmes projections de publication.

## 5. Plan API web distinct

`apps/web/app/api/**` contient des Route Handlers Next.js pour Breiz, contact, journal, communauté, carte, races, contexte et administration. Ils ne sont pas montés dans l'application Hono et ne partagent pas automatiquement son middleware JWT/ownership.

Ces handlers constituent un plan runtime distinct. Toute route web qui simule une persistance ou une identité doit être évaluée séparément avant d'être promue comme autorité Product V1.

## 6. CI et niveau de preuve

Sur la branche de durcissement, le workflow P0 DB exécute réellement :

- migrations historiques et prérequis sur PostgreSQL jetable ;
- répétabilité de schéma ;
- génération/migration Drizzle isolée ;
- intégration AUTH-01 sur la baseline générée ;
- typecheck backend ;
- tests backend d'intégration.

Ce résultat est une preuve de code et de migration jetable. Il ne constitue pas une migration production, un déploiement, une validation scientifique ELI ni une autorisation de release.

## 7. Source du contrat

En l'absence d'OpenAPI versionné, les sources observées sont :

- `backend/api/index.ts` pour le montage et les middlewares ;
- `backend/api/routes/*` pour les routes ;
- `backend/api/middleware/*` pour l'authentification et l'autorisation ;
- `packages/shared/src` pour les schémas Zod partagés ;
- `backend/test` pour la couverture disponible ;
- `.github/workflows/*` pour la preuve CI exécutable.

Toute stabilisation du contrat nécessite un changement séparé avec tests de compatibilité, d'isolation et de migration.
