# Professional sharing — server access-policy boundary

Date: 2026-09-09. Parent: #64. Candidate implementation on PR #224.

The shared grant model now has a server access checker in
`backend/api/services/professional-share-access.ts`. The factory has no default
store, identity provider or audit sink; absent adapters return `UNAVAILABLE`.
No sharing route, token issuer, production grant store or email delivery is
activated by this change.

The checker accepts a strict read intent, reloads the grant for each request,
requires a verified matching professional principal and current Guardian–dog
authority, and validates grant ID, dog ID, lifecycle, activation, expiry,
purpose, scopes and the observation period. A durable audit acknowledgement is
required before a positive policy result. Expiry is checked again after that
asynchronous write. Results contain only the requested scope/window projection;
neither report content nor recipient/contact information nor bearer material is
returned or written into the policy audit.

Email-only recipient binding, research consent, selected-note semantics and
declared-context selection remain unavailable. The checker does not make these
OPEN policy decisions by treating a valid schema as consent.

## What the tests prove

`backend/test/professional-share-access.test.mjs` runs in the existing backend
test command after compilation. Its synthetic adapters exercise wrong
recipient/dog/grant, current Guardian authority, expiry including a slow audit,
next-request revocation/deletion, scope/period/purpose widening, malformed stored
state, unknown scopes, caller-supplied identity/consent and unavailable providers,
storage or audit. They verify the returned projection and sanitized audit shape.

These are policy and orchestration tests. They do not prove durable storage,
real identity verification, end-to-end BOLA protection, report publication,
recipient delivery or an operational sharing service.

## Required before route integration

- Supply controlled durable grant, identity, Guardian-authority and audit adapters.
- Compose authorization and the scoped report read with the agreed transaction /
  revocation semantics. A returned decision is not a reusable capability or a
  cache entry. Revocation concurrent with a read still requires transaction-level
  evidence; the tests only prove a reload on each subsequent request.
- Enforce governed publication and selected-content semantics in the report
  resolver; the checker never queries or serializes report data.
- Map internal denial reasons to a response that does not disclose resource
  existence, and verify no-store and recipient delivery behavior at the route.
- Complete the production and privacy reviews in
  `EMOPET_PROFESSIONAL_SHARE_BACKEND_PLAN_v0.1.md` and the #64 authorities.

`G-GUARDIAN-AUTHORITY-01 = OPEN`.
`G-PROFESSIONAL-SHARE-DURABLE-BACKEND-01` remains blocked on auth, recipient/delivery
policy and actual durable adapters. This implementation does not supersede the
controlled sharing authority or close its adversarial release gate.
