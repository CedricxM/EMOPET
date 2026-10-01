# EMOPET World Gamification Authority v0.1

**Status:** CONTROLLED DRAFT / NOT PRODUCTION AUTHORITY  
**Date:** 2026-10-01  
**Scope:** G1A authority + G1B ledger core + G1C quest projection + G1D build economy + G1E regional collections

## 1. Product decision

World is the only visible progression economy.

The gamified subject is the **Owner**, never the dog. World progression may reward deliberate Owner actions that already have their own product authority. It must not turn MAT, TAG, ELI, Care signals, dog activity, sleep, rest, wellbeing, inferred emotion, health, relationship quality, steps or measured distance into XP, rank, currency or progression.

This authority does not promote World to production authority and does not authorize release or merge by itself.

## 2. Allowed first-slice reward sources

The machine-readable authority is:

- `config/world/world-progression-authority-v1.json`

The initial bounded catalogue is:

| Event | Meaning | Reward |
|---|---|---|
| `knowledge.card_read` | Owner deliberately reads an educational card | Knowledge Fragments |
| `local.place_saved` | Owner deliberately saves a useful local place | Local Discoveries |
| `local.route_saved` | Owner deliberately saves/authors a route | Walk Traces + Local Discoveries |
| `community.contribution_created` | Owner deliberately creates a bounded Community contribution | Community Seeds |
| `world.group_joined` | Owner explicitly joins a World group | Community Seeds |
| `memory.created` | Owner deliberately creates a Memory | Memory Threads |

A saved-route reward is based on the explicit save/authorship action only. Distance, pace, steps, dog activity or sensor-derived completion must not change the reward.

## 3. Explicitly forbidden progression sources

The following families are fail-closed:

- ELI;
- sensor/MAT/TAG output;
- dog activity;
- sleep or rest;
- wellbeing;
- inferred emotion;
- health;
- relationship or bond scoring;
- steps or measured distance;
- popularity/ranking;
- caller-supplied reward amounts.

Unknown event kinds receive no reward.

## 4. Ledger contract

The server ledger core is implemented in:

- `backend/api/services/world-progression-ledger.ts`

Required properties:

1. reward amount is derived from the server-owned catalogue, never from caller input;
2. every event is Owner-scoped;
3. every event has a bounded source reference;
4. every event has an idempotency key;
5. a durable store must enforce uniqueness equivalent to `(owner_id, idempotency_key)`;
6. a replay of the same logical event is a no-op and returns the existing entry;
7. reuse of an idempotency key for a different logical event fails closed;
8. no arbitrary metadata payload is accepted by this first slice.

The checked-in in-memory store is **test/dev only** and throws in `NODE_ENV=production`.

## 5. Persistence gate

Durable PostgreSQL persistence is intentionally **not** added in this slice.

Reason: a new Owner-linked durable table requires synchronized privacy/export/erasure topology updates. Those files currently overlap the large Experience Hardening PR #224. Creating a migration in parallel would increase collision and privacy-regression risk.

G1B.2 may add durable persistence only after:

- the active migration prefix is rechecked;
- privacy subject lineage is updated;
- account erasure topology is updated;
- export coverage is updated where applicable;
- residue verification is updated;
- PostgreSQL integration tests prove idempotency and erasure behavior.

Until then, the ledger core is a controlled contract, not production storage authority.

## 6. UI gate

This slice does not modify `WorldBuilder`, `gamification.ts`, `feature-progress` or the legacy badge/level UI because PR #224 already touches those areas.

The next UI integration must consume the World progression contract rather than creating a second points economy.

## 7. Acceptance criteria for G1A/G1B core

- Owner is the only gamified subject.
- World is the only visible progression surface.
- Safe reward events are allow-listed.
- Dog/Care/ELI-derived reward families are deny-listed.
- Caller cannot submit reward quantities.
- Ledger semantics are idempotent and conflict-safe.
- In-memory implementation cannot become production authority accidentally.
- Backend tests guard the machine-readable authority.
- No migration, UI or active route is introduced by this slice.


## 8. G1C quest projection

The first quest projection is implemented in:

- `config/world/world-quest-catalog-v1.json`
- `backend/api/services/world-quest-projection.ts`

Quest progress is a read model over already-authorized ledger entries. It does not ingest Care, ELI, sensor or dog-performance inputs directly.

Anti-farming rules:

- only distinct `sourceRef` values count toward a quest;
- duplicate ledger rows do not increase progress;
- progress is capped at the quest target;
- completion grants no bonus resource in G1C;
- measured distance and dog activity do not participate.

The initial quest catalogue covers learning, local discovery, explicit saved routes, Community contribution, World group joining and deliberate Memories.

The UI remains intentionally untouched until the runtime source of truth and persistence gate are ready.


## 9. G1E regional collections

Regional collection authority is implemented in:

- `config/world/world-regional-collections-v1.json`
- `backend/api/services/world-regional-collections.ts`

The first regional identity is Brittany:

- coarse region code: `FR-BRE`;
- World identity: `Breiz`;
- theme: `world-bretagne`.

A `GLOBAL` collection is mandatory as the fallback.

Privacy and fairness boundary:

- region selection is explicit and coarse;
- exact coordinates are not accepted;
- street addresses are not accepted;
- geofences and passive location history are not accepted;
- entering or being physically present in a region grants no resources;
- unknown region codes fall back to `GLOBAL`;
- regional cosmetics spend only resources already earned through authorized Owner actions.

This means regional identity changes what the World can look like, not how valuable the Owner or dog is.


## 10. G1D deterministic build economy

The build projection is implemented in:

- `backend/api/services/world-build-economy.ts`

It takes an already-derived World resource balance, an owned-item set, a selected regional collection and an item id. It returns exactly one decision:

- `built`;
- `already_owned`;
- `unknown_item`;
- `insufficient_resources`.

Properties:

- successful build subtracts only the server-owned catalogue cost;
- an already-owned item spends nothing;
- insufficient resources spend nothing;
- an item outside the selected collection cannot be built;
- input balance and owned-item state are never mutated;
- duplicate owned ids are canonicalized.

This is a deterministic projection, not durable transaction authority.

G1B.2 must make the same decision atomically in PostgreSQL so concurrent requests cannot double-spend a balance or create duplicate ownership.


## 11. Unified gamification snapshot

The API-ready read model is implemented in:

- `backend/api/services/world-gamification-snapshot.ts`

It composes:

- safe World resource balances;
- ledger-derived quest progress;
- coarse regional identity;
- regional collection items;
- owned-item state;
- affordability.

It deliberately excludes XP, levels, ranks, streaks, dog scores, health scores, relationship scores, ELI values, sensor values and exact location.

This snapshot is the intended future UI/API seam. The web and Unity clients should consume one governed snapshot rather than independently recalculating progression rules.


## 12. G1B.2 persistence gate

The machine-readable persistence contract is:

- `config/world/world-progression-persistence-gate-v1.json`

Planned durable relations:

- `world_progression_events`;
- `world_owned_items`;
- `world_resource_spends`.

Required atomicity:

- reward replay is idempotent;
- conflicting idempotency reuse fails closed;
- build balance check, resource spend and item ownership occur in one database transaction;
- concurrent requests cannot create negative balances;
- concurrent requests cannot create duplicate ownership.

Production activation remains blocked until Owner-linked privacy topology is reconciled for:

- account erasure;
- subject discovery;
- residue verification;
- export disposition;
- retention/disposition.

The migration number is intentionally not reserved in this draft because the active migration sequence must be rechecked at implementation time.
