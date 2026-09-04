# SEC-HARDEN route/input/authority inventory

Status: `DISCOVERY_COMPLETE_WITH_ACTIONS`

Parent: #214 (`SEC-HARDEN-01`)

Baseline inspected: `db72df611f8791dd1de7c56e5f301ccc3b324553` (`fix/priv-sec-mfa-provider-boundary-tests`)

Date: 2026-09-04

## Purpose

This record translates `HARDEN-G1` into the actual EMOPET runtime. It inventories the active Hono API and Next.js Route Handlers and classifies request validation, authentication, authorization, body-size handling, rate limiting and bounded-error behavior.

It is evidence and prioritisation only. It does not claim production security, activate a provider, change route semantics or authorize deployment.

## Vocabulary

- `SCHEMA` — runtime schema validator such as Zod.
- `MANUAL_BOUNDED` — explicit shape/value checks are present for the relevant input.
- `MANUAL_PARTIAL` — some values are checked but malformed structure or unsupported combinations can escape the intended 4xx path.
- `NONE` — no route-local validation needed or found for that input surface.
- `AUTH-01` — canonical Hono bearer access-token authentication.
- `DOG_OWNER` — authenticated subject must own the canonical UUID dog; mismatch is hidden as `404`.
- `PRIV_RBAC` — canonical privileged token/session plus exact finite action.
- `OWNER_TOKEN` — prototype opaque browser-generated token, not canonical account identity.
- `PUBLIC` — no account identity required by the current route.
- `PROCESS_LOCAL_LIMIT` — fixed-window `Map` limiter; not proof of multi-instance/global enforcement.

## Global Hono boundary

Observed global controls:

- `/api/auth/*`: fixed-window 20/minute rate limit;
- `/api/*`: fixed-window 240/minute rate limit;
- all `/api/*` routes except `/api/auth/*`: `AUTH-01` middleware;
- production CORS requires explicit `CORS_ORIGIN`;
- global Hono request logger is enabled;
- no explicit repository-wide Hono `onError` security boundary was found in `backend/api/index.ts`;
- no explicit request-body byte limit is applied globally.

The Hono rate limiter is in-memory per process. Proxy-derived client identity is opt-in in its middleware. Therefore current evidence is `PRESENT_CANDIDATE / SCALE_BOUNDARY_OPEN`, not proof of a globally shared production abuse-control plane.

## Hono route inventory

| Method | Route | Input validation | Identity / authority | Explicit body byte cap | Main hardening note |
|---|---|---|---|---|---|
| GET | `/health` | NONE | PUBLIC | n/a | Intentionally public health check. |
| POST | `/api/auth/register` | SCHEMA body | PUBLIC | No | Duplicate email returns `Account already exists`; account-enumeration policy remains open. Registration immediately issues session credentials; email verification absent. |
| POST | `/api/auth/login` | SCHEMA body | PUBLIC | No | Generic `Invalid credentials` for unknown user/wrong password plus controlled KDF timing mitigation. |
| POST | `/api/auth/refresh` | MANUAL_BOUNDED refresh token length/type | refresh credential | No | Rotation/revocation is present; malformed body is bounded. |
| POST | `/api/auth/logout` | MANUAL_BOUNDED refresh token length/type | refresh credential | No | Idempotent 204 avoids token-existence disclosure. |
| POST | `/api/auth/logout-all` | NONE | AUTH-01 | No | Explicit auth middleware inside auth router. |
| GET | `/api/dogs` | NONE | AUTH-01 | n/a | Placeholder list; future implementation must scope rows to authenticated owner. |
| POST | `/api/dogs` | SCHEMA body | AUTH-01 | No | Placeholder create response; future persistence must bind owner from server identity, never caller-supplied owner id. |
| GET | `/api/dogs/:id` | path checked by DOG_OWNER UUID guard | AUTH-01 + DOG_OWNER | n/a | Good horizontal boundary. |
| GET | `/api/dogs/:id/absence-comparison` | MANUAL_PARTIAL `days` | AUTH-01 + DOG_OWNER | n/a | `days = Number(...)` has no finite/range validation; NaN/negative/huge values are not rejected. |
| GET | `/api/dogs/:id/vet-report-link` | MANUAL_PARTIAL `days` | AUTH-01 + DOG_OWNER | n/a | `days` is not bounded before inclusion in share-token contract. |
| GET | `/api/dogs/:id/vet-report` | MANUAL_PARTIAL `days/share_token` | AUTH-01 globally; DOG_OWNER unless share-token branch | n/a | Current global AUTH-01 placement means truly unauthenticated external share access is not established by this route. Reconcile intended sharing semantics separately. |
| PATCH | `/api/dogs/:id` | SCHEMA body + DOG_OWNER UUID path | AUTH-01 + DOG_OWNER | No | Good owner/action boundary; no byte cap. |
| DELETE | `/api/dogs/:id` | DOG_OWNER UUID path | AUTH-01 + DOG_OWNER | n/a | Good owner boundary. |
| POST | `/api/sensors/summaries` | SCHEMA body | AUTH-01 + DOG_OWNER(body.dogId) | No | Good owner binding for supplied dog id. |
| GET | `/api/sensors/summaries/:dogId` | DOG_OWNER path; `range` free string | AUTH-01 + DOG_OWNER | n/a | `range` needs finite vocabulary before real query implementation. |
| GET | `/api/sensors/eli/:dogId` | DOG_OWNER UUID path | AUTH-01 + DOG_OWNER | n/a | Good horizontal boundary. |
| GET | `/api/sensors/eli/:dogId/history` | DOG_OWNER path; `range` free string | AUTH-01 + DOG_OWNER | n/a | `range` needs finite vocabulary. |
| GET | `/api/sensors/baseline/:dogId` | DOG_OWNER UUID path | AUTH-01 + DOG_OWNER | n/a | Good horizontal boundary. |
| POST | `/api/sensors/presence/:dogId/events` | SCHEMA body + body/path dog-id equality | AUTH-01 + DOG_OWNER | No | Strong binding; no byte cap. |
| GET | `/api/sensors/presence/:dogId/events` | DOG_OWNER path; MANUAL_PARTIAL `days` | AUTH-01 + DOG_OWNER | n/a | `days` is unbounded. |
| GET | `/api/community` | NONE | AUTH-01 | n/a | Placeholder. |
| GET | `/api/community/:id` | NONE path | AUTH-01 | n/a | Community membership/visibility authorization is not yet proven. |
| GET | `/api/community/:id/feed` | NONE path | AUTH-01 | n/a | Same membership/visibility boundary open. |
| POST | `/api/community/rules/accept` | SCHEMA body | AUTH-01 | No | User identity comes from auth context; fallback `demo-user` should remain unreachable in production. |
| POST | `/api/community/reports` | SCHEMA body | AUTH-01 | No | Schema validation present. |
| POST | `/api/community/blocks` | SCHEMA body | AUTH-01 | No | Schema validation present. |
| POST | `/api/community/posts` | SCHEMA body + content filter | AUTH-01 + rules gate | No | Community membership/action authority remains distinct from authentication. |
| POST | `/api/community/comments` | SCHEMA body + content filter | AUTH-01 + rules gate | No | Same membership/action boundary. |
| GET | `/api/community/:id/events` | NONE path | AUTH-01 | n/a | Membership/visibility authority open. |
| POST | `/api/community/events` | SCHEMA body + content filter | AUTH-01 + rules gate | No | Membership/action authority open. |
| GET | `/api/community/copresence/:dogId` | DOG_OWNER UUID path | AUTH-01 + DOG_OWNER | n/a | Good dog horizontal boundary. |
| GET | `/api/feature-progress` | NONE | AUTH-01 | n/a | Auth context used. |
| GET | `/api/feature-progress/consents` | NONE | AUTH-01 | n/a | Auth context used. |
| POST | `/api/feature-progress/consents` | SCHEMA body | AUTH-01 | No | Auth context used. |
| POST | `/api/feature-progress/waitlist` | SCHEMA body | AUTH-01 | No | Auth context used. |
| GET | `/api/health/:dogId` | DOG_OWNER UUID path | AUTH-01 + DOG_OWNER | n/a | Good horizontal boundary. |
| POST | `/api/health` | SCHEMA body | AUTH-01 + DOG_OWNER(body.dogId) | No | Good horizontal boundary. |
| GET | `/api/health/:dogId/reminders` | DOG_OWNER UUID path | AUTH-01 + DOG_OWNER | n/a | Good horizontal boundary. |
| GET | `/api/directory/search` | MANUAL_BOUNDED lat/lng/radius/q; category partial | AUTH-01 | n/a | Coordinates/radius/q bounded; category remains arbitrary string but query is parameterized. |
| GET | `/api/directory/categories` | NONE | AUTH-01 | n/a | Read-only directory aggregate. |
| GET | `/api/directory/:id` | MANUAL_BOUNDED integer id | AUTH-01 | n/a | 400/404 bounded. |
| GET | `/api/data-export` | MANUAL_PARTIAL query | AUTH-01 + dog owner query | n/a | `dog_id` required but not route-schema validated; invalid `from/to` silently become null; `from > to` is not rejected; unknown format silently maps to JSON. |
| GET | `/api/data-export/capabilities` | NONE | AUTH-01 | n/a | Capability metadata only. |

### Hono conclusions

Strong candidate evidence:

1. canonical authentication is centralized rather than repeated per route;
2. dog-scoped sensitive surfaces reuse one ownership authority that validates UUIDs and hides cross-owner existence;
3. JSON bodies on major domain writes use shared Zod schemas;
4. login/refresh semantics are already materially hardened.

Open Hono work:

1. **query/path schema consistency** — `days`, `range`, data-export interval/format and community ids are not uniformly validated;
2. **body byte ceilings** — no explicit global/per-route Hono byte cap is proven;
3. **community authorization** — authentication is not proof of circle membership or permission;
4. **global error/log boundary** — unexpected exceptions and the global logger need bounded-production evidence;
5. **share-link semantics** — vet-report share-token intent and global auth placement require reconciliation.

## Next.js Route Handler global observations

The current `apps/web/app/api/**` tree contains 14 route files and 20 method surfaces.

The reusable `request-security` helper provides:

- process-local fixed-window rate limiting;
- proxy-header client identity only when `EMOPET_TRUST_PROXY_HEADERS=true`;
- sanitized rate-limit keys;
- `readLimitedJson()` which checks declared and actual UTF-8 byte length;
- bounded display-name cleaning.

Not every route uses all helpers. In particular `/api/context` has a separate client-key function that always consumes proxy headers, bypassing the opt-in trust boundary used by the shared helper.

## Next.js route inventory

| Method | Route | Input validation | Identity / authority | Body byte cap | Main hardening note |
|---|---|---|---|---|---|
| GET | `/api/admin/moderation` | NONE | PRIV_RBAC `moderation.queue.read`; Bearer terminal, otherwise HttpOnly privileged cookie | n/a | Strong candidate privileged read; private/no-store responses. |
| PATCH | `/api/admin/posts/:id` | MANUAL_BOUNDED action; path id opaque | privileged session + exact Origin + PRIV_RBAC `moderation.post.manage` | No | Authorization/CSRF boundary strong; JSON shape/byte cap can be tightened. |
| PATCH | `/api/admin/contact/:id` | MANUAL_PARTIAL body | privileged session + exact Origin + PRIV_RBAC `contact.request.manage` | No | `status` bounded, but `scheduledSlot`/`teamNotes` lack complete shape/length validation and body has no byte cap. |
| GET | `/api/breeds` | MANUAL_BOUNDED `q` length; id lookup | PUBLIC | n/a | Read-only, rate-limited. |
| POST | `/api/breiz` | MANUAL_BOUNDED + regional checks | PUBLIC | 8 KiB | API key server-only; provider failures are collapsed to fallback. |
| GET | `/api/community/events` | MANUAL_PARTIAL `circleId` | PUBLIC | n/a | Public by current design; no canonical community identity. |
| POST | `/api/community/events` | MANUAL_PARTIAL typed cast + validator | PUBLIC | 12 KiB | Values are bounded, but identity/organizer attribution is caller-controlled. |
| GET | `/api/community/posts` | MANUAL_PARTIAL `circleId` | PUBLIC | n/a | Public by current design. |
| POST | `/api/community/posts` | MANUAL_PARTIAL typed cast + validator | PUBLIC | No | No byte cap; author display name is caller-controlled/sanitized, not server identity. |
| POST | `/api/community/posts/:id/flag` | opaque path id | PUBLIC | n/a | Rate-limited but unauthenticated reporting allows repeated identities only as strong as limiter topology. |
| POST | `/api/community/posts/:id/replies` | MANUAL_BOUNDED content/rating-equivalent reply fields | PUBLIC | 6 KiB | Author display name is caller-controlled/sanitized. |
| GET | `/api/contact` | header token or canonical privileged read | OWNER_TOKEN or PRIV_RBAC `contact.request.read` | n/a | Prototype owner token remains a non-canonical authority for user-scoped reads. |
| POST | `/api/contact` | MANUAL_PARTIAL typed cast + validator | PUBLIC caller-supplied OWNER_TOKEN | No | High-priority prototype boundary: owner token may come from body/header; validator can throw on malformed `proposedSlots`; contact data stored in server JSON store, not canonical account scope. |
| DELETE | `/api/contact?id=` | id presence + owner match, otherwise privileged path | OWNER_TOKEN terminal or privileged session + exact Origin + PRIV_RBAC `contact.request.manage` | n/a | Owner-token branch is not canonical auth; privileged branch is strong. |
| GET | `/api/context` | MANUAL_BOUNDED lat/lon/date/country | PUBLIC | n/a | **Rate-limit identity exception:** directly trusts `cf-connecting-ip`, `x-real-ip`, `x-forwarded-for` without `EMOPET_TRUST_PROXY_HEADERS` opt-in. Requires deployment trust reconciliation/fix. |
| GET | `/api/journal` | header parsing only | PUBLIC demo + optional OWNER_TOKEN | n/a | Explicit prototype authority. Owner-scoped private entries are not bound to AUTH-01. |
| POST | `/api/journal` | MANUAL_PARTIAL entry validator | OWNER_TOKEN | 24 KiB | Owner token lives in browser storage and is not canonical identity. Type-specific journal validation is partial. |
| DELETE | `/api/journal?id=` | id presence + owner match | OWNER_TOKEN | n/a | Prototype authority; migrate before production private journal claim. |
| GET | `/api/map/spots` | NONE | PUBLIC | n/a | Intended public community data. |
| POST | `/api/map/spots` | MANUAL_PARTIAL typed cast + validator + content filter | PUBLIC | 12 KiB | Public write; author attribution is not canonical identity. |
| POST | `/api/map/spots/:id/comments` | MANUAL_BOUNDED content/rating + content filter | PUBLIC | 8 KiB | Public write; author display name not canonical identity. |

## Highest-priority findings

### P0-A — Private prototype owner tokens are not production account authorization

`/api/journal` and the ordinary-user branch of `/api/contact` use browser-generated opaque owner tokens. They provide separation between holders of different tokens, but they are not bound to AUTH-01, a staff directory or a server-owned account session.

Required direction:

- keep the current prototype truth explicit;
- do not label these paths production account security;
- migrate private journal/contact ownership to canonical account identity before production promotion;
- preserve fail-closed owner semantics and negative cross-owner tests during migration.

### P0-B — Shape-safe validation is inconsistent

Typed casts after `req.json()` or `readLimitedJson<T>()` do not validate runtime shape by themselves. Manual validators are useful but not equivalent to a strict schema.

Concrete examples:

- contact validation assumes `proposedSlots` exists and has `.length`;
- admin contact accepts `scheduledSlot` and `teamNotes` without a complete bounded schema;
- community post/event/map inputs are cast to interfaces before manual validation;
- Hono query parameters use ad-hoc number/string parsing on several routes.

Required direction: one strict runtime schema per externally supplied body/query/path surface where malformed shape can reach business logic.

### P0-C — Body byte ceilings are partial

Good byte-bound examples exist (`Breiz`, event, reply, journal, map spot/comment), but they are not universal.

Missing explicit byte caps include at least:

- Hono JSON writes globally;
- Next contact POST;
- Next community post POST;
- privileged admin PATCH bodies.

This is a general request-resource control, separate from future file-upload limits.

### P0-D — `/api/context` bypasses the shared proxy-trust rule

Most Next rate-limit keys use proxy headers only when `EMOPET_TRUST_PROXY_HEADERS=true`. `/api/context` directly consumes proxy headers unconditionally.

That difference must be eliminated or backed by explicit ingress evidence proving those headers cannot be attacker-controlled. The smallest repository-side fix is to reuse `requestClientKey` / `enforceRateLimit` rather than maintaining a separate trust model.

### P1-A — Public UGC identity and abuse model requires an explicit product/security decision

Next community/map writes are intentionally public in the current implementation. Rate limiting, size limits and moderation exist on several paths, but author names are caller-provided display values rather than verified identities.

Before production promotion choose and test one model:

1. authenticated community authorship bound to canonical user id while optionally displaying a pseudonym; or
2. explicitly anonymous/pseudonymous posting with abuse controls designed for anonymous writes.

Do not accidentally imply verified authorship while accepting a free-form `authorName`/`organizerName`.

### P1-B — Hono community membership authority is not yet established

Hono community routes are authenticated, but membership/role/visibility checks are not evident on the current placeholder read/write routes. Authentication alone is not circle authorization.

### P1-C — Error/log minimisation needs executable evidence

The Hono app uses a global logger but no repository-owned global error-boundary contract was found in the inspected entrypoint. Next routes frequently catch expected parser/provider failures, but there is no cross-route proof that unexpected errors cannot expose internal detail or sensitive payloads.

A later slice should test actual responses and log payloads rather than banning `console.log` mechanically.

## Recommended next implementation sequence

Do not combine these into one large hardening PR.

1. **Context proxy-trust reconciliation** — tiny, deterministic, no product semantics.
2. **Next request-shape/body-cap helper adoption** — first on contact POST and privileged admin mutations, with malformed/oversize tests.
3. **Hono query/path schema tranche** — `days`, `range`, data-export interval/format; explicit finite/range behavior.
4. **Private owner-token migration design** — journal/contact → canonical account authority; preserve prototype until migration is code-green.
5. **UGC identity/abuse decision** — no silent authentication requirement without product decision.
6. **Global error/log evidence** — bounded unexpected error responses plus no-secret/no-body logging tests.
7. **Shared/distributed rate-limit authority** — only after deployment topology is known; do not claim process-local maps are globally authoritative.

## HARDEN-G1 disposition

`HARDEN-G1 = DISCOVERY_COMPLETE_WITH_ACTIONS`

The route surface is now enumerated and the next smallest enforceable slices are identified. This does **not** close #214 because implementation and external/operational gates remain open.

## Boundaries

- no production route behavior changed by this document;
- no provider, hosting, database, email or backup configuration invented;
- no RLS introduced merely to satisfy a generic checklist;
- no upload/webhook surface added for checklist optics;
- no production credentials or personal data included;
- no merge, deployment or compliance certification authorized.

Refs #69, #154, #175, #182, #188, #213, #214.
