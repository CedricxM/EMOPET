# Journal runtime authority containment — 11 September 2026

Status: **CANDIDATE CONTAINMENT / PR #224 / NOT RELEASE AUTHORITY**

Related: #242, #223, #232, #58, #69.

## Why this slice exists

The web Journal had two historical persistence paths that could be mistaken for Product V1 private-history authority:

1. `apps/web/app/api/journal/route.ts` using the legacy Next.js `collection()` store;
2. `apps/web/app/journal/page.tsx` using browser `localStorage` and rendering a newly created entry before a server authority had acknowledged it.

The server route also scoped non-demo entries with a caller-provided owner token rather than canonical authenticated Guardian identity. That is sufficient for a bounded prototype but is not a Product V1 authorization, retention, erasure or sharing boundary.

This slice contains that legacy plane without inventing the final Memories/Journal backend.

## Candidate behavior

### Legacy Next.js route

`apps/web/lib/server/journal-authority.ts` defines one canonical gate:

- default: disabled;
- explicit non-production demo only: `EMOPET_ALLOW_LEGACY_JOURNAL_DEMO=1`;
- production: always disabled, even when the demo variable is present.

Every exported Journal handler must pass `legacyJournalAuthorityGate()` before touching the historical store.

Disabled responses are `503`, `private, no-store`, and state that Product V1 Journal/Memory authority is not yet wired.

When the historical route is deliberately enabled for non-production demonstration, its JSON responses carry:

`authority = LEGACY_DEMO_ONLY`

That marker is descriptive evidence only. It is not a durable-authority upgrade.

### Journal client

The Journal page no longer:

- hydrates user entries from browser `localStorage`;
- writes new entries into browser storage as a fallback;
- inserts a new entry into the visible timeline before the server response succeeds;
- describes network failure as an offline persistence fallback;
- treats the historical Next.js route as Product V1 server authority.

The page now has explicit runtime states:

- `checking`;
- `legacy-demo`;
- `unavailable`.

Create/export interaction is exposed only in the explicit legacy-demo state. A successful create is rendered only after the route returns a successful `LEGACY_DEMO_ONLY` response containing the entry.

When authority is unavailable, the page shows prototype/unavailable language rather than a fabricated saved state.

## Regression evidence

`apps/web/lib/__tests__/journal-authority.test.ts` checks:

- default-off behavior;
- explicit non-production opt-in;
- production refusal;
- every exported Journal route handler invokes the canonical authority gate;
- demo responses are private/non-cacheable and marked `LEGACY_DEMO_ONLY`;
- the client contains an explicit unavailable state;
- browser `localStorage` persistence helpers remain absent;
- newly created entries are not rendered as saved before server acknowledgement.

## Explicit non-claims

This containment does **not** establish:

- final Product V1 Memories/Journal schema;
- canonical Guardian identity for Journal records;
- retention periods;
- account/dog deletion cascade;
- backup deletion behavior;
- professional or social sharing semantics;
- migration of historical demo entries;
- offline-first Product V1 behavior;
- legal/privacy approval;
- production release readiness.

It also does not equate relationship Memories/Journal entries with the separate backend health-journal domain.

## Remaining architecture decision

Before Product V1 Journal/Memory persistence is enabled, the project still needs one explicit backend authority covering at minimum:

- canonical Guardian/dog binding where applicable;
- record identity and authorship;
- private-by-default audience;
- attachment/object lifecycle;
- delete/anonymise semantics;
- export/rights behavior;
- retention and backup disposition;
- client offline/retry/conflict behavior;
- cross-surface boundaries with Care, Breiz, Community and professional sharing.

Until that exists, `G-JOURNAL-RUNTIME-AUTHORITY-01` remains **OPEN**. The legacy bypass may be described only as **contained on the candidate branch**, never as Product V1 Journal readiness.
