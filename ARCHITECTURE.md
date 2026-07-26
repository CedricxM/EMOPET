# EMOPET — Architecture logicielle

> Document de lecture rapide de l'architecture réelle du dépôt, sans revendication clinique.
> EMOPET fournit des observations et des tendances. Aucun diagnostic, aucune constante vitale.

Version : réécriture sur code réel, lot documentaire du 23 juillet 2026.
Autorité : le code fait foi. Toute divergence entre ce document et le code est un défaut à corriger ici.

## 1. Vue système

Deux sous-systèmes matériels, un moteur d'inférence, une chaîne applicative.

- **MAT** (surface de repos instrumentée) : référence physiologique au repos, meilleure interprétabilité, moins d'artefacts de mouvement.
- **TAG** (collier) : contexte mobile hors MAT (mouvement, orientation, contexte acoustique dérivé, localisation selon le mode). Le TAG contextualise, confirme, dégrade ou supprime. Il ne produit jamais seul une donnée physiologique.
- **ELI** : moteur probabiliste d'interprétation, avec gating de fiabilité et abstention.
- **Applications** : mobile (propriétaire), web (vitrine et prévisualisation), API.

Hors MAT, aucune conclusion physiologique fine n'est produite. Quand la qualité du signal baisse, l'interprétation est restreinte, jamais complétée.

## 2. Monorepo

Gestion : pnpm workspaces, orchestration Turborepo. Espaces déclarés : `packages/*`, `apps/*`, `backend`, `tools/*`.

```
apps/
  mobile/        React Native, Expo 52, expo-router 4, React Navigation 7, TanStack Query
  web/           Next.js 15, React 19, Tailwind 4, HeroUI, Mapbox GL
backend/
  api/           Hono 4 (routes, middleware, services)
  db/            Drizzle ORM (schema, migrations, seeds)
  test/          node:test
packages/
  shared/        types TypeScript et validateurs Zod, socle commun
  eli-engine/    EKF, RSM de fiabilité, confiance, baseline, vetoes, dynamics
  ble-protocol/  encodage et décodage de la trame binaire versionnée
  ai-personality/ gabarits de contenu Bleiz et garde-fous lexicaux
firmware/
  collar/main/   amorces DSP (tremor_detector, activity_variability)
  mat/main/      amorces DSP (rr_variability)
data/, docs/, scripts/
```

### Direction des dépendances

`shared` ne dépend de rien du dépôt. `eli-engine`, `ble-protocol` et `ai-personality` dépendent de `shared`. `backend` dépend de `shared` et `eli-engine`. Les applications dépendent des paquets, jamais l'inverse. Aucune dépendance ne remonte des applications vers les paquets.

## 3. Backend

- Framework : Hono 4, exécution Node via `@hono/node-server`, développement via `tsx watch`.
- Validation d'entrée : `@hono/zod-validator` avec les schémas de `@emopet/shared`.
- Persistance : Drizzle ORM sur PostgreSQL (`postgres`), migrations par Drizzle Kit.
- Authentification : JWT via `jose` (compatible edge). En-tête absent ou jeton invalide, réponse 401.
- Autorisation : `requireDogOwnership`. Un chien appartenant à un autre utilisateur renvoie 404, pas 403, afin de ne pas divulguer l'existence de la ressource.
- Limitation de débit : fenêtre fixe en mémoire côté API. Un magasin durable est requis en production (voir `SECURITY_CHECKLIST.md`).

Routes présentes : `auth`, `dogs`, `sensors`, `health`, `community`, `directory`, `feature-progress`.

État réel : les routes `sensors` (résumés, ELI, historique, baseline) sont des points d'entrée déclarés mais non implémentés (retours vides marqués TODO). La surface d'exposition ELI n'existe donc pas encore.

## 4. Moteur ELI

Le moteur implémente la discipline de fiabilité, il ne se contente pas de la documenter.

- **RSM** (`rsm/`) : machine d'états de fiabilité par capteur, VALID, DEGRADED, SUPPRESSED, avec hystérésis par séries successives. État initial DEGRADED, conservateur tant que la validité n'est pas établie.
- **Bruit d'observation** : multiplicateur 1,0 en VALID, 3,0 en DEGRADED, infini en SUPPRESSED. Un capteur supprimé est donc ignoré par la mise à jour, sans code conditionnel dispersé.
- **Confiance** (`confidence/`) : agrégation pondérée des états de fiabilité et de l'incertitude propre du modèle.
- **Gating** (`hooks/`) : décision PUBLISH, DEGRADE, REJECT, FLAG sur seuils de confiance. En DEGRADE, tendance seulement, aucun chiffre.
- **Baseline** (`baseline/`) : tant que les repères individuels ne sont pas établis, la sortie est forcée en DEGRADE quelle que soit la confiance capteur.
- **EKF** (`ekf/`) : transition d'état, modèle d'observation, mise à jour.
- **Vetoes** (`vetoes/`) et **dynamics** (`dynamics/`) : suppressions contextuelles, suivi de récupération et d'anticipation.

Les seuils actuels sont provisoires. Ils n'ont pas été calibrés sur données de banc réelles (voir `AUDIT.md`, point D6).

## 5. Variables latentes et surface publiée

`ELIState` porte des variables internes (`arousal`, `valence`, `load`, `confidence`, `gateStatus`, `sensorReliability`). La projection vers l'affichage se fait par `eliToDisplay` dans `packages/shared/src/types/eli.ts` et produit uniquement : statut de gate, libellé non émotionnel, valeur ELI, bande d'incertitude, points de confiance, explication, suggestion.

`arousal`, `valence` et `peak_arousal` sont des variables latentes internes. Elles ne sont jamais exposées à l'utilisateur, ni dans une réponse d'API publique, ni dans un rendu, ni dans un export. Règle formalisée par `docs/architecture/ADR-0001-variables-affectives-latentes.md` et vérifiée par `backend/test/contract-affective-exposure.test.mjs`.

## 6. Protocole BLE

`packages/ble-protocol` définit une trame binaire : en-tête, version de protocole, source, numéro de séquence roulant, horodatage, charge utile, contrôle d'intégrité. Le décodage valide en-tête, version, source, longueur et intégrité.

Propriété structurante : la trame transporte l'état de fiabilité par capteur (PVDF, cellules de charge, IMU, microphone, piézo) ainsi qu'une qualité d'orientation du collier. L'invariant « aucun indicateur ne circule sans son état de fiabilité » est donc porté au niveau du lien, pas seulement au niveau applicatif.

Le contrôle d'intégrité actuel est un XOR simple. Renforcement identifié dans `AUDIT.md` (point D5), hors périmètre du lot documentaire.

## 7. Firmware

`firmware/collar` et `firmware/mat` contiennent des amorces de traitement (détection de tremblements, variabilité d'activité, variabilité respiratoire). Il n'existe ni machine d'états de cycle de vie, ni pile BLE, ni boucle d'acquisition, ni provisioning. Les chapitres firmware des documents TAG relèvent donc, à ce jour, de la documentation et non du code.

## 8. Flux de données

1. Acquisition capteurs (MAT, TAG), avec état de fiabilité produit au plus près du capteur.
2. Transport BLE en trames versionnées, séquencées, contrôlées en intégrité.
3. Ingestion API après validation Zod et contrôle de propriété du chien.
4. Inférence ELI : RSM, EKF, confiance, baseline, vetoes.
5. Gating : PUBLISH, DEGRADE, REJECT.
6. Projection d'affichage : jamais de variable latente, toujours une bande d'incertitude et un niveau de confiance.

## 9. Conventions

- Distinguer observé, déclaré et interprété.
- Aucune sortie utilisateur ne contient de terme pathologique, de diagnostic ou d'étiquette émotionnelle.
- Quand la qualité baisse : neutralité, amortissement de confiance, message prudent. Jamais de complétion silencieuse.
- Les seuils non calibrés sont désignés comme provisoires partout où ils apparaissent.
- Toute décision d'architecture structurante donne lieu à un ADR dans `docs/architecture/`.
