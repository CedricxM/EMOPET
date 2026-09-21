# PRIV-SEC audit sink discovery — 2026-09-21

Status: **DISCOVERY RECORD / NO SINK SELECTED / NO MIGRATION AUTHORIZED / NO RETENTION PROMOTED**

Parent: #198  
Security umbrella: #154  
Canonical audit event/composition: #426 / PRIV-S4  
Migration-ledger authority: #258 Model A  
Privacy/retention authority: #69

## 1. Purpose

This record answers the repository-discovery portion of PRIV-SEC-AUDIT-SINK-DISC-01 without selecting a production sink, inventing retention, claiming database immutability or activating privileged audit emission.

The canonical `security-audit-v1` event exists and is composable from privileged authorization decisions. That is **not** the same thing as a durable audit trail.

## 2. Discovery vocabulary

- `PRESENT_REPOSITORY_CANDIDATE` — durable mechanism exists in the repository and can technically host a future controlled implementation.
- `ABSENT` — repository inspection found no implementation.
- `PLACEHOLDER_ONLY` — name/config placeholder exists but no runtime integration was found.
- `EXTERNAL_UNVERIFIED` — property would require real provider/database configuration evidence.
- `POLICY_REQUIRED` — engineering cannot select the value safely.
- `CANDIDATE_NOT_FINAL` — product candidate exists but privacy/legal/operational authority is not final.

## 3. SINK-DISC-G1 — persistence inventory

| Candidate | Status | Repository evidence | Current conclusion |
|---|---|---|---|
| PostgreSQL / Drizzle | `PRESENT_REPOSITORY_CANDIDATE` | `backend/db/index.ts`, `backend/db/schema/index.ts`, `backend/db/drizzle.config.ts` | Only repository-controlled durable persistence candidate currently implemented |
| Dedicated security-audit table | `ABSENT` | no `pgTable` / schema module matching audit/security-event/access-log store | No durable `security-audit-v1` store exists |
| Sentry | `PLACEHOLDER_ONLY` | `SENTRY_DSN` appears in env/rotation docs; no Sentry package/runtime integration | Must not be treated as an audit sink |
| PostHog | `PLACEHOLDER_ONLY` | `POSTHOG_API_KEY` appears in env/rotation docs; no PostHog package/runtime integration | Must not be treated as an audit sink |
| Pino / Winston / OpenTelemetry / Datadog | `ABSENT` | no active backend dependency/integration found | No repository logging/observability authority |
| Free-form console/application logs | `ABSENT_AS_CONTROLLED_SINK` | no bounded security-audit logging pipeline | Must not become the durable authority |

**Discovery result:** PostgreSQL is the smallest repository-controlled durable candidate, but **this record does not select it**.

## 4. SINK-DISC-G2 — smallest repository-owned schema placement if PostgreSQL is selected later

A future PostgreSQL implementation should use a **dedicated audit schema module/table**, not product tables and not free-form application logs.

Smallest repository-owned placement:

- candidate schema module: `backend/db/schema/security-audit.ts`;
- export point: `backend/db/schema/index.ts`;
- controlled SQL migration: `backend/db/migrations/<promotion-order>_...` only at promotion time.

Migration numbering is governed by #258 Model A:

- allocate against then-current `main`;
- active prefixes remain unique and contiguous;
- historical/frozen numbers are provenance identifiers, not reserved execution slots;
- replay provenance must be preserved where applicable;
- discovery does **not** allocate a migration number or authorize an existing-database upgrade.

Status: `PLACEMENT_IDENTIFIED / SINK_SELECTION_REQUIRED_BEFORE_IMPLEMENTATION`.

## 5. SINK-DISC-G3 — write authority

Current backend database access uses one shared `DATABASE_URL` in `backend/db/index.ts`.

Repository code can eventually prove that one repository function:
- accepts only canonical `security-audit-v1`;
- performs INSERT only;
- exposes no application UPDATE/DELETE method.

That would prove **application-level insert-only behavior only**.

It would **not** prove:
- the PostgreSQL principal cannot UPDATE or DELETE historical rows;
- another process using the same `DATABASE_URL` lacks mutation rights;
- provider/admin credentials cannot alter the table.

No repository SQL defining a dedicated INSERT-only DB role, `GRANT INSERT`, or UPDATE/DELETE revocation was found.

Status:

- application insert-only API: `FUTURE_REPOSITORY_ENFORCEABLE`;
- database-principal append-only authority: `EXTERNAL_UNVERIFIED / DB_CONFIGURATION_REQUIRED`.

## 6. SINK-DISC-G4 — integrity authority

### Already provable in repository

`security-audit-v1` provides a strongly bounded event envelope:

- finite schema version;
- finite event types;
- canonical UTC timestamp parsing;
- bounded actor classes;
- canonical privileged role/action vocabulary;
- bounded target scope/ref;
- finite outcome/reason combinations;
- exact-key parsing with no free-form metadata.

The composition layer:
- is pure;
- performs no I/O;
- reads no system clock;
- requires the caller to supply occurrence time;
- preserves verified RBAC-denial identity;
- keeps invalid-token denial anonymous;
- validates the final event through the canonical parser.

### Not currently provable

The event contract currently contains no repository-owned:
- immutable event identifier;
- predecessor/hash-chain field;
- cryptographic receipt;
- signed checkpoint;
- append-only DB-role evidence;
- external WORM/tamper-evident storage evidence.

Therefore:

`CANONICAL_EVENT_INTEGRITY = PRESENT`  
`DURABLE_HISTORY_IMMUTABILITY = NOT_ESTABLISHED`  
`TAMPER_EVIDENCE = NOT_ESTABLISHED`

Do not use “immutable”, “append-only” or “tamper-proof” for a future sink until executable evidence exists.

## 7. SINK-DISC-G5 — read/access authority

The current finite privileged action vocabulary contains:
- account/support reads;
- security incident read/coordinate;
- moderation/contact/admin-data actions.

It does **not** contain a dedicated security-audit-history read action.

`security.incident.read` must not be silently reinterpreted as unrestricted audit-log access.

A future durable audit store therefore needs an explicit bounded read-authority decision before any query route is exposed. The implementation should not create a general-purpose admin data plane merely because a table exists.

Status: `POLICY_REQUIRED / NO AUDIT HISTORY READ ACTION SELECTED`.

## 8. SINK-DISC-G6 — retention authority

`config/privacy/retention-schedule.json` currently contains a **product candidate**:

- `security_auth_logs`: 12-month rolling candidate;
- `incident_evidence`: 24 months after incident closure candidate.

But the same schedule explicitly states:

- `PRODUCT_APPROVED_CANDIDATE_LEGAL_PRIVACY_SIGNOFF_PENDING`;
- `runtimeEnforcement = NOT_IMPLEMENTED`.

Therefore the repository has a policy candidate, not final security-audit retention authority.

Status: `CANDIDATE_NOT_FINAL`.

A sink implementation must not hard-code 12 or 24 months merely because those candidate values exist.

## 9. SINK-DISC-G7 — failure semantics

No authoritative decision currently defines what a privileged request must do when durable audit persistence is unavailable.

Relevant choices have materially different security/availability consequences, for example:

- fail the privileged operation closed if required audit persistence cannot commit;
- allow selected lower-risk reads while denying destructive/high-risk actions;
- use a separately controlled local/durable spool and publish only after acknowledgement;
- another bounded policy with explicit evidence.

This record deliberately chooses none of them.

Status: **`HUMAN SECURITY/OPERATIONS DECISION REQUIRED`**.

No route should silently drop required security evidence and call the operation successfully audited.

## 10. SINK-DISC-G8 — data minimisation

The canonical event is already intentionally narrow.

It does not accept arbitrary extra top-level metadata and does not carry:
- bearer/session tokens;
- JWT/MFA secrets;
- raw request/response bodies;
- IP addresses;
- user-agent fingerprints;
- email/contact fields;
- free-form operator notes;
- arbitrary nested metadata.

Any durable sink must persist the canonical bounded event or a stricter representation, not widen it opportunistically.

Status: `REPOSITORY_BOUNDARY_PRESENT`.

## 11. Decision table

| Question | Discovery result | Human/external authority still needed? |
|---|---|---:|
| Is there a durable repository candidate? | PostgreSQL/Drizzle only | Yes, sink selection |
| Is there already an audit table? | No | Implementation after selection |
| Where would a PG schema live? | dedicated `security-audit.ts` + Model A migration | No further discovery |
| Can app code be insert-only? | Yes, enforceable/testable | No |
| Can current DB principal be proven insert-only? | No | Yes, DB/provider config |
| Is canonical event minimised? | Yes | No |
| Is durable tamper evidence present? | No | Yes, architecture/config/evidence |
| Is audit-history read authority defined? | No | Yes |
| Is retention final? | No, candidate only | Yes |
| Are sink-failure semantics defined? | No | **Yes** |
| Are external observability sinks active? | No | Provider decision if desired |

## 12. Next smallest enforceable implementation slice

Only **after** a sink and failure/read/retention policy boundary is explicitly authorized, the smallest PostgreSQL-oriented implementation slice would be:

1. dedicated bounded audit table matching `security-audit-v1` plus an immutable repository event id;
2. Model-A migration allocated against current `main` at promotion time;
3. repository service accepting only parsed canonical events;
4. INSERT-only application API with no update/delete methods;
5. integration tests proving canonical persistence, rejection of widened metadata, transactional failure truth and read non-exposure;
6. no public/admin audit-history route unless a dedicated finite action is separately approved;
7. DB-role immutability kept `EXTERNAL_UNVERIFIED` until real GRANT/REVOKE/provider evidence exists.

This discovery record does **not** authorize that slice.

## 13. Gate status

- SINK-DISC-G1: **DISCOVERED**
- SINK-DISC-G2: **DISCOVERED**
- SINK-DISC-G3: **DISCOVERED / DB-role authority external**
- SINK-DISC-G4: **DISCOVERED / durable integrity unresolved**
- SINK-DISC-G5: **POLICY_REQUIRED**
- SINK-DISC-G6: **CANDIDATE_NOT_FINAL**
- SINK-DISC-G7: **HUMAN DECISION REQUIRED**
- SINK-DISC-G8: **DISCOVERED**

`G-PRIV-SEC-AUDIT-SINK-DISC-01 = DISCOVERY SUBSTANTIALLY COMPLETE / SINK+READ+RETENTION+FAILURE+DB-ROLE AUTHORITY OPEN`
