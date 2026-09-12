# EMOPET — Professional Sharing Adversarial QA Plan v0.1

**Status:** TEST DESIGN / NOT EXECUTED  
**Date:** 2026-09-06  
**Parent:** #64  
**Authority:** `docs/control/EMOPET_GUARDIAN_PROFESSIONAL_SHARING_v0.1.md`

## 1. Goal

Prove that professional sharing cannot widen from a Guardian's explicit grant through ID tampering, stale links, client state, Community/World relationships, caching or recipient confusion.

## 2. Required negative cases

| ID | Attack / failure case | Expected result |
|---|---|---|
| PS-NEG-001 | User A requests grant/report for User B's dog | DENY without revealing dog existence/details |
| PS-NEG-002 | Active grant dog ID changed in request | DENY `DOG_SCOPE_MISMATCH` |
| PS-NEG-003 | Requested scope not present in grant | DENY `DATA_SCOPE_MISMATCH` |
| PS-NEG-004 | Requested data period widened | DENY; no silent widening |
| PS-NEG-005 | Access after `accessExpiresAt` | DENY and audit expiry/access denial |
| PS-NEG-006 | Access after Guardian revocation | DENY even if bearer token cryptographically unexpired |
| PS-NEG-007 | Recipient email/principal differs | DENY `RECIPIENT_MISMATCH` |
| PS-NEG-008 | Client changes local `vet_export_opt_in` only | no grant created / no access |
| PS-NEG-009 | Community friend/Circle member attempts Vet View | DENY; social trust is irrelevant |
| PS-NEG-010 | Trusted household Guardian without explicit sharing capability | DENY create/revoke grant |
| PS-NEG-011 | Request raw MAT/TAG stream using normal Vet View grant | DENY |
| PS-NEG-012 | Request private Memory or Community DM | DENY |
| PS-NEG-013 | Reuse access link for another dog | DENY |
| PS-NEG-014 | Link crawler/preview fetch | must not create unintended durable disclosure; delivery design to be tested |
| PS-NEG-015 | Shared response cached by CDN/browser intermediary | response must carry no-store/private controls as appropriate |
| PS-NEG-016 | Token/bearer URL appears in application log | FAIL test if plaintext secret appears |
| PS-NEG-017 | Audit event contains report contents/raw data | FAIL |
| PS-NEG-018 | Grant status PENDING/SUSPENDED/EXPIRED/REVOKED | DENY |
| PS-NEG-019 | Deleted/disabled professional principal | DENY or suspend per future policy |
| PS-NEG-020 | Guardian removes one selected note after grant creation | define snapshot/live-view semantics before release; no ambiguous behavior allowed |

## 3. Positive minimum cases

- Primary Guardian creates a valid recipient-bound grant for own dog.
- Only selected scopes are rendered.
- Data range matches the grant exactly.
- Recipient can access during the valid window.
- Guardian sees an access audit event.
- Guardian revokes; the next access fails.

## 4. BOLA matrix

At minimum test every professional-share route with:

```text
actor owns dog / actor does not own dog
× grant belongs to actor / grant belongs to another actor
× dog matches / dog differs
× recipient matches / recipient differs
× ACTIVE / PENDING / SUSPENDED / EXPIRED / REVOKED
```

Do not accept a single happy-path authorization test as coverage.

## 5. Logging / privacy assertions

Search runtime logs/test captures for:

- bearer token plaintext;
- `share_token=` URLs;
- full owner notes;
- raw sensor payloads;
- private Memory text;
- exact unnecessary location history.

Any occurrence outside explicitly controlled secure test fixtures is a failure.

## 6. Cache / headers

Professional report responses should be tested for appropriate controls including candidate:

- `Cache-Control: private, max-age=0, no-store`;
- `Referrer-Policy: no-referrer`;
- `X-Content-Type-Options: nosniff`.

Exact final web-delivery security headers remain part of security review.

## 7. Gate

`G-PROFESSIONAL-SHARE-ADVERSARIAL-QA-01 = NOT_RUN`

Documentation does not satisfy the gate. Runtime tests must execute against the durable grant implementation.