# Local Nakama — SPIKE / NOT PRODUCTION AUTHORITY

Issue #565, parent #48, draft PR #566. Synthetic local testing only. No Unity,
production deployment, paid cloud, or canonical database migration.

## Prerequisites

- Docker Engine/Desktop with Compose v2 and a running Linux-container engine.
- Node **22 or newer** for this optional spike's native WebSocket; tested with Node 24.19.0.
  The repository's other Node >=20 paths are unchanged; enabling this spike without
  WebSocket fails at configuration time.
- pnpm **10.33.0** (the repository packageManager), dependencies and backend build.
- Ports 7350 and 7351 free on loopback. PostgreSQL is not published to the host.

All commands below run from the repository root. Never substitute the root
`docker-compose.yml`: this stack has its own project, network and volume.

## Configure, start, check

These UUIDs are synthetic fixtures for the integration harness, not production accounts:

```sh
node infra/nakama/configure.mjs 11111111-1111-4111-8111-111111111111 22222222-2222-4222-8222-222222222222
docker compose --env-file infra/nakama/.env -f infra/nakama/compose.yml config --quiet
docker compose --env-file infra/nakama/.env -f infra/nakama/compose.yml up -d --wait
docker compose --env-file infra/nakama/.env -f infra/nakama/compose.yml ps
docker compose --env-file infra/nakama/.env -f infra/nakama/compose.yml exec -T nakama /nakama/nakama healthcheck
```

The configurator creates independent random local secrets, refuses to overwrite an
existing `.env`, and leaves API activation disabled. `.env.example` contains no usable
credentials. The entrypoint rejects placeholders and requires 64-character hex secrets.
Do not run `compose config` without `--quiet` in captured output: expanded values are secrets.
The console is at http://127.0.0.1:7351 with user `spike` and the locally generated password.
Treat the local console, Docker control socket and runtime key as trusted operator access.

## Build and run tests

```sh
pnpm install --frozen-lockfile --filter '@emopet/api...'
pnpm --filter '@emopet/api^...' build
pnpm --filter @emopet/api build
pnpm --filter @emopet/api typecheck
pnpm --filter @emopet/api test
```

The live test is also the two-user local harness: it mounts the real Hono routes in
process, signs synthetic access tokens using the canonical signer and verifies them
with the canonical middleware, then calls the actual Nakama transport. It does not
provision canonical PostgreSQL users or exercise register/login/refresh storage.

PowerShell, including deliberate stop/restart of **only this Nakama service**:

```powershell
$env:WORLD_SPIKE_INTEGRATION = 'true'
$env:WORLD_SPIKE_OUTAGE_TEST = 'true'
node --env-file=infra/nakama/.env --test backend/test/world-spike-live.test.mjs
Remove-Item Env:WORLD_SPIKE_INTEGRATION, Env:WORLD_SPIKE_OUTAGE_TEST
```

POSIX equivalent:

```sh
WORLD_SPIKE_INTEGRATION=true WORLD_SPIKE_OUTAGE_TEST=true node --env-file=infra/nakama/.env --test backend/test/world-spike-live.test.mjs
```

Success must include real friendship, group join, presence and chat events, a fresh
bootstrap/rejoin, rejected direct authentication, controlled outage, and recovery.
A skipped live test is not acceptance evidence. Each run leaves disposable social
metadata; reset this stack when finished. Chat joins always use `persistence: false`.

## Optional Hono API mounting

Use existing local EMOPET auth configuration and valid access JWTs. Configure both
Nakama and Hono allowlists with the same synthetic canonical users. Load `.env` into
the backend process, set `WORLD_NAKAMA_SPIKE_ENABLED=true` and `NODE_ENV=development`.
Do not reuse real account identifiers or production JWT secrets. The main API retains
its own database prerequisites; the standalone harness above needs only Nakama's DB.

Routes under `/api/world-spike` all require `Authorization: Bearer <EMOPET access JWT>`:

| Method/path | Body/result |
|---|---|
| POST `/bootstrap` | `{}` → `{handle, expiresAt, state}`; renewal accepts `{previousHandle}` |
| POST `/sessions/:handle/commands` | Strict command below → `{result}` |
| GET `/sessions/:handle/events` | Drains up to 100 events; `{state, events, resyncRequired}` |
| DELETE `/sessions/:handle` | Close this actor's socket; 204 |

Commands: `friends.list`; `friends.request`/`friends.accept` with `targetUserId`;
`groups.create` with `name`; `groups.list`; `groups.join`/`groups.leave`/`chat.join`
with `groupId`; `presence.follow` with `targetUserId`; `presence.update` with
`status: online|away`; `chat.send` with `groupId` and `text` (1–1000 characters).
`targetUserId` identifies another allowlisted synthetic participant, never the actor.
Both participants must bootstrap before friend/presence operations. Accept requires
an incoming request; an unknown chat channel cannot send. Extra fields are rejected.

On a disconnect, call bootstrap with a still-valid prior handle and a freshly verified
EMOPET access JWT. The handle is replaced, presence subscriptions/status and joined
chat channels restored. Do not retry uncertain writes: reconcile lists or report
uncertain delivery. After handle expiry, bootstrap with `{}` and explicitly subscribe
again. If EMOPET access expires, use the existing canonical auth refresh route first.
There is no Nakama refresh token or offline write queue.

## Stop, reset, rollback

Stop and preserve Nakama-only metadata:

```sh
docker compose --env-file infra/nakama/.env -f infra/nakama/compose.yml down
```

Reset **destroys only this spike's named volume** (users/mappings/friends/groups):

```sh
docker compose --env-file infra/nakama/.env -f infra/nakama/compose.yml down --volumes
docker compose --env-file infra/nakama/.env -f infra/nakama/compose.yml up -d --wait
```

After reset, transport UUIDs may change; rebootstrap every participant. Never restore
an old handle. Disable the API flag and restart Hono to remove the route mount and all
process-local sessions. Stop the isolated stack to complete rollback.

## Troubleshooting and remaining gates

- `unavailable`/`timeout` is a controlled 503, never a fabricated success; expired or
  cross-user handles are 401, unknown actors 403, concurrent operations 409.
- Validate Docker availability and container health before debugging JWTs.
- Runtime allowlists must match; changing `.env` requires recreating Nakama.
- Keep signing keys/runtime keys out of logs, screenshots and PR descriptions.
- Build before Node tests, which import `backend/dist` by repository convention.
- Production privacy/moderation/retention/block propagation and immediate logout
  revocation remain gated. This harness is not permission to activate World.

See [architecture and evidence](../../docs/architecture/WORLD_NAKAMA_SPIKE_2026-09-25.md).
