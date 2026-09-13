# EMOPET — Professional-share recipient read transaction

**Date:** 2026-09-11  
**Updated:** 2026-09-13  
**Issue:** #64  
**Status:** PRE-PRODUCTION IMPLEMENTATION SLICE / NOT A RECIPIENT ROUTE / GATE OPEN

## Purpose

Close the publication boundary between a recipient authorization decision and the bytes that may leave the backend, without pretending that EMOPET already has an approved professional identity provider, activation/delivery workflow or production Vet View route.

The access checker reloads durable grant state and current Owner authority for every decision. The recipient-read boundary additionally protects the interval between preflight authorization, data collection and publication against Owner transfer, grant expiry and explicit revocation. The September 13 hardening also removes two publication ambiguities that existed in the original slice: arbitrary collector output can no longer escape directly, and the default professional collector is now bounded by the exact authorized `dataFrom` / `dataTo` interval at SQL read time.

## Implemented boundary

`backend/api/services/professional-share-recipient-read.ts` provides the internal publication boundary:

1. validate the requested intent before resolving professional identity;
2. resolve the already-verified professional principal outside PostgreSQL locks;
3. run a non-publishing fail-closed preflight against the current durable grant;
4. collect an internal `VetReportSummary` through the dedicated professional collector;
5. before publication, lock the dog row and then the matching grant row with `FOR SHARE`;
6. re-run recipient/grant/Owner/purpose/scope/window/expiry policy against transaction-current state and the current clock;
7. durably audit that final decision in the same transaction;
8. only after the final decision is still `AUTHORIZED`, rebuild the response through the centralized field-level scope projector;
9. return the projected data only after the transaction commits.

The lock order is deliberately **dog → grant**, matching Owner professional-grant lifecycle operations. A concurrent ownership mutation or revocation that commits first is observed by the final policy check. If the recipient transaction acquires its publication locks first, the later mutation waits until that already-authorized publication transaction commits.

Expiry does not require a database mutation to win. The final check evaluates the clock again immediately before publication authority is accepted. A grant that was active at preflight but expires while collection is in progress is denied before any collected value is returned.

A denied preflight is immutable for that read attempt: it is audited as the already-computed denial rather than being re-evaluated into a possible later authorization.

## Field-level scope projection

`backend/api/services/professional-share-projection.ts` is the only publication projector used by the recipient-read boundary. It reconstructs allowed data field by field rather than serializing the internal report object.

Currently implemented publication shapes are:

- `VETERINARY_SUMMARY` → dog ID, dog name, covered-day count and generation timestamp;
- `QUALIFIED_LONGITUDINAL_OBSERVATIONS` → qualified trend label/value/coverage fields only;
- `DATA_COVERAGE_AND_CONFIDENCE` → valid days, total days and coverage ratio only.

`OWNER_SELECTED_NOTES` and `DECLARED_CONTEXT` remain fail-closed with `SCOPE_POLICY_NOT_READY`. Research-purpose sharing also remains unavailable pending separate consent authority.

Private Owner-note fields and unrelated/raw payload fields are deliberately absent from the projection contract. Projection failure is treated as an authority failure; it never falls back to returning the richer internal snapshot.

## Exact authorized data window

`backend/api/services/professional-share-vet-snapshot.ts` is the default recipient-read collector. It is intentionally separate from the legacy veterinary report loader, which is based on “last N days”.

For professional sharing the collector:

- binds reads to the authorized dog ID;
- applies `timestamp >= dataFrom`;
- applies `timestamp <= dataTo`;
- computes trends and coverage only from rows inside that interval;
- does not query `healthEntries` while Owner-selected note/context semantics remain unavailable;
- returns an internal snapshot only, which still cannot leave the boundary until the final durable authorization and scope projection succeed.

This closes the implementation gap where a syntactically authorized interval could previously coexist with a broader lower-bound-only data loader.

## Exact implementation evidence

The bounded publication implementation is established through head `4cc6b98248d9db89be8345d51dee4ab3b1e29780` on draft PR #224.

Head-associated CI:

- P0 DB baseline validation run `34764092502`: **PASS**. Backend build/typecheck and the backend suite complete with **153 tests, 152 passed, 0 failed, 1 skipped**. The single general-sweep skip is covered by its dedicated generated-baseline step.
- P0 DB upgrade rehearsal run `34764092488`: **PASS**.
- P0 DB authority parity run `34764092518`: **PASS**.
- Security supply-chain run `34764092495`: **PASS**, including the professional-sharing authority gate, Semgrep, CodeQL, dependency checks, workspace tests and web build.

`backend/test/professional-share-recipient-read.integration.test.mjs` uses actual PostgreSQL state and, where relevant, the real Owner revoke route to prove:

1. **Stable authority + field whitelist:** an active recipient-bound grant publishes only the requested scope projection; private Owner-note bytes do not escape.
2. **Exact temporal bounds:** rows before, inside and after the authorized interval are seeded (`111 km`, `4 km`, `999 km`); only the in-window `4 km` row can influence the projection.
3. **Owner transfer during collection:** a committed ownership change causes `OWNER_AUTHORITY_MISMATCH`; collected former-Owner bytes are discarded and the denial is durably audited.
4. **Grant expiry during collection:** crossing `accessExpiresAt` after preflight but before publication returns `GRANT_EXPIRED`; collected bytes are discarded and the denial is durably audited.
5. **Revocation during collection:** the real Owner revoke route commits while collection is held open; the final check returns `GRANT_REVOKED`, collected bytes are discarded and the denial is durably audited.

The audit assertions do not depend on unspecified PostgreSQL row-return order.

## Regression protection

`scripts/security/professional-share-authority-audit.mjs` statically requires:

- the dedicated bounded professional collector;
- both lower and upper timestamp predicates;
- no `healthEntries`, `loadVetReportSummary` or `createVetReportSummaryLoader` dependency in that collector;
- the bounded collector as the recipient-read default;
- final durable authorization before scope projection;
- no backend route import of the recipient-read primitive while recipient identity/routing authority remains unapproved.

This static gate is regression evidence, not privacy/security certification.

## Deliberate non-claims

This slice does **not** establish:

- verified veterinarian/professional identity or credential proofing;
- grant activation or server-side recipient-binding workflow;
- bearer/capability issuance, delivery, rotation, recovery or reissue;
- an approved production recipient HTTP route;
- Product/Privacy approval of snapshot-vs-live semantics for future accesses;
- selection semantics for Owner-selected notes or declared context;
- research consent authority;
- clinical validation or medical interpretation;
- retroactive cancellation after an already-authorized publication transaction has committed;
- provider-session revocation semantics beyond the durable principal/grant checks represented here;
- final retention/deletion/post-revocation historical-audit policy;
- release, legal or privacy approval.

The currently implemented veterinary-summary, qualified-longitudinal and coverage projection shapes are controlled backend publication allowlists. They are not a claim that the wider Vet View product semantics, professional identity model or release gate are complete.

This closes the **publication-race, field-projection and exact-window implementation gaps** for the currently allowed internal scopes. It does not close the wider Guardian Authority / Owner professional-sharing product gate.

`G-GUARDIAN-AUTHORITY-01 = OPEN`.
