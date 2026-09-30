# PRIV-SEC G4 — Phase-0 durable security-audit sink candidate

**Issue:** #198  
**Parent:** #154  
**Date:** 2026-09-30  
**Status:** `IMPLEMENTATION CANDIDATE / REPOSITORY DURABILITY ONLY / OPERATIONAL AUDITABILITY OPEN`

## 1. Bounded decision

This candidate applies the smallest Phase-0 repository slice identified by the
#198 discovery:

- **D1 = A — PostgreSQL/Drizzle dedicated audit table**
- **D2 = A — no runtime audit-history read route**
- **D3 = A — fail closed when durable audit persistence is required**

These choices are intentionally repository-local. They do not resolve provider,
legal/privacy, operational or production database authority.

## 2. Canonical input

The sink accepts only events that pass:

`backend/api/security/security-audit-event.ts::parseSecurityAuditEvent`

Schema:

`security-audit-v1`

No second audit vocabulary is introduced.

## 3. Durable shape

The dedicated table is:

`security_audit_events`

It stores only:
- generated row id;
- schema version;
- event type;
- occurrence time;
- bounded actor kind/subject/role;
- finite privileged action;
- bounded target scope/ref;
- outcome;
- reason;
- storage timestamp.

It does **not** add:
- email;
- IP address;
- user agent;
- request/response body;
- bearer token;
- free-form notes;
- contact details.

## 4. Repository write authority

The repository API exposes only:

`persistSecurityAuditEvent(input)`

Behavior:
- canonical parse failure → `INVALID_AUDIT_EVENT`;
- database insert failure → `DATABASE_UNAVAILABLE`;
- neither failure may be interpreted as durable audit success.

The first slice contains no audit-history read API and no update/delete repository
primitive.

## 5. Database constraints

The migration and Drizzle schema independently bound:
- schema version;
- event type;
- actor shape;
- privileged action vocabulary;
- target shape;
- outcome/reason consistency.

This protects the durable table from malformed direct writes.

## 6. Evidence

Disposable PostgreSQL integration must prove on both historical migrations and
the generated Drizzle baseline:

1. exact canonical persistence;
2. extra/malformed fields rejected;
3. direct invalid DB writes rejected by constraints;
4. exact bounded column inventory;
5. simulated sink unavailability returns failure, never success.

## 7. Explicit non-authorities

This candidate does **not** establish:

### Retention
No retention duration is encoded.

`AUDIT_RETENTION = POLICY_REQUIRED / #478`

### Database-principal immutability
The TypeScript repository is insert-only, but the current runtime database role
may still possess UPDATE/DELETE authority.

`DB_APPEND_ONLY_AUTHORITY = EXTERNAL_UNVERIFIED`

### Tamper resistance
No WORM, cryptographic chain, signed log, external immutable archive or provider
tamper-evidence guarantee is claimed.

`TAMPER_RESISTANCE = NOT_ESTABLISHED`

### Operational read access
No `security.audit.read` route/action is added.

`AUDIT_HISTORY_READ = NOT_IMPLEMENTED`

### SIEM / continuous monitoring
The table does not itself establish continuous detection, delivery, alerting,
acknowledgement or response SLA.

Those remain under #525/#526 and the broader #154 readiness gate.

## 8. Failure-semantics boundary

For operations that are later declared audit-required, a persistence failure must
fail the composed privileged operation rather than silently dropping the event.

This candidate supplies the durable primitive only. It does not wire every
privileged route to that primitive.

Therefore:

`AUDIT_SINK_PRIMITIVE = CANDIDATE`

`PRODUCTION_AUDIT_EMISSION = OPEN`

`G-PRIV-SEC-READINESS-01 = OPEN`

## 9. Release boundary

A green candidate proves repository/database mechanics only.

It is not:
- GDPR compliance evidence by itself;
- production auditability;
- final retention authority;
- DB immutability evidence;
- operational monitoring readiness;
- release authorization.
