# PRIV-SEC audit sink / integrity / retention discovery

Status: `DISCOVERY_COMPLETE_WITH_BLOCKERS`

Issue: #198  
Parent readiness gate: #154 / `PRIV-SEC-G4`

This record inventories repository evidence for a future durable `security-audit-v1` sink. It does **not** authorize a database migration, select a retention period, prove database immutability, wire production audit emission, or claim that PRIV-SEC-G4 is closed.

## 1. Inputs already established by candidate security work

The canonical candidate chain now separates three concerns:

- #193 defines and validates the bounded `security-audit-v1` event shape;
- #197 composes canonical privileged authorization evidence into that event shape and is a parallel leaf on #193;
- neither candidate persists the event or proves storage integrity/retention.

The sink boundary must therefore consume already validated audit events rather than invent a second actor/action/target vocabulary.

## 2. Repository persistence inventory

### 2.1 PostgreSQL / Drizzle is the only identified general durable relational substrate

`backend/db/index.ts` creates one Postgres.js client from one `DATABASE_URL` and exposes one Drizzle `db` instance with the full schema.

Observed consequence:

- repository code currently does **not** prove a separate database principal for audit writes;
- repository code currently does **not** prove a separate read-only/security-review database principal;
- omitting `update()` / `delete()` methods from a future TypeScript repository would not prove that the underlying database credential is unable to modify history.

State:

`POSTGRES_DURABLE_SUBSTRATE = PRESENT`

`DEDICATED_AUDIT_DB_PRINCIPAL = NOT_FOUND`

`DB_ROLE_LEVEL_APPEND_ONLY_AUTHORITY = EXTERNAL_UNVERIFIED`

### 2.2 Current schema has no dedicated audit store

`backend/db/schema/index.ts` exports the current user, dog, sensor, community, AI, dataset, freemium and ELI-v5 schema modules. Repository search found no dedicated `audit_*`, `security_event*` or `access_log*` table on current main.

State:

`DEDICATED_SECURITY_AUDIT_TABLE = ABSENT`

### 2.3 No dedicated security logging / SIEM sink was identified

Repository search did not identify a dedicated audit logger or a provider-specific security event sink. Plain application output must not be promoted to an audit trail by inference.

State:

`DEDICATED_SECURITY_LOGGING_SINK = ABSENT_OR_NOT_REPRESENTED`

`EXTERNAL_SIEM_AUTHORITY = EXTERNAL_UNVERIFIED`

## 3. Migration authority is currently blocked

The active SQL migration directory contains the historical `0001`–`0004` sequence.

`backend/db/baseline-draft/README.md` explicitly records that this active sequence is not a complete fresh-database baseline by itself. The candidate `0000` reconstruction remains outside active migrations and the repository states:

`BLOCKED_MIGRATION_BASELINE_AUTHORITY`

`POSTGRES EXECUTION QA = PENDING` in that README's current-main record.

Historical PR #3 separately recorded successful disposable PostgreSQL 16 reconstruction evidence, but also retained the unresolved authority question: whether an existing persistent EMOPET database/schema/data set must be preserved. PR #3 was closed without merge and does not itself authorize promotion of a new active migration.

Therefore this discovery does **not** create `0005_security_audit.sql` or any equivalent active migration.

State:

`NEW_ACTIVE_AUDIT_MIGRATION = BLOCKED_MIGRATION_BASELINE_AUTHORITY`

Required authority before active migration promotion:

- `NO_EXISTING_DB_TO_PRESERVE`; or
- `EXISTING_DB_MUST_BE_PRESERVED` plus schema-only evidence and an upgrade-safe reconciliation path.

## 4. Integrity boundary

The repository can eventually prove application-level properties such as:

- only canonical `security-audit-v1` events are accepted by the audit repository boundary;
- deterministic canonical serialization;
- generated immutable event identifiers at insertion time;
- an application API that exposes insert/query operations but no ordinary update/delete operation;
- tests that reject malformed or extra-field event payloads.

Those facts would **not** by themselves prove:

- database-role denial of UPDATE/DELETE;
- provider-side write-once storage;
- backup immutability;
- privileged DBA resistance;
- cryptographic tamper evidence;
- external SIEM retention/integrity guarantees.

State:

`APPLICATION_LEVEL_INSERT_ONLY_BOUNDARY = NOT_IMPLEMENTED`

`DATABASE_LEVEL_IMMUTABILITY = EXTERNAL_UNVERIFIED`

`TAMPER_EVIDENCE = NOT_IMPLEMENTED`

Do not use the word `immutable` for stored audit history until the relevant layer is actually proven.

## 5. Read/access authority

No dedicated audit-review data plane or repository-owned security-audit reader authority was identified.

The symbolic `security_duty` / `incident_commander` roles used by alert-response candidate #195 are operational routing labels, not application authorization roles, and must not be silently reused as DB/read permissions.

State:

`AUDIT_READ_INTERFACE = ABSENT`

`AUDIT_READ_AUTHORIZATION = AUTHORITY_REQUIRED`

A future read interface must be bounded and must not turn audit history into a new broad admin/support data plane.

## 6. Retention authority

Repository search did not identify an approved audit-log retention duration or policy source.

No number of days is selected by this discovery.

State:

`AUDIT_RETENTION_POLICY = POLICY_REQUIRED`

A future implementation may encode an approved policy once supplied, but must not create a default retention period merely to make the schema look complete.

## 7. Write-failure semantics

The repository does not currently establish whether a security-relevant privileged request should:

- fail closed when durable audit persistence is unavailable;
- proceed while surfacing an explicit degraded-security state through an independently durable path; or
- follow a risk-tiered rule based on action class.

Silently swallowing an audit write failure is not acceptable evidence. Conversely, making every audit sink outage a universal production outage would be an availability decision that this repository is not currently authorized to invent.

State:

`AUDIT_WRITE_FAILURE_POLICY = POLICY_REQUIRED`

## 8. Data minimisation boundary

A future durable sink must persist the canonical #193 event only, plus storage metadata that is strictly necessary for persistence/integrity.

It must not add:

- bearer tokens or authentication secrets;
- raw request/response bodies;
- email/phone/postal contact details;
- raw URL query strings;
- free-form operator notes;
- IP/user-agent/device fingerprints merely because a logging framework makes them convenient.

Any additional field requires a separate necessity and retention decision.

## 9. Discovery gate matrix

| Gate | State | Repository conclusion |
| --- | --- | --- |
| SINK-DISC-G1 Persistence inventory | `COMPLETE` | PostgreSQL/Drizzle present; dedicated audit/SIEM sink absent or unrepresented |
| SINK-DISC-G2 Schema placement | `PARTIAL` | dedicated Drizzle schema module is the natural repository location, but active migration promotion is blocked |
| SINK-DISC-G3 Write authority | `PARTIAL` | app-level insert-only interface is implementable; DB-role append-only authority is unproven |
| SINK-DISC-G4 Integrity authority | `PARTIAL` | app-level validation can be proven; DB/provider immutability and tamper evidence remain unproven |
| SINK-DISC-G5 Read/access authority | `OPEN` | no dedicated audit reader authorization/data plane found |
| SINK-DISC-G6 Retention authority | `BLOCKED` | `POLICY_REQUIRED`; no approved duration found |
| SINK-DISC-G7 Failure semantics | `BLOCKED` | `POLICY_REQUIRED`; no authorized sink-outage behavior found |
| SINK-DISC-G8 Data minimisation | `DESIGN_BOUNDARY_DEFINED` | future sink restricted to canonical #193 event + strictly necessary storage metadata |

## 10. Next smallest safe implementation slice

Do **not** create an active audit migration yet.

Once migration-baseline authority is resolved, the smallest repository-owned implementation candidate is:

1. add a dedicated Drizzle audit schema rather than reusing a product table;
2. add a matching controlled migration compatible with the resolved baseline path;
3. add an audit repository whose ordinary application surface accepts only parsed `security-audit-v1` events and exposes insert + bounded query operations, with no ordinary update/delete API;
4. add disposable PostgreSQL integration evidence for insert, retrieval, malformed-event rejection, and migration repeatability;
5. keep DB-role immutability, provider backups and external SIEM controls `EXTERNAL_UNVERIFIED` until real configuration evidence is supplied;
6. do not implement retention deletion or archival until an approved retention authority exists;
7. do not wire privileged production routes until audit-write failure semantics are explicitly decided.

After that repository slice, separate evidence is still required for production emission, database/provider access controls, retention enforcement and operational monitoring.

## 11. Gate effect

This discovery advances the truth boundary for PRIV-SEC-G4 but closes no readiness gate automatically.

`G-PRIV-SEC-AUDIT-SINK-DISC-01 = DISCOVERY_COMPLETE_WITH_BLOCKERS`

`PRIV-SEC-G4 = OPEN`

`PRODUCTION_AUDIT_TRAIL = NOT_ESTABLISHED`
