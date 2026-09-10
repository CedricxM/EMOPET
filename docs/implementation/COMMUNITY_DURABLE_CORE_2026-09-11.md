# EMOPET — Community durable core candidate

Date: 2026-09-11  
Parent: #98 / #150 / #223  
Branch: `experience-hardening-2026-09-06`  
State: **DRAFT / UNMERGED / NOT RELEASE AUTHORITY**

## Purpose

Replace the all-503 Hono Community scaffold with the smallest durable Product V1 data-plane slice that can be truthfully exercised without inventing moderation, public-discovery or privacy-lifecycle decisions.

## Candidate authority implemented

The Hono Community router is the candidate Product V1 Community server plane. This slice adds:

- router-level fail-closed authenticated identity before route validators;
- PostgreSQL-backed listing of communities for the authenticated user's existing memberships only;
- member-scoped community detail reads;
- versioned, durable, account-bound Community-rules acceptance;
- rules-gated, member-scoped durable post creation and feed recovery;
- rules-gated, member-scoped durable comment creation;
- rules-gated, member-scoped durable event creation and event recovery;
- private/no-store responses on the membership-scoped Community plane;
- explicit database-unavailable responses distinct from an empty authoritative query.

Current rules version marker:

`community-rules-v1-candidate`

This is a server-controlled candidate version identifier. It is not a legal-policy approval or final Community rules publication.

## Deliberately still blocked

The following Hono operations continue to return `503 COMMUNITY_PERSISTENCE_NOT_READY`:

- UGC reports;
- user blocks;
- copresence reads.

This slice also does **not** implement:

- community creation/join/leave/invite lifecycle;
- moderation/admin authority;
- public community discovery;
- likes/reactions;
- report/block lifecycle and enforcement;
- durable feature-progress/consent/waitlist reconciliation;
- Community retention, erasure or anonymisation policy;
- media/object lifecycle;
- notification/fan-out semantics;
- rate limiting/anti-harassment controls;
- production deployment or release.

## Membership boundary

Community data exposed by this candidate is membership-scoped. A non-member receives a non-enumerating `404` on community detail/feed and cannot create content in the community.

The list endpoint returns only communities for which the authenticated user already has a persisted `community_members` row. This intentionally does not make a product decision about public discovery.

## Rules boundary

Posts, comments, feeds and events require an acceptance record for the current server rules version. `accepted: false` is not stored as acceptance. A later rules-version change can therefore fail closed until the user explicitly accepts the new version.

## Persistence

Migration `0007_community_rules_authority.sql` adds `community_rules_acceptances` with:

- canonical `users.id` UUID as primary key;
- server-controlled rules version;
- acceptance timestamp.

Existing PostgreSQL tables remain the durable candidate stores for:

- `communities`;
- `community_members`;
- `posts`;
- `comments`;
- `community_events`.

## Evidence

`backend/test/community-persistence.integration.test.mjs` requires disposable PostgreSQL and proves:

- membership-scoped list;
- post denied before rules acceptance;
- false acceptance rejected;
- durable rules acceptance;
- post create then feed read-after-write;
- durable comment creation;
- event create then event read-after-write;
- non-member detail/feed/write denial;
- unauthenticated malformed write rejected by the router-level auth boundary before route validation;
- report creation remains explicitly unavailable rather than being silently promoted.

CI evidence must be recorded only from the exact final candidate head after all checks finish.

## Gate disposition

This advances #98 from `NO DURABLE HONO COMMUNITY CORE` to `DURABLE MEMBER-SCOPED CORE CANDIDATE`.

It does **not** close `G-COMMUNITY-DATA-PLANE-01`. Remaining closure work includes membership lifecycle authority, moderation/report/block durability and enforcement, privacy lifecycle, final client integration and controlled product/security review.

It also advances the #150 router identity boundary, but canonical JWT/session authority remains owned by AUTH-01.
