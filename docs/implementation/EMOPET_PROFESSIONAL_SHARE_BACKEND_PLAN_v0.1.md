# EMOPET — Durable Professional Share Backend Plan v0.1

**Status:** IMPLEMENTATION PLAN / BLOCKED ON AUTH + MIGRATION BASELINE  
**Date:** 2026-09-06  
**Parent:** #64  
**Authority:** Guardian Professional Sharing + Guardian Authority Master

## 1. Why no in-memory shortcut

A revocable professional grant must survive process restarts and must be checked server-side on every access. An in-memory map, client preference or self-contained bearer token cannot provide the required authority.

Therefore the next implementation step is deliberately blocked until the durable auth/migration baseline is controlled.

## 2. Candidate tables

### `guardian_dog_authority`

Candidate fields:
- id UUID PK
- dog_id UUID/index
- principal_user_id UUID/index
- role (`PRIMARY_GUARDIAN`, `TRUSTED_GUARDIAN`)
- capabilities JSONB/text-array candidate
- status
- granted_by_user_id
- created_at
- effective_at
- expires_at nullable
- revoked_at nullable
- revocation_reason nullable

Uniqueness/invariants require design review, especially Primary Guardian transfer.

### `professional_share_grants`

Candidate fields:
- id UUID PK
- dog_id UUID/index
- guardian_user_id UUID/index
- recipient_type
- recipient_display_name
- recipient_organization_name nullable
- recipient_email_normalized nullable
- recipient_principal_id nullable
- purpose
- purpose_note nullable
- scopes JSONB/text-array candidate
- data_from
- data_to
- access_expires_at
- status
- token_id nullable/unique
- created_at
- activated_at nullable
- revoked_at nullable
- revoked_by_user_id nullable
- revocation_reason nullable

Hard DB/application invariant candidate: at least one of recipient email or verified professional principal is required.

### `authorization_audit_events`

Candidate fields:
- id UUID PK
- actor_type
- actor_id nullable
- dog_id
- grant_or_delegation_id nullable
- action
- reason_code nullable
- occurred_at
- request_correlation_id nullable

Never persist bearer tokens or report contents in audit rows.

## 3. API candidate

Authenticated Guardian routes:

```text
POST   /api/dogs/:dogId/professional-grants
GET    /api/dogs/:dogId/professional-grants
GET    /api/dogs/:dogId/professional-grants/:grantId
POST   /api/dogs/:dogId/professional-grants/:grantId/revoke
POST   /api/dogs/:dogId/professional-grants/:grantId/issue-link
GET    /api/dogs/:dogId/professional-grants/:grantId/audit
```

Recipient route candidate:

```text
GET /api/professional-share/:opaqueToken
```

The recipient route resolves token -> token ID -> ACTIVE durable grant -> recipient policy -> exact scoped report.

## 4. Authorization ordering

For Guardian operations:

1. authenticate user;
2. load server-side dog authority;
3. require capability;
4. validate request body;
5. enforce scope policy;
6. write grant transactionally;
7. write audit event;
8. return sanitized grant.

For recipient access:

1. hash/resolve opaque token;
2. load durable grant;
3. require ACTIVE;
4. check expiry at request time;
5. verify dog/grant binding;
6. verify recipient binding when applicable;
7. resolve only authorized scopes/data window;
8. audit success/deny;
9. return no-store response.

## 5. Token design candidate

Prefer opaque high-entropy token with only a hash/token ID stored server-side.

Benefits:
- straightforward revocation;
- no sensitive metadata in URL token body;
- server remains authority;
- token rotation/reissue simpler.

If signed tokens are retained, they still require durable grant lookup on every access. Signature validity alone is insufficient.

## 6. Transactionality

Grant activation/link issuance should avoid states where:
- a link exists with no durable grant;
- grant says ACTIVE but token cannot be resolved;
- revocation succeeds in UI but token remains usable.

Use DB transactions once migration/DB baseline is controlled.

## 7. Scope resolver

Professional reports must be built from an explicit allowlist keyed by grant scopes, not from a generic serialization of dog/account objects.

Example:

```text
VETERINARY_SUMMARY -> summary structure only
DATA_COVERAGE_AND_CONFIDENCE -> coverage/confidence fields only
OWNER_SELECTED_NOTES -> selected note IDs captured in grant/snapshot
QUALIFIED_LONGITUDINAL_OBSERVATIONS -> only qualified governed observations
DECLARED_CONTEXT -> explicit Guardian-selected context class
```

Unknown scope => deny/fail closed.

## 8. Snapshot vs live semantics

Must be decided before implementation:

- `VETERINARY_SUMMARY`: generated at access time inside fixed data window, or snapshot at share creation?
- owner-selected notes: snapshot IDs/content vs live current notes?
- later deletion/correction behavior?

Ambiguity is not acceptable because it changes what the Guardian consented to share.

Candidate default:
- fixed data window;
- current governed observations inside that fixed window;
- owner-selected note IDs snapshotted at grant creation;
- content deletion by Guardian removes future access rather than resurrecting deleted content.

Requires Privacy/Product review.

## 9. Blockers

Do not implement production persistence until:
- backend auth principal is real, not stub authority;
- dog ownership/Guardian authority data model is controlled;
- Drizzle migration baseline is unblocked;
- secret/token delivery model is selected;
- recipient verification/delivery decision exists;
- tests can actually execute in CI/local environment.

## 10. Current safe state

The old generic share path is quarantined from production, mobile no longer emits it, and shared grant types/validators exist.

`G-PROFESSIONAL-SHARE-DURABLE-BACKEND-01 = BLOCKED_AUTH_MIGRATION_BASELINE`
