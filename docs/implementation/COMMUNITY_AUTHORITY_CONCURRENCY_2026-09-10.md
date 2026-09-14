# Community authority through concurrent operations

Date: 2026-09-10 UTC (2026-09-11 in France)  
Parent: #98 / #150 / #223 / #232  
Branch: `experience-hardening-2026-09-06` / draft PR #224  
State: **DRAFT / UNMERGED / NOT RELEASE AUTHORITY**

## Confirmed gap

The durable Hono core checked membership and current rules in separate queries before reading or writing content. A membership could be removed or reassigned, or an acceptance changed/deleted, between that check and the operation. Comment creation also consumed a parent post's community binding without retaining or rechecking it.

This patch closes those concurrent authority gaps on the existing candidate endpoints. It adds no membership-management or moderator endpoint and chooses no new admission, consent, retention or release policy.

## Transaction contract

- All implemented Community database routes use a `READ COMMITTED` transaction, with `lock_timeout = 5s` and `statement_timeout = 10s` set locally. These limits apply to lock waits and individual statements, not a promise about total network/request duration.
- Detail reads lock the matching membership rows `FOR SHARE`, then read the community through the same transaction. Duplicate historical membership rows are all locked; this does not add a uniqueness constraint or define a deduplication lifecycle.
- Feed/event reads and post/comment/event writes lock membership first, then the account's rules-acceptance row. The current server rules version is checked after any lock wait. Both locks remain held through the dependent read/write and commit.
- The community list retains its membership join and locks its returned membership rows in the same transaction. A row already being deleted/reassigned is waited on and rechecked; the user receives only their remaining communities.
- For comments, the initial post lookup discovers a candidate scope. After membership and rules locks, a second query locks the parent `FOR SHARE` with both its ID and original community ID in the predicate. A move or deletion that won the lock produces `404`, with no comment. A later move/deletion waits until this write commits.
- `FOR SHARE` is intentional: `FOR KEY SHARE` would not block updates to authority fields such as `user_id`, `rules_version` or the parent's `community_id`. See [PostgreSQL 16 row locking](https://www.postgresql.org/docs/16/explicit-locking.html#LOCKING-ROWS).
- Rules acceptance remains explicit, account-bound and server-versioned. Its upsert participates in the same row-lock discipline and has the same SQL time limits.
- SQL failures, including lock timeout, return sanitized `503 COMMUNITY_DATABASE_UNAVAILABLE`, with a retryable flag and the requested operation name. No successful response is returned before commit. Router-level `private, no-store` now also covers validation failures.

There is a defined order, not retroactive cancellation: if a withdrawal obtains its lock first, subsequent dependent work must recheck and deny. If a request has already acquired the authority locks, it may finish before a later withdrawal. The guarantee ends with database use/commit and does not retract a response already delivered or authorize later asynchronous jobs.

## Executable evidence

`backend/test/community-authority-concurrency.integration.test.mjs` mounts the real JWT middleware and Hono route against disposable PostgreSQL. Eight subtests cover:

1. Real authenticated reads, member/unknown-resource isolation, creator without membership denial, and private validation failures.
2. In-flight membership deletion across list/detail/feed/events and all three content writes.
3. In-flight membership reassignment across the same endpoints, including the non-key update case.
4. In-flight rules-version change across feeds/events and content writes, followed by explicit server-versioned reacceptance.
5. In-flight rules-acceptance deletion across those endpoints and subsequent recovery.
6. Parent community move between the comment's first lookup and its locked recheck.
7. An actual comment INSERT paused after authorization: membership deletion, rules deletion and parent move all wait until the authorized write commits. Later access is denied.
8. Actual authority-lock timeout for a read and a write, sanitized failure, no new content and recovery after release.

Negative write cases assert persisted table counts, not just HTTP statuses. Lock assertions observe PostgreSQL blocker chains; each test file's unique application name prevents unrelated concurrent suites from satisfying the assertion. A short table lock is used only inside the disposable fixture to pause the actual INSERT; production code has no test hook.

The P0 database workflow now explicitly watches the Community route and test files. The existing durable lifecycle suite remains alongside these tests. Record finished CI evidence against the published commit in #98/PR #224; local runs without PostgreSQL skip this integration suite and do not constitute concurrency evidence.

## Remaining authority

`G-COMMUNITY-DATA-PLANE-01` remains OPEN. Membership creation/join/leave/invite policy and endpoints, moderation, reports/blocks, privacy and retention/erasure, media, notifications, abuse controls, client reconciliation and cross-surface disclosure review remain separate work. The technical rules marker is not legal approval. This patch does not make Community a source of Guardian, professional, Care or ELI authority and does not permit production deployment or release.
