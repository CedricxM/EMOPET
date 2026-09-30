# WORLD-NAKAMA-01 — SPIKE / NOT PRODUCTION AUTHORITY

Issue #565 · parent #48 · branch `spike/world-nakama-565` · draft PR #566.
This is an isolated, reversible social transport experiment. Local live-stack acceptance
passed on 2026-09-27 (see below). **No production activation, Unity activation, or merge
authorization.**

## Observed base and decision

Inspected seed `f82adde9a5b68ba4a8def5b07541230750b73739`, both issues and comments,
the execution brief, AGENTS/CLAUDE, root context gate and architecture, and canonical
auth middleware/routes/security/session services and tests. At that commit, auth
register/login/refresh are implemented and the root Compose is PostgreSQL-only.
Older architecture/issue prose calling them stubs or a Python deployment is stale.
This spike neither changes that deployment path nor repairs unrelated documentation.

One `WorldRealtimeAdapter` under `backend/api/services/world-spike` owns transport
sessions, operation deadlines, bounded events, and lifecycle. Routes use the existing
Hono `authMiddleware`; there is no Next.js prototype auth or client identity fallback.
Nakama's official JS SDK 2.8.0 supplies REST calls and session decoding. A narrow Node
WebSocket implementation uses the official JSON envelopes for presence/group chat.
The SDK socket heartbeat references browser `window`; the Node implementation instead
closes connecting sockets, rejects pending operations and clears its own timers.
Node >=22 is required only when enabling this optional spike; tested here on Node 24.

Bootstrap derives `emopet:world-spike:v1:<lowercase canonical UUID>` from the verified
EMOPET actor. A runtime-key-authenticated server RPC calls `authenticateCustom` and
`authenticateTokenGenerate`. The returned Nakama UUID is stable while its isolated DB
survives; reset can change it. The custom ID provides an auditable mapping, not a
second identity authority. No mapping migration or canonical DB writes are needed.
Public custom authentication/link/unlink are rejected. Device/email/social-provider
authentication hooks are denied. User-token calls to the bootstrap RPC are rejected.
No Nakama refresh credential is issued; SDK automatic refresh is disabled.

The backend retains Nakama tokens and socket ownership. Callers receive only an
opaque handle, expiry and connection state. Every operation requires a valid EMOPET
JWT and matching actor/handle. Body actor/owner fields are rejected; `targetUserId`
selects another participant with pilot access, not the caller. Protected-domain
commands are absent and unknown fields fail validation. Backend access is canonical
`world_pilot_access` plus a live login (#596); the Nakama runtime keeps an env allowlist
as a derived projection.
Production/unspecified environment activation is rejected; the feature flag defaults off.

## State ownership

| State | Authority / location | Spike disposition |
|---|---|---|
| EMOPET identity and access/refresh sessions | Existing Hono/JWT and canonical auth storage | Reused, never replaced by Nakama |
| Consent/privacy, visibility/sharing | Canonical EMOPET policy | No reads/writes or inferred consent; real-user activation blocked |
| User-to-user blocks | Canonical EMOPET `user_blocks` (#594, PR #636) | Read-only through the `WorldBlockPolicy` port; enforced by the adapter (see below); never stored in Nakama |
| Moderation, reports, audit truth | Canonical EMOPET backend (`community_reports`, #594) | World reports written through the `WorldReportSink` port; Nakama holds no report |
| Dog ownership, ELI/science, billing/subscription | Canonical EMOPET domains | No repository imports, payload fields or write paths |
| Keepsakes/personal-space and other durable product state | Canonical EMOPET, separately gated | No implementation |
| Custom-ID ↔ Nakama UUID | Disposable Nakama account metadata | Derived from verified actor; resettable projection |
| Connections (trust ladder) | Canonical `social_connections` (#595) | World writes no Nakama friend edge; the list is served from canonical state |
| Groups/membership | Disposable Nakama spike DB | Synthetic experiment only; not canonical social graph or privacy policy |
| Presence and chat | Nakama realtime transport | Status limited to online/away; chat persistence disabled |
| Tokens, sockets, subscriptions, handles | Hono process memory | Expire, disconnect, restart or replacement clears them |
| Received events | Bounded Hono memory buffer | 100 events per session; drain-on-poll; overflow signals resynchronization |

### Canonical blocks in World (#594, decision #48 L5)

The adapter takes a `WorldBlockPolicy` (`isBlockedEitherWay`) port; `configuredWorldSpike`
wires the canonical `drizzleUserBlockRepository`, so World cannot start without it. A block
in either direction makes the two participants **mutually and silently invisible**:

- `presence.follow` towards the other person returns
  `404 unreachable`, the same answer as an offline participant, before any Nakama call;
- presence (`joins`/`leaves`) and chat events are filtered **when read**, so a
  block also hides events already buffered before it existed; the actor's own events stay;
- renewal drops a restored follow whose target is now blocked;
- participants unknown to this process and unknown event shapes are dropped (fail closed);
- if the block state cannot be read, commands and event reads return `503 unavailable`
  without degrading the session, and buffered events stay queued (bounded) until checkable.

Group membership and chat joins are not blocked: blocks act on visibility, not on shared
groups. Since #595 the canonical block also dissolves the connection itself.

### Pilot access, revocation and presets (#596, decisions #48 L1, L7, L4)

- **L1 pilot access.** The synthetic-UUID env allowlist is gone from the backend. Canonical
  `world_pilot_access` (migration 0026, canonical PR for #596) holds invited adult testers: no
  grant without a prior self-declared adulthood timestamp, revocation keeps the row. Eligible =
  account exists + unrevoked grant + a live login (unrevoked, unexpired refresh session), read
  through the `WorldAccessPolicy` port at bootstrap and on every request, for the actor and for
  any target. Unknown access state fails closed (503).
- **L7 revocation.** `WorldRealtimeAdapter.revokeActor` closes every live handle of a person at
  once, including a bootstrap in flight (a generation counter refuses to register it). The
  configured spike subscribes it to the canonical `actor-revocation` hook, which logout,
  logout_all and pilot revocation call after commit. A revocation made outside the process
  applies at the next request (403 for the actor, 404 `unreachable` for a target).
- **L4 presets.** `chat.send` carries only a preset id from the #46 Quiet Social Layer first slice
  (Salut, Par ici, J'ai trouvé quelque chose, Prêt·e, Attends, Bien joué, Merci, Je quitte, Pas
  maintenant); clients render the label. Free text is a separate command, `chat.send_text`,
  refused unless `WORLD_SPIKE_FREE_TEXT=true` (off).

Still open: account deletion and moderation suspension do not exist in the canonical model, and
real users stay blocked until #478 signs the World transport-metadata line (L6).

### Connections and presence consent (#595, decisions #48 L3 + L2)

Trust-ladder transitions were decided by the founder on #595 (issuecomment-5866924308).

- **L3 connections.** Canonical `social_connections` (migration 0027, canonical PR for #595):
  - request + acceptance;
  - silent decline that only the decliner can reopen;
  - one-action removal;
  - directional user-granted TRUSTED on top of CONNECTED;
  - BLOCKED overrides everything, and a block dissolves the connection;
  - CONTEXTUAL_ACQUAINTANCE is modelled but not produced yet.

  World reads it through the `WorldSocialPolicy` port: `friends.list` returns canonical
  connections, `friends.request` / `friends.accept` no longer exist, and **World writes no
  Nakama friend edge**. A Nakama reset therefore loses nothing.
- **L2 presence.** Invisible by default:
  - `POST /sessions/:handle/presence` records a canonical consent (`world_presence_consents`)
    that expires with the session;
  - `presence.update` needs it;
  - `presence.follow` needs a mutual connection and the target's consent (otherwise
    `unreachable`).

  Presence events show:
  - arrivals of consenting connections;
  - departures of connections, so a withdrawal is seen;
  - only `user_id` and `online|away`.

  Every other transport field is dropped. Chat events are reduced to the sender, message id
  and preset. Withdrawal closes the socket before recording, so Nakama shows the person
  offline at once. A renewal keeps the opt-in only while consent is active; a fresh bootstrap
  starts invisible.
- Unknown social state fails closed (503) without degrading the transport session.

### Retention and erasure (#48 L6)

Decision L6 B sets a minimal-footprint pilot. It sets no retention duration and no legal basis:
those belong to the #478 "World transport metadata" line, and no real user is allowed before
it is signed.

- **Chat.** Never persisted (`persistence: false`).
- **Erasure.** `revokeActor(userId, 'account_deletion')` closes the live handles, then calls
  `emopet_delete_account` to delete the Nakama account.
  - The RPC is server-to-server and strict, and it is not allowlist-gated.
  - It leaves no tombstone.
  - The adapter also forgets the transport-id mapping.
- **Deletion flow.** Canonical account deletion does not exist yet. When built, it must call
  that hook and should confirm the purge. Today a failed purge is only logged, without
  identifiers.
- **End of pilot.** The operator resets the Nakama volume (runbook in `infra/nakama/README.md`).
  This also removes any group names.
- **Logs.** Nakama logs at WARN. The adapter logs neither chat content nor identifiers.

### World reports (#594)

`POST /sessions/:handle/reports` files `world_user` or `world_message` reports into the
canonical moderation queue (`community_reports`, migration 0025 in PR #636), so they share
the moderation-evidence retention clock and the approved reporter DETACH (#446). The adapter
resolves the reported person from the verified session: a participant met in World, or the
**Nakama sender id of a received message translated to its canonical id** (unknown senders
and self-reports are refused). Only the message id is stored, never its content (L6).
Reporting deliberately works across blocks. Without a wired sink the route returns 503
rather than pretending to file. On erasure of the reported person's account, their id is
detached (`ON DELETE SET NULL`) and the report kept only within the moderation-evidence
window (founder decision D5 on #594, mirroring reporter D4 #446).

No EMOPET database credentials are mounted into Nakama. Its separate PostgreSQL
volume persists transport metadata, not durable product authority. Chat text must be
synthetic test content; nonpersistent delivery is not a general retention guarantee
for all Nakama metadata, operator logs, memory, or backups.

## Sequences

```mermaid
sequenceDiagram
  participant C as Synthetic harness
  participant H as Hono JWT boundary
  participant A as WorldRealtimeAdapter
  participant N as Nakama runtime
  C->>H: POST bootstrap + EMOPET access JWT
  H->>H: Verify signature, issuer, audience, use, UUID and expiry
  H->>A: Verified actor + access expiry
  A->>A: Require synthetic allowlist
  A->>N: Server-only bootstrap RPC + derived custom ID
  N->>N: Runtime key + allowlist; reject user-session RPC
  N-->>A: Transport UUID + short-lived token
  A->>N: Connect server-held socket
  A-->>C: Opaque actor-bound handle, bounded expiry
```

```mermaid
sequenceDiagram
  participant C as Two synthetic participants
  participant H as Hono + adapter
  participant N as Nakama social transport
  Note over C,H: Connections are made through canonical /api/connections (#595)
  C->>H: A creates disposable group
  H->>N: Create spike-prefixed group
  C->>H: B joins returned group ID
  H->>N: Join as authenticated B
  N-->>C: Membership via adapter response
```

```mermaid
sequenceDiagram
  participant C as Synthetic harness
  participant H as Hono + adapter
  participant N as Nakama socket
  C->>H: Follow B / update own status (JWT + handle)
  H->>N: status_follow / status_update
  C->>H: Join group chat
  H->>N: channel_join, group type, persistence=false
  C->>H: Send synthetic text to joined group
  H->>N: channel_message_send
  N-->>H: Presence and chat events
  H->>H: Bound queue to 100; mark overflow
  C->>H: Authenticated events poll
  H-->>C: Drain events + resyncRequired
```

```mermaid
sequenceDiagram
  participant C as Synthetic harness
  participant H as Hono + adapter
  participant N as Nakama
  N--xH: Disconnect / heartbeat failure / timeout
  H->>H: Close socket; mark degraded; reject pending work
  C->>H: Bootstrap previous handle + valid EMOPET JWT
  H->>H: Reverify canonical auth; invalidate old handle
  loop At most 3 attempts; 250ms then 500ms backoff
    H->>N: Fresh server-only bootstrap and socket
  end
  H->>N: Restore follows/status/chat subscriptions only
  H-->>C: New handle or controlled 503
  Note over H,N: Never replay chat or uncertain social mutations
```

## Failure and authority gates

- Operations have five-second deadlines. Bootstrap HTTP is aborted; sockets close on
  timeouts and pending requests reject. REST writes may already have committed when a
  deadline fires: report failure/uncertainty, reconcile reads, never blindly replay.
- One active handle per synthetic actor; concurrent bootstrap/commands fail with 409.
  Handles expire at the earlier of canonical JWT expiry and the five-minute Nakama
  token. Every request rechecks authentication; expiry timers also close idle sockets.
- Reconnect is initiated by an authenticated caller, not a background identity refresh.
  A valid previous handle restores subscriptions; an expired handle requires a new
  empty bootstrap and explicit re-subscription. Failed renewal invalidates the old handle.
- Response errors are bounded codes: 400 invalid request, 401 invalid session, 403
  forbidden actor, 409 busy, 503 unavailable/timeout with degraded state. No credentials,
  raw upstream error details or fabricated offline success are returned.
- Existing EMOPET access JWTs do not carry refresh-family revocation state, and this spike
  does not change that contract. Since #596, World no longer relies on it: canonical
  logout/logout_all close World handles at once, and bootstrap plus every request require a
  live login. Account deletion and moderation suspension do not exist yet; they remain
  release blockers and must call `revokeActor` when built. For account deletion, that call
  also deletes the Nakama account (L6).
- Consent, visibility, moderation/audit, block/report propagation,
  retention/deletion and real-user group rules need controlled product/backend decisions.
  Their implementation is stopped: no decision is inferred from Nakama defaults.
- Lists are deliberately bounded to the first 100 records. This is sufficient for the
  two-user fixture, not a complete product social API. No durable offline event replay,
  multiprocess routing, scaling, or production authorization is claimed.

Kill gate: keep World activation disabled. Review the live acceptance evidence first;
even a green local slice does not close product/privacy/moderation or Unity #567 gates.

## Validation evidence — 2026-09-25

Windows, Node `v24.19.0`, pnpm `10.33.0`. The host's default `pnpm` was 11.19.0;
its initial install was interrupted. Subsequent commands used the exact repository
version through `node ../tooling/package/bin/pnpm.cjs` (an untracked workspace tool).
Below, `pnpm10` means that exact executable invocation from the checkout root.

| Exact command | Observed result |
|---|---|
| `pnpm10 --filter @emopet/api add --save-exact @heroiclabs/nakama-js@2.8.0` | Exit 0; SDK plus three new transitives added; fourth transitive already present; existing resolutions unchanged |
| `pnpm10 install --frozen-lockfile --filter '@emopet/api...'` | Exit 0; 4 workspaces; existing supply-chain policy retained; Scarf install script not approved/executed |
| `pnpm10 --filter '@emopet/api^...' build` | Exit 0; shared, privileged-auth and eli-engine |
| `pnpm10 --filter @emopet/api build` | Exit 0 |
| `pnpm10 --filter @emopet/api typecheck` | Exit 0 |
| `node --test backend/test/world-spike*.test.mjs` | 19 passed, 1 live test skipped, 0 failed |
| `pnpm10 --filter @emopet/api test` | 392 tests: 357 passed, 35 skipped, 0 failed |
| `node --check infra/nakama/runtime/world.js` | Exit 0 |
| `node --check infra/nakama/configure.mjs` | Exit 0 |
| Git-bundled `sh.exe -n infra/nakama/start.sh` | Exit 0 |
| `git diff --check` | Exit 0 |
| `docker compose --env-file infra/nakama/.env -f infra/nakama/compose.yml config --quiet` | Blocked, exit 1: Docker command unavailable |

Initial builds ran before dependency links were complete and failed with missing modules;
installing the complete backend dependency closure resolved those errors. An initial full
test run had one unrelated generated-catalogue comparison failure because Git for Windows
checked out CRLF. Restoring that untouched file's exact HEAD bytes fixed it without a
source change. The new body-size test also caught and fixed an error-handler translation
from 413 to 503 before final validation.
Pinned Nakama source review also corrected the node name to meet its 16-character
limit and verified runtime hook names and CLI environment handling. These static
checks do not replace a real server start.

**Not proven on 2026-09-25:** Docker was unavailable; superseded by the live run below.
Existing database-dependent test skips remain skips.

**Mocked:** adapter unit tests inject connections/clock/backoff; transport tests replace
fetch and native WebSocket while exercising real SDK REST/JSON socket translation;
runtime tests execute the ES5 module in Node VM with fake Nakama functions. They establish
contract/lifecycle behavior, not a live-stack pass. The live harness additionally uses
synthetic canonical JWT issuance, not real account registration and refresh persistence.

## Live validation evidence — 2026-09-27

Windows 11, Docker Desktop 4.92.0 (Engine 29.8.0, WSL2, machine-wide install),
Node `v24.21.0`, pnpm `10.33.0` via corepack. Images `postgres:16.8-alpine` and
`registry.heroiclabs.com/heroiclabs/nakama:3.37.0`. In Git Bash, `docker compose exec`
needs `MSYS_NO_PATHCONV=1` or the container path is rewritten to a Windows path.

| Exact command (repo root, `C` = `docker compose --env-file infra/nakama/.env -f infra/nakama/compose.yml`) | Observed result |
|---|---|
| `$C config --quiet` | Exit 0 |
| `$C up -d --wait` | Exit 0; postgres healthy, then nakama healthy (depends_on gate honoured) |
| `$C ps` | Both services `Up (healthy)` |
| `$C exec -T nakama /nakama/nakama healthcheck` | `healthcheck ok`, exit 0 |
| `$C logs nakama` | `Applying database migrations` → `Successfully applied migration count=18`; no WARN/ERROR lines after startup |
| `curl http://127.0.0.1:7350/healthcheck` | HTTP 200 |
| `WORLD_SPIKE_INTEGRATION=true WORLD_SPIKE_OUTAGE_TEST=true node --env-file=infra/nakama/.env --test backend/test/world-spike-live.test.mjs` (first run) | **Fail**: `groups.list` → 503 `unavailable/degraded` (defect below) |
| same, after fix | **Pass**, 1/1, ~9.3 s |
| `pnpm --filter '@emopet/api^...' build` / `pnpm --filter @emopet/api build` / `typecheck` | Exit 0 / 0 / 0 |
| `node --test backend/test/world-spike-transport.test.mjs` | 3 passed (includes new regression assertions) |
| `pnpm --filter @emopet/api test` | 392 tests: 357 passed, 35 skipped, 0 failed |

The passing live run proves, against the real Nakama and PostgreSQL: server-side bootstrap
from canonically signed/verified EMOPET JWTs for two synthetic users; friend request and
accept (when a request is pending; repeat runs may already be friends); group create, join, list and leave; presence follow and status update with a
presence event delivered; group chat join (`persistence: false`) and message delivery;
handle renewal with a fresh JWT that invalidates the old handle (401) and restores the
chat subscription (message after reconnect delivered); direct `authenticate/custom`
rejected (403); bootstrap RPC without runtime key rejected (401); bootstrap RPC from a
user session rejected (403); `docker compose stop nakama` → renewal returns controlled
503 `degraded`; `up -d --wait nakama` → fresh bootstrap `connected`.

**Defect found and fixed.** `@heroiclabs/nakama-js` 2.8.0 `Client.listUserGroups(session,
userId, state, limit)` forwards its arguments to the generated REST client as
`(limit, state)`. The adapter's `limit=100` was sent as `state=100`, which Nakama rejects
with 400 `Invalid state`; the adapter correctly failed closed as 503. Mocked tests could
not see this. Fix: omit both arguments so the server default page (100) applies. A
transport regression assertion now checks that no `state` query parameter is sent and
that `listFriends` (argument order correct in the SDK) still sends `limit=100`.

**Code review follow-up (same day).** A high-effort review of the full diff found four
defects, all fixed with regression tests and re-validated live:
(1) any command error, including definite rejections and target resolution, degraded
and closed the actor's own session — now only timeouts/transport failures degrade, and
SDK 4xx responses map to `invalid_request`; (2) renewal failed entirely when a
followed participant was offline — that follow is now dropped from the restore set;
(3) self-targeting was not rejected — now 400 before any transport call; (4) the Nakama
runtime allowlist was not trimmed/lowercased like Hono's. Re-decoding the verified JWT
for `exp` in the route was kept: the canonical `AuthPayload` does not carry `exp`, and
the canonical auth middleware is out of scope. After fixes: `pnpm --filter @emopet/api
test` 395 tests, 360 passed, 35 skipped, 0 failed; spike suites 22 passed; live harness
(with outage) passed after `up -d --force-recreate --wait nakama` to reload the runtime.

**Block enforcement (#594, same day).** The branch is stacked on PR #636 (canonical
`user_blocks`). The live harness now blocks A→B on the real Nakama and checks that B's
friend request returns `404 unreachable`, that B's group message is filtered from A's events
while A's own marker message arrives, that B is hidden from A's friend list, and that
unblocking restores visibility. The full live run (with outage/recovery) passed in ~12.6 s.
`pnpm --filter @emopet/api test`: 430 tests, 388 passed, 40 skipped, 2 failed — both
Windows-checkout artefacts unrelated to World (generated catalogue CRLF bytes, which pass
after restoring HEAD bytes, and a pre-existing `\`-vs-`/` path comparison in the ELI
importer test); spike + block unit suites: 33 passed.

**Environment notes.** `pnpm install --frozen-lockfile` aborted with
`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY` because the checkout's `node_modules` was
created by another OS user/store; the existing modules from the same lockfile were
reused unchanged and builds passed. Running the live test inside the full
`pnpm test` without `--env-file` fails by design (no runtime key/allowlist).

**Still not proven:** multi-node Nakama, load, production TLS/secrets, real account
registration/refresh persistence (harness uses synthetic canonical JWT issuance), and all
product/privacy/moderation gates listed above.

See [local runbook](../../infra/nakama/README.md) for reproducible commands and reset scope.

## Live validation evidence — 2026-09-28 (#596)

Local Docker Nakama 3.37.0 + PostgreSQL 16.8, two synthetic users, in-memory access policy on the
real transport. `world-spike-live.test.mjs` passed with `WORLD_SPIKE_OUTAGE_TEST=true`. The run
covered:

- presets delivered and identified by message id;
- free text refused (400);
- block filtering and reports;
- an access revoked elsewhere, which refuses the actor (403), invalidates its handle (401),
  refuses its bootstrap (403) and makes it unreachable as a target (404);
- `revokeActor`, which invalidates a fresh handle at once;
- the Nakama outage and recovery.

## Live validation evidence — 2026-09-28 (#595)

Same local stack, with the in-memory connections and consent policy on the real transport.
`world-spike-live.test.mjs` passed with the outage test. It covered:

- the canonical connection list;
- `friends.request` refused (400);
- invisible by default: follow 404, status 403;
- after the opt-in, follow and status work;
- a block dissolves the connection, and unblocking restores nothing;
- in a fresh session, the opt-in shows B to A with `online`;
- withdrawal closes B's socket (401), and A receives B's departure.

## Live validation evidence — 2026-09-28 (#48 L6)

Same local stack, after restarting Nakama with the new runtime. `world-spike-live.test.mjs`
passed with the outage test:

- purging B deletes B's Nakama account;
- a second purge reports that nothing is left;
- a later bootstrap of the same custom id creates a new Nakama user id, so the erased
  account is gone.

## Official sources used

- [Docker Compose installation](https://heroiclabs.com/docs/nakama/getting-started/install/docker/)
  for pinned images, migration startup and healthchecks.
- [Server-to-server RPC](https://heroiclabs.com/docs/nakama/server-framework/runtime-examples/server-to-server/)
  and [v3.37.0 HTTP RPC implementation](https://github.com/heroiclabs/nakama/blob/v3.37.0/server/api_rpc.go)
  for runtime-key auth, rejection of user-session calls, and unwrapped JSON.
- [TypeScript runtime reference](https://heroiclabs.com/docs/nakama/server-framework/typescript-runtime/function-reference/)
  and [runtime types](https://github.com/heroiclabs/nakama-common/blob/master/index.d.ts)
  for account mapping, token generation, registered hooks and account deletion
  (`authenticateCustom` without create, `accountDeleteId` without a recorded tombstone).
- [JavaScript client guide](https://heroiclabs.com/docs/nakama/client-libraries/javascript/),
  [official SDK](https://github.com/heroiclabs/nakama-js), and
  [chat concepts](https://heroiclabs.com/docs/nakama/concepts/chat/) for friend/group REST,
  status envelopes, group chat and nonpersistent joins. Installed SDK source was inspected.
