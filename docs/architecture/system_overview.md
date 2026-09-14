# EMOPET — Vue système observée

Ce document complète `ARCHITECTURE.md` avec un flux de lecture court. Il décrit le dépôt au 2026-08-29 sans revendiquer de maturité produit, scientifique, clinique ou de production.

Le diagramme `docs/architecture/data_flow_diagram.png` décrit l'ancienne architecture Python/FastAPI et doit être traité comme historique, pas comme le diagramme du runtime actuel.

## 1. Topologie actuelle

```text
Application web Next.js ── Route Handlers Next ── JSON .data / replis navigateur
          │
          └─────────────── packages TypeScript partagés

Application Expo ───────── packages ELI / BLE / types ───────── MAT/TAG partiels
          │
          └─────────────── client HTTP prévu pour le backend

Backend Hono ───────────── Drizzle / Postgres.js ─────────────── PostgreSQL
          └─────────────── stores mémoire pour certains prototypes

Unity : ABSENT / GATED
Nakama : ABSENT / GATED
```

Ces lignes représentent plusieurs plans d'exécution et de persistance. Elles ne forment pas encore un contrat unifié.

## 2. Composants

| Composant | Chemins observés | Responsabilité actuelle |
|---|---|---|
| Web | `apps/web/app`, `apps/web/components`, `apps/web/lib` | Interface Next.js, Route Handlers et prototypes de données |
| Mobile | `apps/mobile` | Client Expo/React Native, services HTTP et BLE |
| Backend | `backend/api` | API Hono, validation, middleware JWT et contrôle propriétaire partiel |
| Données | `backend/db` | Schémas Drizzle, migrations incomplètes et seeds PostgreSQL |
| Types | `packages/shared` | Types, constantes et validateurs Zod partagés |
| Inférence | `packages/eli-engine` | Baselines, confiance, dynamique et vetoes |
| Transport | `packages/ble-protocol` | Trames et commandes MAT/TAG |
| Contenu | `packages/ai-personality` | Templates Breiz et garde-fous de contenu |
| Firmware | `firmware` | Sources embarquées partielles, sans build complet observé |

## 3. Flux capteur prévu et état observé

1. Les composants MAT/TAG produisent des signaux ; le package BLE définit des trames de transport.
2. Le mobile transforme les données en contrats TypeScript, notamment des résumés et caractéristiques dérivées.
3. `POST /api/sensors/summaries` valide un résumé et vérifie l'accès au chien.
4. La persistance de ce résumé est encore TODO dans la route active.
5. Les routes de lecture ELI/baseline/historique renvoient encore des placeholders.

Le moteur ELI et ses tests sont du code observé, pas une preuve de validation scientifique ou de produit fini.

## 4. Plans de données

### PostgreSQL / Drizzle

Direction durable prévue pour les utilisateurs, chiens, appareils, résumés capteurs, états ELI, communauté, datasets et contenus. La chaîne de migrations ne constitue pas encore une baseline applicable sur base vide.

### Route Handlers Next.js

Les handlers `apps/web/app/api/**` couvrent notamment le journal, la carte, la communauté, le contact, Breiz et l'administration. `apps/web/lib/server/store.ts` peut écrire des collections JSON sous `.data`.

### Mémoire du backend

Certains services conservent présence, consentements, waitlist, règles communautaires, rapports ou blocages dans la mémoire du processus.

### Navigateur

Plusieurs clients web ont des replis localStorage/sessionStorage et des identifiants prototype. Ces valeurs ne constituent pas une identité de propriétaire contrôlée.

## 5. Frontières de sécurité et de confidentialité

- le backend doit rester l'autorité de politique pour les ressources protégées ;
- les clients ne doivent pas décider de l'identité, du rôle ou de la propriété ;
- les routes Next.js séparées ne bénéficient pas implicitement du middleware Hono ;
- les contrats observés utilisent des comptes/énergies vocales dérivés, pas des fichiers audio ;
- l'absence de permission micro mobile est un signal positif, mais pas un test négatif de bout en bout ;
- la localisation et la télémétrie nécessitent finalité, consentement, minimisation, rétention et suppression contrôlés ;
- toute sortie reste non diagnostique et ne doit pas attribuer d'émotion humaine au chien.

## 6. Limites et décisions ouvertes

- cycle d'identité et d'authentification ;
- baseline/upgrade/rollback PostgreSQL ;
- migration ou quarantaine du plan JSON/localStorage ;
- contrat API versionné ;
- consentements privés par défaut ;
- preuve de non-rétention/transmission audio ;
- CI, protection de branche et propriété du déploiement ;
- activation éventuelle de Unity et Nakama.

Ces sujets restent `OPEN`, `BLOCKED` ou `GATED` selon `ARCHITECTURE.md` ; cette vue ne change aucun statut.
