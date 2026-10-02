# EMOPET — Vue système observée

Ce document complète `ARCHITECTURE.md` avec un flux de lecture court. Il a été réconcilié avec le dépôt courant le 2026-10-02 sans revendiquer de maturité produit, scientifique, clinique ou de production.

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

Unity World spike ── Hono `/api/world-spike` ── Nakama isolé sous `infra/nakama`
Statut World : loopback live validé / `GATED / NOT PRODUCTION AUTHORITY`
```

Ces lignes représentent plusieurs plans d'exécution et de persistance. Elles ne forment pas encore un contrat unifié.

## 2. Composants

| Composant | Chemins observés | Responsabilité actuelle |
|---|---|---|
| Web | `apps/web/app`, `apps/web/components`, `apps/web/lib` | Interface Next.js, Route Handlers et prototypes de données |
| Mobile | `apps/mobile` | Client Expo/React Native, services HTTP et BLE |
| Backend | `backend/api` | API Hono, cycle d'identité, validation, middleware JWT et contrôles owner-scoped |
| Données | `backend/db` | Schémas Drizzle, migrations/seeds PostgreSQL ; baseline validée sur bases jetables, sans autorité de migration production |
| Types | `packages/shared` | Types, constantes et validateurs Zod partagés |
| Inférence | `packages/eli-engine` | Baselines, confiance, dynamique et vetoes |
| Transport | `packages/ble-protocol` | Trames et commandes MAT/TAG |
| Contenu | `packages/ai-personality` | Templates Breiz et garde-fous de contenu |
| Firmware | `firmware` | Sources embarquées partielles, sans build complet observé |

## 3. Flux capteur prévu et état observé

1. Les composants MAT/TAG produisent des signaux ; le package BLE définit des trames de transport.
2. Le mobile transforme les données en contrats TypeScript, notamment des résumés et caractéristiques dérivées.
3. `POST /api/sensors/summaries` valide un résumé et vérifie l'accès au chien.
4. Le résumé est persisté dans PostgreSQL avec provenance `ingestionId` + `deviceId`, liaison dog/source et retry idempotent.
5. Les lectures ELI génériques et baseline restent explicitement fail-closed tant qu'aucun producteur/projection autoritatif n'est câblé.

Le moteur ELI et ses tests sont du code observé, pas une preuve de validation scientifique ou de produit fini.

## 4. Plans de données

### PostgreSQL / Drizzle

PostgreSQL/Drizzle est déjà le plan durable de plusieurs parcours utilisateurs, chiens, appareils, résumés capteurs, communauté et journal. La baseline est validée sur des bases jetables ; cela ne constitue ni une migration d'une base de production existante ni une autorité de release.

### Route Handlers Next.js

Les handlers `apps/web/app/api/**` couvrent notamment le journal, la carte, la communauté, le contact, Breiz et l'administration. `apps/web/lib/server/store.ts` peut écrire des collections JSON sous `.data`.

### Mémoire du backend

Certains services conservent présence, consentements, waitlist, règles communautaires, rapports ou blocages dans la mémoire du processus.

### Navigateur

Plusieurs clients web ont des replis localStorage/sessionStorage et des identifiants prototype. Ces valeurs ne sont pas une identité Owner contrôlée.

## 5. Frontières de sécurité et de confidentialité

- le backend doit rester l'autorité de politique pour les ressources protégées ;
- les clients ne doivent pas décider de l'identité, du rôle ou de la propriété ;
- les routes Next.js séparées ne bénéficient pas implicitement du middleware Hono ;
- les contrats observés utilisent des comptes/énergies vocales dérivés, pas des fichiers audio ;
- l'absence de permission micro mobile est un signal positif, mais pas un test négatif de bout en bout ;
- la localisation et la télémétrie nécessitent finalité, consentement, minimisation, rétention et suppression contrôlés ;
- toute sortie reste non diagnostique et ne doit pas attribuer d'émotion humaine au chien.

## 6. Limites et décisions ouvertes

- livraison e-mail production, rollout des comptes legacy et récupération de compte ;
- upgrade/rollback et backup/restore PostgreSQL avec preuves d'exploitation ;
- migration ou quarantaine du plan JSON/localStorage ;
- contrat API versionné ;
- consentements privés par défaut ;
- preuve de non-rétention/transmission audio ;
- CI, protection de branche et propriété du déploiement ;
- éventuelle promotion du spike Unity/Nakama vers une autorité World de production.

Ces sujets restent `OPEN`, `BLOCKED` ou `GATED` selon `ARCHITECTURE.md` ; cette vue ne change aucun statut.
