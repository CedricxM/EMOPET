# Community bounded chronological feed candidate

Date: 2026-09-11

Status: implemented candidate on draft PR #224; not released. This is a bounded retrieval primitive under #54 / #98 / #223, not implementation or approval of the complete finite-feed/recommender product contract.

## Scope and authority

The member-scoped Hono feed previously read every post in a community in one response and ordered only by creation time. Equal timestamps had no deterministic tie-breaker. [Issue #54](https://github.com/CedricxM/EMOPET/issues/54) proposes six items followed by an explicit request for six more, while identifying that size as an unvalidated UX hypothesis. This candidate adopts the six-item bound without treating it as an optimal batch size or release authority.

The existing current-membership and current-rules checks remain mandatory on every request. Their `FOR SHARE` locks and the dependent post query remain in the same bounded PostgreSQL transaction. A cursor cannot retain membership after revocation, bypass renewed rules acceptance, or confer Guardian/Care/private-location authority. Existing disclosure projections remain unchanged: no `sensorOverlay`, no popularity count, no internal cursor timestamp field in public posts.

## API contract

`GET /api/community/:id/feed` returns the existing `communityId` and `posts` fields, plus:

```json
{
  "pagination": {
    "pageSize": 6,
    "hasMore": true,
    "nextCursor": "<navigation-state>"
  }
}
```

- At most six posts are returned, ordered by `createdAt DESC, id DESC`. There is no popularity, engagement, ELI or dog-health ranking input.
- The database query fetches at most seven rows. The seventh is look-ahead only; the cursor uses the last returned row, never the look-ahead row.
- A caller can explicitly request the next page with a single URL-encoded `cursor` query parameter. A supplied `limit` cannot enlarge the batch.
- The last page returns `hasMore=false` and `nextCursor=null`, including an exactly six-row last page. An authoritative empty result returns `posts=[]` with the same end state. There is no count query or fabricated total.
- No client auto-load, scroll trigger, prefetch loop or presentation is added. Clients still need reviewed explicit-continuation and end-state UX before this can satisfy the full #54 contract.
- Existing authentication/member/rules denials remain `401` / non-enumerating `404` / `403 COMMUNITY_RULES_REQUIRED`. Cursor validation follows those authority checks; invalid cursor syntax or scope returns sanitized `400 INVALID_FEED_CURSOR`. Transaction failures remain `503 COMMUNITY_DATABASE_UNAVAILABLE`. Responses retain `Cache-Control: private, no-store`.

## Stable seek boundary, not a durable snapshot

The next query adds the parameterized tuple comparison `(created_at, id) < (cursor_created_at, cursor_id)` within the same community. It does not use `OFFSET` or require the boundary row to still exist. Equal timestamps are resolved by UUID order; deletion of an earlier or boundary row does not shift offsets or invalidate navigation.

PostgreSQL timestamps can carry six fractional digits, while JavaScript `Date` carries only three. The query obtains the cursor timestamp directly from PostgreSQL as UTC text with six digits. It never reconstructs the seek boundary from the public millisecond-resolution `createdAt`. This prevents skipping posts whose stored timestamps differ only below a millisecond. The internal timestamp field is omitted by the explicit post presenter.

New posts whose ordering tuple is newer than the current boundary do not appear in that continuation; an explicit first-page refresh retrieves them. Each request nevertheless uses its own current database state, not a shared MVCC snapshot. Deleted rows disappear, backdated inserts or transactions committed late with older timestamps may appear on later pages, and edits to ordering fields can change placement. There is no frozen cohort, cursor session, immutable history or guarantee against concurrent administrative reordering.

## Cursor validation and security boundary

`backend/api/services/community-feed.ts` uses versioned, unpadded base64url JSON containing the actor, community and exact timestamp/UUID position. It accepts only one nonempty value, at most 768 characters, the expected keys/version, valid UUIDs and a calendar-valid UTC timestamp with exactly six fractional digits. Resource UUIDs follow PostgreSQL's generic UUID shape rather than imposing the narrower access-JWT subject version policy on community/post records.

The cursor is unsigned navigation state, not a secret, signed claim, access token or capability. An unmodified cursor from another account or community is rejected. A client can edit unsigned state, but this cannot expand the current database-backed membership/rules scope. No signing key, identity provider, permission cache or cursor-based grant is introduced. Malformed or duplicated cursors cannot silently restart the first page.

## Database candidate and reproducible checks

The Drizzle posts schema and historical migration `0008_community_feed_seek_index.sql` both declare `idx_posts_community_created_id` on `(community_id, created_at DESC, id DESC)`. The equality prefix and ordered tuple support this keyset query. No runtime planner setting is changed. The migration is a disposable QA candidate, not authorization to lock or migrate a production table; an online rollout and verification of any pre-existing live index definition require separate review.

Four always-run cursor tests cover precision/resource UUIDs, missing versus invalid/duplicate state, strict shape/calendar/version validation, and account/community scope.

`backend/test/community-feed.integration.test.mjs` exercises actual JWT middleware, Hono routes and disposable PostgreSQL in seven subtests:

1. Eighteen posts with equal timestamps and sub-millisecond differences traverse as three ordered six-post pages with no omissions or duplicates, no larger client-requested batch, and a real final page.
2. An empty community returns an immediate end state.
3. Deleting both the boundary row and an unseen row preserves navigation through the remaining rows, including a partial last page.
4. Creating a newer post through the real API does not move the existing continuation; a first-page refresh sees it.
5. Malformed, duplicate, wrong-community and wrong-account cursors fail closed; an outsider cannot gain access by rewriting unsigned state.
6. Membership removal and obsolete rules acceptance between pages deny further reads until current authority is restored.
7. The composite index exists, is ready and valid, and can support the exact tuple/order query without a sort. `enable_seqscan=off` is restricted to the test transaction as an index-eligibility probe, not a production plan or latency benchmark.

The integration also checks serialized disclosure fields, private caching and community isolation. P0 CI runs it both on historical migrations plus draft prerequisites and on an independently generated fresh Drizzle baseline. Schema repeatability, generated inventory/stability, backend typecheck and the full backend suite remain required. Record completed exact-commit evidence in the linked issues/PR; locally skipped database suites are not PostgreSQL proof.

## Remaining gates

#54 stays open. Eligibility for age/minors, blocks, moderation, expiry and audience restrictions; feed modes and truthful recommendation reasons; preference controls; reviewed empty/end states and explicit continuation; media lifecycle; and Founder/UX evidence are not implemented or approved by this change. The membership-only candidate must not be described as a production-safe recommender. #98's broader Community lifecycle and #223's cross-surface readiness gates also remain open. PR #224 stays draft and unmerged; no deployment or production migration is performed.
