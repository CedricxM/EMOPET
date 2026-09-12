# EMOPET — Professional-share recipient read transaction

**Date:** 2026-09-11  
**Issue:** #64  
**Status:** PRE-PRODUCTION IMPLEMENTATION SLICE / NOT A RECIPIENT ROUTE / GATE OPEN

## Purpose

Close the authority-change-during-collection transaction gap without pretending that EMOPET already has an approved professional identity provider or a clinically validated veterinary report.

The existing policy checker reloads durable grant state and current Guardian authority for each decision. The missing boundary was the interval between an allowed decision and the moment collected report data would be published to a recipient. That interval can invalidate publication through at least three already-defined authority changes: Guardian ownership transfer, grant expiry, or explicit revocation.

## Implemented boundary

`backend/api/services/professional-share-recipient-read.ts` adds an internal publication boundary:

1. validate the requested intent before resolving professional identity;
2. resolve the already-verified professional principal outside PostgreSQL locks;
3. run a non-publishing fail-closed preflight against the current durable grant;
4. collect only the semantic projection described by the authorized scope while keeping the collected value server-local;
5. before any collected value can be returned, start the publication transaction and lock the dog row and then the matching grant row with `FOR SHARE`;
6. re-run the existing recipient/grant/Guardian/purpose/scope/window/expiry policy against transaction-current state and the current clock;
7. durably audit that final decision in the same transaction;
8. return collected data only when the final decision is still `AUTHORIZED` and the transaction commits.

The lock order is deliberately **dog → grant**, matching Guardian grant lifecycle operations. A concurrent ownership mutation or revocation that commits first is observed by the final policy check. If the recipient transaction acquires its publication locks first, the later mutation waits until that already-authorized publication transaction commits.

Expiry does not require a database mutation to win. The final check evaluates the clock again immediately before publication authority is accepted. A grant that was active at preflight but expires while collection is in progress is denied before any collected value is returned.

A denied preflight is immutable for that read attempt: it is audited as the already-computed denial rather than being re-evaluated into a possible later authorization.

## Exact-head evidence

Verified candidate head: `0d3f9cee196660937416e233a2cce8441eee9985` on draft PR #224.

- P0 DB validation run `34604738501` / #220: **PASS**. Historical migration repeatability, fresh Drizzle baseline, generated-baseline AUTH checks, backend build/typecheck and **110 backend tests, zero failures, zero skipped** all pass.
- Security supply-chain run `34604738479` / #600: **PASS**, including the professional-sharing authority gate and the existing workspace/security evidence chain.

`backend/test/professional-share-recipient-read.integration.test.mjs` uses actual PostgreSQL state and, where relevant, the real Guardian revoke route to prove all four publication outcomes:

1. **Stable authority:** an active, recipient-bound grant can pass the final publication boundary. The preflight does not create a false durable `AUTHORIZED` publication audit.
2. **Guardian transfer during collection:** after ownership changes and commits while collection is held open, the final check returns `GUARDIAN_AUTHORITY_MISMATCH`; the former Guardian's collected sentinel is absent from the result and the denial is durably audited.
3. **Grant expiry during collection:** a mutable test clock crosses `accessExpiresAt` after preflight but before publication; the final check returns `GRANT_EXPIRED`, collected bytes are discarded and the denial is durably audited.
4. **Revocation during collection:** the real Guardian revoke route commits while collection is held open; the final check returns `GRANT_REVOKED`, collected bytes are discarded and the denial is durably audited.

The audit assertions do not depend on unspecified PostgreSQL row-return order.

Security CI also statically requires this boundary and prevents backend route files from importing it while the recipient route/identity/report-projection authority is intentionally not approved.

## Deliberate non-claims

This slice does **not** establish:

- verified veterinarian/professional identity or credential proofing;
- grant activation or recipient binding workflow;
- bearer/capability issuance, delivery or reissue;
- an approved production recipient HTTP route;
- an approved implementation for `VETERINARY_SUMMARY`, qualified longitudinal observations, data coverage/confidence, selected notes or declared context;
- clinical validation or medical interpretation;
- retroactive cancellation after an already-authorized publication transaction has committed;
- provider-session revocation semantics beyond the durable principal/grant checks represented here;
- retention, deletion or post-revocation historical audit policy.

The collector hook is an internal transaction primitive, not permission to expose arbitrary database rows. A production route remains blocked until a concrete semantic report assembler and verified professional identity authority are approved and tested.

This closes the **publication-race implementation gap** for the three already-defined authority changes above. It does not close the wider Guardian Authority or Vet View product gate.

`G-GUARDIAN-AUTHORITY-01 = OPEN`.
