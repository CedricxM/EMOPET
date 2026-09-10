# Professional sharing — Guardian concurrency checkpoint

Date: 2026-09-10. Parent: #64. Candidate code on draft PR #224.

## Authority and implementation boundary

The controlled sharing authority and backend plan remain applicable. This record
updates the implementation checkpoint after commits `20c8c494`, `39ed693a` and
`b7903693`: grants and sanitized access-policy audits now have PostgreSQL
persistence, and Guardian create/list/revoke routes exist. Professional identity,
activation, delivery and a scoped recipient report route remain unavailable.
The 2026-09-09 access-policy record describes the earlier checker-only slice;
its absence-of-storage statements are historical, while its recipient-read
transaction and publication requirements remain open.

## Fixed races

The original routes checked dog ownership before operating on grants. An owner
change could commit between those steps. Create, list and revoke now recheck the
current owner inside their database transaction and hold a `FOR SHARE` dog-row
lock until commit. A committed owner change that wins this lock results in 404
without disclosing grants or applying the former Guardian's mutation.

Revocation locks the grant with `FOR UPDATE` before inspecting its lifecycle.
Two concurrent requests therefore preserve the first committed revocation date,
reason and update timestamp. Success is returned after the transaction commits.
The consistent lock order is dog, then grant. Lock waits and individual statements
are bounded; database failures use the existing retryable 503 response.

All Guardian sharing responses carry `Cache-Control: private, no-store`.
Malformed JSON is rejected with 400 before mutation. An empty revoke body still
means an omitted optional reason, and repeated revocation preserves the record.

The PostgreSQL locking semantics are documented in the
[PostgreSQL 16 manual](https://www.postgresql.org/docs/16/explicit-locking.html#LOCKING-ROWS).

## Executable evidence

`backend/test/professional-share-concurrency.integration.test.mjs` runs in the
disposable PostgreSQL CI job. It observes real PostgreSQL blocking relationships
before releasing competing transactions, rather than relying on request timing:

- an uncommitted owner transfer lets preflight see the old owner; create, list
  and revoke must wait and deny after the new owner commits;
- two queued revoke requests must return identical persisted revocation records;
- a subsequent policy check must read the durable `REVOKED` state;
- malformed JSON must leave the grant active, and an empty retry must remain
  idempotent.

The existing lifecycle and policy tests remain in place. The P0 workflow path
filters now include professional-sharing services, validators and tests so future
changes to those files also execute the PostgreSQL checks. Local backend build,
non-DB tests and the static authority gate were exercised; local PostgreSQL is
unavailable. Exact commit/run results are recorded in PR #224 and issue #64.

## Still open

This is a Guardian lifecycle concurrency fix. It does not serialize a recipient's
report read with revocation: that future transaction must retain authority locks
through scope resolution and audit, using an approved snapshot/live contract.
No scope resolver is built from the legacy generic veterinary report, which
includes unselected owner notes. No identity provider, activation route,
production migration, delivery mechanism or release approval is introduced.

`G-GUARDIAN-AUTHORITY-01 = OPEN`.
