# P0 COMMUNITY DATA-PLANE RECONCILIATION

Status: `DRAFT / CANDIDATE ARCHITECTURE / NOT RUNTIME ACTIVATION / NOT RELEASE AUTHORITY`

Parent gate: `COMMUNITY-API-01` #98  
Base candidate: draft PR #102 (`fix/community-hono-no-false-ack`)  
Snapshot evidence boundary: `main@c099581ff8aed1e619f72ab38898fc05833b7c66`

## 1. Purpose

This record resolves the current Community **architecture ambiguity** far enough to define a controlled migration direction without pretending that Product V1 persistence already exists.

It does not activate a new data plane, migrate content, merge PR #102, close PRIV-01, or authorize production Community behavior.

The repository currently contains two independently implemented `/api/community/*` families:

1. a web-origin Next.js route-handler plane backed by local JSON files under `.data`;
2. the protected Hono backend plane, which has canonical PostgreSQL schemas but no current UGC writer/read authority.

These planes must not continue to be described as one API merely because their URLs look similar.

---

## 2. Observed plane A — Next.js web prototype

### 2.1 Runtime/storage

`apps/web/app/api/community/posts/route.ts` uses:

- Next.js Route Handlers;
- `collection<T>()` from `apps/web/lib/server/store.ts`;
- the local file-backed collection `community-posts`;
- server-side JSON persistence under `.data`;
- seeded demo posts via `INITIAL_POSTS` when the collection is empty.

The store implementation explicitly says:

- it is a server-side JSON-file persistence layer;
- it is intended to be replaceable by Drizzle/Postgres;
- in serverless production, the file does not persist and must be replaced by Postgres.

Therefore:

`NEXT_COMMUNITY_STORAGE_CLASS = WEB_PROTOTYPE_FILE_STORE`

It is not acceptable as durable Product V1 authority solely because it survives some local multi-session use.

### 2.2 Current web client dependency

`apps/web/app/quartier/CommunitySection.tsx` calls the web-origin endpoints directly, including:

- `GET /api/community/posts`;
- `POST /api/community/posts`;
- `GET /api/community/events`;
- related post/reply/flag surfaces.

This means the currently functioning Community UI is coupled to plane A, not to the Hono backend.

### 2.3 Demo-data contamination risk

The posts route calls `listSeeded()`, which inserts `INITIAL_POSTS` into the server-side file store when empty.

Those records are useful demo content, but they must not silently become migrated Product V1 user-generated records or evidence of real Guardian activity.

Candidate classification:

`NEXT_COMMUNITY_SEED_CONTENT = DEMO_ONLY / DO_NOT_MIGRATE_AS_USER_DATA`

### 2.4 Identity boundary

The web post route accepts presentation-level author input and sanitizes a display name. It does not establish the same canonical authenticated `users.id` authorship model represented by the PostgreSQL Community schema.

A display name is not a durable author principal.

---

## 3. Observed plane B — Hono backend candidate

### 3.1 Runtime/auth boundary

The active backend stack is Hono + TypeScript + Drizzle/PostgreSQL. Protected `/api/*` routes pass through the backend authentication middleware, and Community creation has its own rules/moderation guards.

PR #102 makes the current Hono UGC routes truthful by returning explicit `501` responses instead of false creation ACKs while no writer exists.

Candidate classification after #102:

`HONO_COMMUNITY_WRITE_TRUTH = FAIL_CLOSED_CANDIDATE`

This is not persistence readiness.

### 3.2 Durable schema already exists

`backend/db/schema/community.ts` defines PostgreSQL tables for:

- `communities`;
- `community_members`;
- `posts`;
- `comments`;
- `community_events`;
- `copresence_events`.

The durable relational model uses canonical UUID references for key human Community relationships:

- `communities.created_by -> users.id`;
- `community_members.user_id -> users.id`;
- `posts.author_id -> users.id`;
- `comments.author_id -> users.id`;
- `community_events.created_by -> users.id`.

Schema presence does not prove runtime persistence, but it does provide a materially stronger candidate boundary for canonical identity, ownership and lifecycle reconciliation than the web JSON store.

### 3.3 Remaining schema debt

`copresence_events.dog_a_id` and `dog_b_id` are UUID-typed but are not currently declared as foreign keys to core dogs in this schema. Their identity/erasure integrity remains separately relevant to ID-01/PRIV-01.

Do not promote copresence authority merely because the table exists.

---

## 4. Candidate Product V1 authority direction

Subject to Product/Engineering/Privacy review, the recommended candidate direction is:

> **Hono + PostgreSQL becomes the single durable Community data authority. The Next.js Community route-handler/file-store plane remains an explicitly bounded prototype until web clients are migrated, then is retired rather than dual-written.**

Reasoning:

1. the repository's observed backend authority is Hono/Drizzle/PostgreSQL;
2. the Next.js store itself documents that it is not durable in serverless production;
3. PostgreSQL already contains the canonical user-linked Community entity model;
4. PRIV-01 discovery/erasure cannot be authoritative across an unbounded JSON side-store plus SQL without explicit identity mapping;
5. two same-looking route families with independent moderation, auth and persistence semantics are a recurring integration hazard;
6. introducing dual-write would create conflict, retry and erasure complexity before either plane has a controlled migration contract.

This is a **candidate architecture**, not Founder/Product approval.

`COMMUNITY_AUTHORITY_CANDIDATE = HONO_POSTGRES`

`NEXTJS_COMMUNITY_ROLE_CANDIDATE = PROTOTYPE_ONLY -> RETIRE_AFTER_MIGRATION`

`DUAL_WRITE = PROHIBITED_CANDIDATE`

---

## 5. Required convergence sequence

### COMMUNITY-PLANE-G1 — Preserve Hono truth boundary

Prerequisite candidate: PR #102.

Until Hono persistence exists, creation must fail honestly rather than ACK discarded content.

Status: `CANDIDATE PASS / UNMERGED / GLOBAL RELEASE BLOCKERS REMAIN`

### COMMUNITY-PLANE-G2 — Canonical principal and membership contract

Before a writer is added, define and test:

- canonical authenticated `users.id` authorship;
- community membership required for applicable actions;
- creator/moderator/referent authority;
- cross-user negative cases;
- post/comment/event ownership rules;
- blocked-user/report relationships.

Do not translate a web display name into canonical authorship by assumption.

Status: `OPEN`

### COMMUNITY-PLANE-G3 — Durable Hono writer/read-after-write

Implement the smallest durable vertical slice only after G2:

1. create one Community content type through Hono;
2. persist to PostgreSQL;
3. return canonical ID only after persistence succeeds;
4. read it back through the same authoritative Hono plane;
5. prove author/community binding;
6. prove retry/idempotency semantics where required;
7. distinguish source failure from true no-data.

Do not implement posts/comments/events all at once merely for route parity.

Status: `OPEN`

### COMMUNITY-PLANE-G4 — Web client adapter/migration

Once one Hono vertical slice is authoritative:

- make the web client consume the Hono-backed contract through a controlled adapter/proxy as appropriate;
- preserve one auth/authorization truth;
- remove local-file fallback for that migrated surface;
- do not silently fall back to JSON if Hono is unavailable;
- expose explicit unavailable/demo state where necessary.

Status: `OPEN`

### COMMUNITY-PLANE-G5 — Demo seed separation

Before migration:

- classify `INITIAL_POSTS` and other seeded Community content as demo fixtures;
- never bulk-import them as real user-authored records;
- preserve demo capability only in explicitly demo/test contexts;
- ensure production empty-state behavior does not auto-create fake UGC.

Status: `OPEN`

### COMMUNITY-PLANE-G6 — Next.js plane retirement

After functional parity for a migrated surface:

- stop writes to the corresponding JSON collection;
- remove/retire overlapping route-handler authority;
- remove ambiguous documentation claiming server-file persistence as product authority;
- preserve only explicitly needed demo fixtures/test helpers;
- prove no client still targets the retired route semantics.

Status: `OPEN`

### COMMUNITY-PLANE-G7 — Privacy lifecycle

Reconcile the final authoritative records with PRIV-01:

- posts/comments/events;
- memberships;
- reports/blocks/moderation evidence;
- media/object references;
- community creator identity;
- deletion versus anonymisation rules;
- retention and backup behavior;
- subject discovery under #81/#82.

No blanket cascade may be invented before policy authority exists.

Status: `OPEN`

### COMMUNITY-PLANE-G8 — Controlled authority decision

Required reviewers/authority:

- Product/Founder;
- Backend/Engineering;
- Privacy/Security;
- UX where web migration affects visible behavior.

Final disposition:

`GO_HONO_POSTGRES | REMEDIATE | HOLD`

Status: `OPEN`

---

## 6. Explicit STOP conditions

STOP rather than implement if a proposed patch would require any of the following without prior authority:

- inventing Community membership/role permissions;
- treating a display name as canonical user identity;
- importing demo seeds as real UGC;
- running simultaneous JSON + PostgreSQL writes;
- choosing deletion/anonymisation behavior;
- publishing household-level precise location;
- assuming report/block in-memory stores are durable moderation evidence;
- claiming Hono persistence merely because tables exist;
- turning a temporary web prototype into production authority by documentation alone.

---

## 7. Relationship to existing gates

- #98 remains the parent Community data-plane gate.
- #102 is the functionally validated Hono no-false-ACK candidate and remains unmerged.
- #69 PRIV-01 owns retention/erasure/privacy authority.
- #81/#82 own subject-discovery evidence.
- #70/#71 own canonical shared entity identity direction.
- #75/#76 own canonical authentication/session authority.
- #101/#105/#106 remain repository-wide dependency blockers.
- #74 remains the CodeQL coverage gap.

---

## 8. Current disposition

`HONO_POSTGRES_AS_DURABLE_COMMUNITY_AUTHORITY = CANDIDATE`

`NEXTJS_JSON_COMMUNITY_AS_PRODUCT_V1_AUTHORITY = HOLD`

`DUAL_WRITE = HOLD`

`DEMO_SEED_MIGRATION_AS_REAL_UGC = PROHIBITED_CANDIDATE`

`G-COMMUNITY-DATA-PLANE-01 = OPEN`

No runtime migration, deletion, production activation or merge is authorized by this document.
