# P0 — Privileged authentication composition decision

Status: `CANDIDATE ARCHITECTURE — NOT RELEASE AUTHORITY`

Tracked by: #154, #169, #170, #173, #174, #175, #176.

## 1. Decision

Use one server-only workspace package, provisionally named `@emopet/privileged-auth`, as the canonical shared authority for:

- privileged token claim vocabulary;
- privileged token verification;
- finite privileged roles;
- finite privileged actions;
- role/action evaluation.

The backend and Next.js server code should consume that same package. The web application must not implement a second JWT parser or an independent copy of the RBAC matrix.

The provider-facing step-up orchestration remains backend-owned because it depends on:

- a verified AUTH-01 Guardian/staff base session;
- the privileged staff directory;
- the selected MFA provider/verifier;
- issuance of the privileged token after successful step-up.

This decision does not select the MFA provider and does not activate privileged routes.

## 2. Why this composition is preferred

### 2.1 Avoid a network authorization dependency

A design where every Next.js privileged route calls a backend `authorize` endpoint would add a network availability dependency to every authorization decision and create extra routing, timeout, retry and service-authentication concerns.

Authorization of a cryptographically self-contained, short-lived privileged token can be performed locally by trusted server code as long as the verifier and RBAC authority are canonical and shared.

### 2.2 Avoid handwritten JWT/HMAC code

`apps/web` does not currently declare `jose`. That is not a reason to parse JWTs manually or recreate HMAC verification with low-level crypto.

The shared package should depend on the same controlled `jose` family already used by AUTH-01. The dependency and lockfile delta must pass the repository supply-chain controls before promotion.

### 2.3 Avoid putting server security code in generic shared product types

`@emopet/shared` is consumed broadly by the product. Privileged authentication should not be mixed into the generic cross-client shared package, where it could accidentally become mobile/client bundle surface.

A dedicated package makes the server-only trust boundary explicit.

## 3. Proposed ownership split

### `@emopet/privileged-auth`

Owns:

- `PRIVILEGED_ROLES` (`admin`, `support`, `operator`);
- `PRIVILEGED_ACTIONS`, including the web-admin actions from #174;
- `PrivilegedPrincipal` and authority decision types;
- `evaluatePrivilegedAuthority()`;
- privileged JWT issuer/audience/token-use constants;
- privileged JWT claim parser/verifier;
- helpers that convert verified privileged claims into the bounded principal consumed by RBAC.

Must not own:

- Guardian password/login logic;
- MFA enrollment/recovery;
- provider API calls;
- staff-directory persistence;
- route-specific business logic;
- audit sink, SIEM, alert delivery or notification provider.

### Backend

Owns:

- AUTH-01 access-session verification;
- step-up orchestration from #170;
- privileged staff-directory lookup;
- MFA verifier adapter chosen under #175;
- privileged token issuance using the shared token contract;
- any future provider webhook/challenge endpoints.

### Next.js server

Owns:

- extraction of the privileged Bearer/cookie credential from the server-side request/session boundary selected later;
- shared-package token verification;
- one explicit finite action request per privileged route/page;
- fail-closed response when verification or action authorization fails;
- production removal of `x-admin-token` / `breiz-admin-token` authority;
- structured audit-event handoff without logging the bearer token.

Client/browser code must not receive signing secrets or import server verification internals.

## 4. Route/action migration map

Current legacy surfaces discovered on `main` must be migrated at minimum as follows:

| Surface | Required action |
|---|---|
| `GET /api/admin/moderation` | `moderation.queue.read` |
| `PATCH /api/admin/posts/:id` | `moderation.post.manage` |
| `GET /api/contact` admin-wide read path | `contact.request.read` |
| contact-request admin mutation/override paths | `contact.request.manage` |
| `PATCH /api/admin/contact/:id` | `contact.request.manage` |
| `/admin/data` privileged page | `admin.data.read` |

A repository-wide inventory must be repeated on the migration head before closure. This table is not proof that no additional privileged surface exists.

## 5. Security invariants for the implementation slice

The composition PR that follows this decision must prove:

1. ordinary AUTH-01 access tokens are rejected by the privileged verifier;
2. wrong issuer/audience/token-use claims are rejected;
3. expired privileged tokens are rejected;
4. role/action evaluation is finite and has no wildcard;
5. the MFA assurance encoded by the privileged token cannot be replaced by a request parameter or caller boolean;
6. each web route asks for a specific action rather than a generic `isAdmin` result;
7. `support` and `operator` cannot inherit the new web-admin actions unless a later explicit authority decision changes the matrix;
8. production legacy `ADMIN_TOKEN` authority remains disabled throughout migration;
9. bearer tokens, raw MFA assertions and provider secrets are never written to structured audit events;
10. production activation remains blocked until #175 supplies real provider/staff-directory evidence.

## 6. Dependency / supply-chain boundary

Creating `@emopet/privileged-auth` will require a controlled workspace/manifests/lockfile delta.

The implementation must not manually edit dependency provenance claims or weaken audit gates to make the package pass. Any existing repository-wide dependency findings remain separate blockers unless the new package actually changes their paths or severity.

`jose` should use the repository-controlled version family already present through backend AUTH-01 unless the dependency authority deliberately approves another version.

## 7. Migration order candidate

1. create `@emopet/privileged-auth` with role/action + token verification contract and tests;
2. adapt #170 step-up issuance to consume the shared token contract;
3. adapt #174 authority source to the shared package rather than maintaining a second matrix;
4. add server-only web authorization helper using the shared verifier;
5. migrate one low-risk read-only admin surface first (`moderation.queue.read`) with negative tests and audit-event handoff;
6. migrate mutation surfaces one-by-one;
7. migrate `/admin/data` server page authority;
8. repeat repository search for `isAdmin`, `isAdminTokenValue`, `ADMIN_TOKEN_COOKIE`, `x-admin-token`, and `breiz-admin-token`;
9. remove legacy production authority only after the new route coverage is proven, while #172 remains the interim production fail-closed safety net;
10. do not activate production privileged access until #175 is evidenced.

## 8. Alternatives rejected for this stage

### Per-request backend authorization RPC

Rejected as the default because it adds network/service availability and service-authentication complexity to every privileged request when local verification of a bounded signed token is sufficient.

This can be revisited only if deployment architecture requires centralized online revocation or another property that cannot be provided safely with the short-lived token model.

### Handwritten JWT/HMAC verification in `apps/web`

Rejected. Do not implement.

### Reusing `ADMIN_TOKEN` as a second factor

Rejected. A shared static secret is not individual MFA assurance and is already tracked for production shutdown under #171/#172.

### Moving privileged auth into generic `@emopet/shared`

Rejected for now because that package is broad product surface and could blur the server-only trust boundary.

## 9. Gate state

- Composition architecture: `CANDIDATE DECIDED`.
- Shared privileged-auth package: `NOT IMPLEMENTED`.
- Web route migration: `OPEN`.
- Real MFA provider/staff directory: `OPEN / EXTERNAL-UNVERIFIED`.
- Legacy static admin production authority: `BLOCKED BY #172 CANDIDATE, NOT MERGED`.
- Production privileged access: `NOT AUTHORIZED`.

`G-PRIV-SEC-WEB-MIGRATION-01 = OPEN`

`G-PRIV-SEC-MFA-PROVIDER-01 = OPEN`

`G-PRIV-SEC-READINESS-01 = OPEN`
