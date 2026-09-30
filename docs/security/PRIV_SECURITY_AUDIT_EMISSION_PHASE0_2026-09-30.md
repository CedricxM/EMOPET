# PRIV-SEC-AUDIT-EMIT-01 — Phase-0 privileged runtime audit emission

**Issue:** #782  
**Date:** 2026-09-30  
**Status:** `PHASE0 INTERNAL EMISSION CANDIDATE / ADMIN.DATA.READ WIRED / PRODUCT-V1 MUTATION COVERAGE OPEN`

## 1. Decision

The first repository-owned runtime emission seam is:

`Next server -> authenticated internal Hono endpoint -> canonical composer -> durable security_audit_events`

This deliberately does **not**:
- import backend DB/repository internals into Next;
- grant the web runtime direct PostgreSQL authority;
- create a second audit store;
- expose a public unauthenticated audit endpoint.

## 2. Internal service authentication

Authority:
- package: `@emopet/privileged-auth`;
- issuer: `emopet-web`;
- audience: `emopet-internal-security-audit`;
- subject: `service:web`;
- algorithm: HS256;
- TTL: 30 seconds;
- JWT `jti`: audit transport/event UUID;
- request body SHA-256 digest is bound into the service token.

The service secret:
- must contain at least 32 characters;
- must be distinct from `JWT_SECRET`;
- must be distinct from `PRIVILEGED_JWT_SECRET`;
- is server-only;
- must never be exposed as `NEXT_PUBLIC_*`.

Environment contract:
- `EMOPET_INTERNAL_BACKEND_URL`;
- `EMOPET_INTERNAL_AUDIT_SERVICE_SECRET`.

Production web emission accepts only an `https:` backend origin.

## 3. Payload minimisation

The web emitter sends only:

```text
decision
action
target
occurredAt
```

The body does not contain:
- session cookie;
- user bearer token;
- email;
- IP;
- user-agent;
- request body;
- raw URL/query;
- free-form operator notes.

The backend re-composes the canonical event with the already-authoritative
`composePrivilegedAuditEvent()`.

The web is therefore not a second `security-audit-v1` authority.

## 4. Decision mapping

Current web privileged decisions map as follows:

### AUTHORIZED
Preserve:
- subject UUID;
- privileged role;
- exact finite action.

Canonical audit result:
- actor = `privileged_human`;
- outcome = `allowed`;
- reason = `allowed`.

### verified RBAC denial
The web bounded denial:
- subject;
- role;
- exact action;
- `not_authorized`

maps to the canonical composition input:
- `DENIED / action_not_allowed`.

Canonical audit result preserves the verified actor.

### anonymous denial
Missing/invalid browser credential/session states map only to:
- `DENIED / invalid_token`

for the canonical composer.

The durable event becomes anonymous:
- subject = null;
- role = null;
- reason = `invalid_principal`.

The emitter does not preserve which browser credential transport failed.

### authority UNAVAILABLE
No event is emitted.

A verifier outage is not reinterpreted as an access denial.

## 5. Idempotency

The internal service token `jti` is the durable audit-row UUID.

Repository behavior:
- first event with UUID -> insert;
- retry with same UUID + identical canonical event -> duplicate success;
- same UUID + different canonical event -> `IDEMPOTENCY_CONFLICT`;
- DB unavailable -> retryable persistence failure.

The web retry loop reuses the exact same:
- service JWT;
- event UUID;
- body.

This prevents transport retry from creating ambiguous duplicate audit facts.

## 6. First real privileged surface

`apps/web/app/admin/data/page.tsx`

Action:
`admin.data.read`

Target:
`system / null`

Runtime order:
1. validate privileged server-side session;
2. if authorization authority is UNAVAILABLE, keep the page closed and emit nothing;
3. otherwise emit the canonical decision through the internal audit channel;
4. if durable audit emission fails, keep the page closed;
5. only an AUTHORIZED + durably-audited decision may render the internal data surface.

This is a real privileged read surface, not a legacy demo plane.

## 7. Backend endpoint

Route:
`POST /internal/security-audit`

Important properties:
- mounted outside ordinary `/api/*` user JWT middleware;
- service JWT required;
- body bound to JWT by SHA-256;
- max request body 4 KiB;
- canonical decision composition remains backend-owned;
- persistence is idempotent;
- no audit-history read API is added.

## 8. Executable evidence

Tests cover:
- service-token key separation;
- exact body binding;
- expiry;
- authorized mapping;
- verified denial mapping;
- anonymous denial mapping;
- UNAVAILABLE => no emission;
- retry uses identical token/body;
- body tamper => auth failure;
- duplicate idempotent persistence;
- conflicting idempotency => fail closed;
- sink unavailable => fail closed;
- forbidden extra payload fields rejected;
- emitted row persists on PostgreSQL;
- canonical detection runtime sees the emitted row;
- historical + generated Drizzle PostgreSQL baselines.

## 9. What this does not close

#782 must remain OPEN after this phase-0 slice.

Still required before closure:
- at least one real Product V1 privileged mutation wired with explicit fail-closed ordering;
- mutation side-effect/idempotency semantics under audit transport failure;
- explicit production network/TLS topology evidence;
- deployed server-to-server secret custody/rotation evidence;
- production/staging exercise;
- coverage statement for all privileged runtime actions.

Separate/open authorities remain:
- retention #478;
- DB-provider append-only/WORM proof #198;
- detector production policy/cadence #525;
- alert delivery/ack/escalation #526;
- broader #154 readiness.

## 10. Gate

`WEB_TO_BACKEND_AUDIT_SEAM = IMPLEMENTED_CANDIDATE`

`CANONICAL_EVENT_AUTHORITY = BACKEND_COMPOSER_ONLY`

`DURABLE_IDEMPOTENCY = EVENT_UUID_PRIMARY_KEY`

`ADMIN_DATA_READ = FAIL_CLOSED_ON_AUDIT_FAILURE`

`PRODUCT_V1_PRIVILEGED_MUTATION_AUDIT = OPEN`

`PRODUCTION_NETWORK_TOPOLOGY_EVIDENCE = OPEN`

`ISSUE_782 = KEEP_OPEN`
