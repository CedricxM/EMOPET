# AUTH-01 session concurrency — 10 September 2026

Status: implementation candidate in draft PR #224; AUTH-01 #75 remains open.

## Defects addressed

The composed AUTH-01 implementation rotated refresh tokens atomically within a
family, but logout and logout-all did not participate in that serialization.
A logout UPDATE could begin while rotation held the old token row, then miss
the successor inserted before rotation committed. Revoking only the presented
token also missed an already rotated successor. Separately, refresh checked
expiry against the request-start clock, and login could issue from a password
hash changed after its verification read.

## Candidate behavior

- Existing-account session mutations lock the core user row first. Refresh and
  individual logout then lock the token family. Logout-all holds the account
  lock while revoking all active refresh credentials for that account.
- Individual logout revokes active successors in the presented token's family.
  Independently authenticated login families and other users are unaffected.
- Repeated revocation preserves existing timestamps/reasons. Unknown tokens
  continue to receive the idempotent logout response without disclosing state.
- Refresh re-reads the credential and obtains the clock after authority locks.
  An expired credential cannot create a successor after waiting.
- Login verifies the password outside the transaction, locks the user, and
  requires the password hash still to match before inserting a session.
- Lock waits are bounded to five seconds and individual statements to ten
  seconds. KDF work and JWT signing stay outside the transaction. A database
  failure rolls back and must not produce a successful session response.

The common lock orders concurrent operations; it does not ban a new login
authenticated after logout-all. Access JWTs retain their existing bounded
lifetime; refresh revocation is not an immediate access-JWT denylist.

PostgreSQL row-lock behavior reference:
[PostgreSQL 16 explicit locking](https://www.postgresql.org/docs/16/explicit-locking.html#LOCKING-ROWS).

## Verification

`backend/test/auth-session-concurrency.test.mjs` uses disposable PostgreSQL and
observes actual blocked operations before releasing competing transactions:

1. refresh versus logout, including successor denial, family isolation and
   idempotent revocation evidence;
2. refresh versus logout-all, including account isolation;
3. expiry between request start and lock release;
4. password change between login verification and session insertion.

The P0 DB workflow runs these scenarios against both draft/historical migrations
and a freshly generated Drizzle baseline. The unit suite also covers expiry
while authority acquisition advances the clock. Exact commit/run evidence is
recorded in #75 and #224 after CI completes.

No migration, dependency, external identity provider, client token transport,
password reset endpoint, retention policy, deployment or release is introduced.
These tests establish candidate runtime behavior, not production certification.
