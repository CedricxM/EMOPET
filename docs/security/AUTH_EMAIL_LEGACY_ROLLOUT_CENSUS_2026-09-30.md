# AUTH-EMAIL-VERIFY-03 — legacy rollout census

**Issue:** #760  
**Parent:** #738  
**Date:** 2026-09-30  
**Status:** `READ-ONLY CENSUS / NO ROLLOUT AUTHORITY`

## Purpose

Before deciding how historical accounts should enter the new email-verification
model, measure the real database state without changing it.

The command:

```bash
pnpm --filter @emopet/api build
pnpm --filter @emopet/api auth-email:legacy-audit
```

prints one JSON document containing aggregate cohort counts only.

## Cohorts

- `legacyUnverified`: no verification requirement and no verified timestamp;
- `legacyVerified`: no verification requirement but a verified timestamp exists;
- `verificationRequiredUnverified`: explicit requirement, no verified timestamp;
- `verificationRequiredVerified`: explicit requirement + verified timestamp.

The report also counts active refresh sessions by cohort and flags the subset
where `email_verified_at < email_verification_required_at` for review.

## Privacy / authority boundary

The report intentionally excludes:
- emails;
- user IDs;
- names;
- verification token material;
- refresh token hashes;
- row dumps.

It performs no INSERT, UPDATE or DELETE.

That is a repository/code-path guarantee only. It does **not** prove that the
PostgreSQL principal supplied through `DATABASE_URL` is itself read-only.
Use a dedicated read-only operator credential where the deployment provides one;
database-role evidence remains external/unverified.

Running the census does **not** authorize:
- marking legacy accounts verified;
- forcing re-verification;
- revoking sessions;
- changing login policy;
- migration execution.

The next step after a real-environment census is a separate human/security
decision under #738/#214.
