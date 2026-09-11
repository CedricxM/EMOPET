# EMOPET — Professional-share recipient read transaction

**Date:** 2026-09-11  
**Issue:** #64  
**Status:** PRE-PRODUCTION IMPLEMENTATION SLICE / NOT A RECIPIENT ROUTE / GATE OPEN

## Purpose

Close the revocation-during-collection transaction gap without pretending that EMOPET already has an approved professional identity provider or a clinically validated veterinary report.

The existing policy checker reloads durable grant state and current Guardian authority for each decision. The missing boundary was the interval between an allowed decision and the moment collected report data would be published to a recipient.

## Implemented boundary

`backend/api/services/professional-share-recipient-read.ts` adds an internal publication boundary:

1. resolve the already-verified professional principal outside PostgreSQL locks;
2. run a non-publishing fail-closed preflight against the current durable grant;
3. collect only the semantic projection described by the authorized scope inside a database transaction;
4. before any collected value can be returned, lock the dog row and then the matching grant row with `FOR SHARE`;
5. re-run the existing recipient/grant/Guardian/purpose/scope/window/expiry policy against transaction-current state;
6. durably audit that final decision in the same transaction;
7. return collected data only when the final decision is still `AUTHORIZED` and the transaction commits.

The lock order is deliberately **dog → grant**, matching Guardian grant lifecycle operations. A concurrent ownership mutation or revocation that commits first is observed by the final policy check. If the recipient transaction acquires its publication locks first, the later mutation waits until that already-authorized publication transaction commits.

Collected values remain server-local until the final decision. If a revocation wins while collection is in progress, the collected value is discarded and the result contains no collected payload.

## Evidence added

`backend/test/professional-share-recipient-read.integration.test.mjs` uses actual PostgreSQL state and the real Guardian revoke route to prove:

- an active, recipient-bound grant can pass the final publication boundary;
- the preflight does not create a false durable `AUTHORIZED` publication audit;
- Guardian revocation can commit while collection is deliberately held open;
- after that revocation, the final recipient check returns `GRANT_REVOKED`;
- a private sentinel returned by the collector is absent from the denied result;
- the final denial is durably audited.

Security CI also statically requires this boundary and prevents backend route files from importing it while the recipient route/identity/report-projection authority is intentionally not approved.

## Deliberate non-claims

This slice does **not** establish:

- verified veterinarian/professional identity or credential proofing;
- grant activation or recipient binding workflow;
- bearer/capability issuance, delivery or reissue;
- an approved production recipient HTTP route;
- an approved implementation for `VETERINARY_SUMMARY`, qualified longitudinal observations, data coverage/confidence, selected notes or declared context;
- clinical validation or medical interpretation;
- provider-session revocation semantics during one already-authenticated request;
- retention, deletion or post-revocation historical audit policy.

The collector hook is an internal transaction primitive, not permission to expose arbitrary database rows. A production route remains blocked until a concrete semantic report assembler and verified professional identity authority are approved and tested.

`G-GUARDIAN-AUTHORITY-01 = OPEN`.
