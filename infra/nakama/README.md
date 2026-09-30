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

Use existing local EMOPET auth configuration and valid access JWTs. Access is canonical
(#596, decision #48 L1): grant `world_pilot_access` to each synthetic tester with
`drizzleWorldPilotAccess().grant(userId, adultSelfDeclaredAt)` and keep a live login
(unrevoked refresh session). `WORLD_SPIKE_TEST_USER_IDS` now only feeds the Nakama runtime
allowlist, a derived projection the backend never reads. Load `.env` into
the backend process, set `WORLD_NAKAMA_SPIKE_ENABLED=true` and `NODE_ENV=development`.
Do not reuse real account identifiers or production JWT secrets. The main API retains
its own database prerequisites; the standalone harness above needs only Nakama's DB.

Routes under `/api/world-spike` all require `Authorization: Bearer <EMOPET access JWT>`:

| Method/path | Body/result |
|---|---|
| POST `/bootstrap` | `{}` → `{handle, expiresAt, state}`; renewal accepts `{previousHandle}` |
| POST `/sessions/:handle/commands` | Strict command below → `{result}` |
| GET `/sessions/:handle/events` | Drains up to 100 events; `{state, events, resyncRequired}` |
| POST `/sessions/:handle/reports` | Report below → `201 {report}` in the canonical moderation queue |
| DELETE `/sessions/:handle` | Close this actor's socket; 204 |

Reports (#594): `{kind: "world_user", targetUserId, reason, details?}` or
`{kind: "world_message", senderId, messageId, reason, details?}` where `senderId`/`messageId`
come from a chat event actually delivered to that verified session. `reason` is one of
`spam|harassment|illegal|unsafe|other`; `details` ≤ 500 characters. The server keeps only a
bounded in-memory attribution receipt (max 100 message ids, no message content) and resolves the
Nakama sender to the canonical person. Fabricated/unseen messages, unknown senders and
self-reports are 400. Reporting remains possible across a later block. Mounting needs the
canonical database (`community_reports`).

Commands: `friends.list` (canonical connections, #595: people connect through
`/api/connections`, never through World);
`groups.create` with `name`; `groups.list`; `groups.join`/`groups.leave`/`chat.join`
with `groupId`; `presence.follow` with `targetUserId`; `presence.update` with
`status: online|away`; `chat.send` with `groupId` and `presetId`, one of the #46 Quiet
Social Layer presets (`salut`, `par-ici`, `trouve`, `pret`, `attends`, `bien-joue`, `merci`,
`je-quitte`, `pas-maintenant`); only the id travels and clients render the label. Free text
(`chat.send_text` with `text`, 1–1000 characters) exists only behind
`WORLD_SPIKE_FREE_TEXT=true`, off by default (decision #48 L4).
`targetUserId` identifies another participant with pilot access, never the actor.
Both participants must bootstrap before presence operations. An unknown chat channel cannot
send. Extra fields are rejected.

Presence (#595, decision #48 L2) is **invisible by default**. `POST /sessions/:handle/presence`
opts in for this session only (canonical `world_presence_consents`, expiring with the session);
only then does `presence.update` work (otherwise 403). `presence.follow` works only between
mutually connected people and only if the target opted in (otherwise 404, like offline).
Presence events show arrivals of consenting connections and departures of connections, with
only `user_id` and `online|away`. `DELETE /sessions/:handle/presence` withdraws consent and
closes the socket first; a new bootstrap starts invisible.
A target that is offline **or blocked either way** (canonical `/api/blocks`, #594) returns
`404 unreachable` — deliberately the same answer — and the blocked participant disappears
from connection lists, presence and chat events. A definite rejection (self-target, Nakama 4xx,
socket error reply) returns 400/404 **without** closing the session. Only a timeout or transport
failure — where the write may have happened — degrades and closes it.

Revocation (#596, decision #48 L7): canonical logout, logout_all and pilot-access revocation
close the actor's live handles at once. Every request also re-reads canonical access for the
actor and for any target, so a revocation made outside this process applies at the next
request: `403 forbidden` for the actor, `404 unreachable` for a target.

On a disconnect, call bootstrap with a still-valid prior handle and a freshly verified
EMOPET access JWT. The handle is replaced, presence subscriptions/status and joined
chat channels restored. A follow whose target is currently offline is dropped rather
than failing renewal; follow again once that participant bootstraps. Do not retry uncertain writes: reconcile lists or report
uncertain delivery. After handle expiry, bootstrap with `{}` and explicitly subscribe
again. If EMOPET access expires, use the existing canonical auth refresh route first.
There is no Nakama refresh token or offline write queue.

## Account erasure and end-of-pilot reset (#48 L6)

Decision #48 L6 B sets a minimal footprint. Real users stay blocked until #478 signs the
"World transport metadata" line.

- **Chat is never persisted.** Chat joins use `persistence: false`, so Nakama stores no message.
- **Account erasure deletes the Nakama account.** A canonical
  `revokeActor(userId, 'account_deletion')` closes the person's live handles. It then calls the
  runtime RPC `emopet_delete_account`, which is server-to-server only (runtime HTTP key), takes
  a strict payload and is not allowlist-gated, so a person already removed from the projection
  can still be erased. The RPC deletes the account without a tombstone. The adapter also forgets
  the transport-id mapping and clears live-session report-attribution receipts for that person,
  so the erased account can no longer be reported through an old transport id/message receipt.
  Canonical account deletion does not exist yet; when built, it must call `revokeActor` with that
  reason.
- **A failed purge is not retried.** It is logged without identifiers. Until the canonical
  deletion flow confirms the purge itself, the end-of-pilot reset below is the backstop.
- **End-of-pilot reset.** At the end of every pilot, run the reset below (`down --volumes`). It
  destroys everything Nakama held: accounts, mappings, groups and group names.
- **Logs.** Nakama runs at `--logger.level WARN`. The World adapter logs no chat content and no
  identifiers.

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
  cross-user handles are 401, unknown actors 403, unreachable (offline or blocked) 404,
  concurrent operations 409.
- Mounting the API needs the canonical EMOPET database for block and pilot-access checks
  (`DATABASE_URL`); if either cannot be read, World fails closed with 503. The standalone live harness uses
  an in-memory block policy and needs only Nakama.
- Validate Docker availability and container health before debugging JWTs.
- Git Bash on Windows: prefix `docker compose exec` with `MSYS_NO_PATHCONV=1`, otherwise
  `/nakama/nakama` is rewritten to a Windows path and the exec fails.
- The Nakama runtime allowlist (projection) must include every tester granted
  `world_pilot_access`; changing `.env` requires recreating Nakama.
- Keep signing keys/runtime keys out of logs, screenshots and PR descriptions.
- Build before Node tests, which import `backend/dist` by repository convention.
- Logout and logout_all now close World sessions at once (#596). Account deletion and
  moderation suspension do not exist yet and must call `revokeActor` when built; for account
  deletion, that call also deletes the Nakama account (#48 L6). Production
  privacy/moderation/retention remain gated. This harness is not permission to activate World.

See [architecture and evidence](../../docs/architecture/WORLD_NAKAMA_SPIKE_2026-09-25.md).
