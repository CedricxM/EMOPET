# Professional-share recipient identity evidence contract — 2026-09-14

Status: IMPLEMENTED CONTRACT / PROVIDER NOT SELECTED / PRODUCTION ROUTE NOT AUTHORIZED

## Purpose

Harden the existing professional-share trust seam so that a bare `principalId` can no longer authorize a recipient read. The backend now requires a provider-neutral, time-bounded verification evidence envelope before it will even load the durable professional-share grant.

This is deliberately **not** credential proofing. No veterinarian registry, clinic directory, identity provider, activation flow, delivery channel or production recipient route is selected or approved by this slice.

## Runtime contract

A resolved professional recipient must contain:

- a non-empty provider-side `principalId`;
- verification `status = VERIFIED`;
- verification `method = PROVIDER_ASSERTION`;
- a non-empty `issuer`;
- a non-empty opaque `evidenceId`;
- a parseable `verifiedAt` timestamp that is not in the future;
- a parseable `expiresAt` timestamp strictly after `verifiedAt` and strictly after the current policy time.

The access policy accepts provider output as `unknown` and validates this envelope at runtime. TypeScript typing alone is not treated as trust evidence.

## Fail-closed behavior

- no authenticated recipient: `RECIPIENT_MISMATCH`;
- malformed, incomplete, future-dated or expired verification evidence: `RECIPIENT_VERIFICATION_NOT_READY`;
- verified principal different from the grant-bound principal: `RECIPIENT_MISMATCH`;
- grant without a bound professional principal: `RECIPIENT_POLICY_NOT_READY`.

The verification evidence is re-evaluated after asynchronous audit work. A provider assertion that expires while authorization is being completed cannot remain authorized.

Provider evidence identifiers, issuer details and principal identifiers are not copied into the policy decision or durable policy audit payload.

## Publication boundary

The existing recipient-read transaction remains internal-only. It still resolves provider identity before PostgreSQL locks, performs fail-closed preflight, collects only inside the bounded authorized interval, rechecks Owner/grant authority immediately before publication, projects fields through the centralized scope whitelist and returns no collected data unless the final durable decision succeeds.

No backend route may import the recipient-read publication boundary while professional identity/credential proofing and recipient route authority remain unapproved.

## CI regression guard

`scripts/security/professional-share-authority-audit.mjs` now requires:

- the provider evidence envelope fields and constants;
- explicit runtime parsing of provider output;
- time-bounded evidence validation;
- the `RECIPIENT_VERIFICATION_NOT_READY` fail-closed state;
- tests proving malformed evidence is rejected before grant reads and expiry is re-evaluated after asynchronous audit;
- continued absence of a production recipient-read route.

## Still open

This change does **not** close `G-GUARDIAN-AUTHORITY-01` or EH-08. Still open include:

- professional credential proofing and approved identity provider selection;
- recipient binding and grant activation authority;
- delivery, reissue, recovery and session policy;
- snapshot-vs-live Product/Privacy semantics;
- Owner-selected notes/context;
- research consent;
- production recipient routing;
- legal, privacy, security and release approval.
