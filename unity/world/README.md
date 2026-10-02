# EMOPET World Unity spike

> **SPIKE / NOT PRODUCTION AUTHORITY / ISSUE #567**
>
> This project exists to exercise the approved EMOPET World backend boundary.
> It is not a production runtime, and it does not authorize World release or merge.

## Editor

Pinned editor: **Unity 6.3 LTS — 6000.3.25f1**.

Add `unity/world` as a project in Unity Hub using that editor patch.

No render-pipeline package, production art pipeline, scene, prefab, addressable,
analytics SDK, Nakama SDK or Unity Services dependency is intentionally installed
in this first slice.

## Authority boundary

Unity is a rendering/input client. It is **not** durable authority for:

- identity or pilot eligibility;
- consent or visibility;
- social graph / trust state;
- blocks, moderation or audit truth;
- dog ownership;
- ELI / scientific state;
- billing/subscription;
- keepsakes or personal-space persistence.

The client talks to the canonical EMOPET backend under `/api/world-spike`.
It never authenticates directly with Nakama and never owns a Nakama token/socket.

Visibility-changing requests never fabricate certainty. Confirmed presence withdrawal/disconnect clears the local handle. If show-presence, withdrawal or disconnect is cancelled or returns an unknown transport/service outcome, Unity enters `Degraded`, preserves any existing handle only as uncertain evidence, and does not claim visible/invisible/offline state.

## First slice

Assemblies:

- `Emopet.World.Core` — transport-independent state and closed preset contract.
- `Emopet.World.Transport` — authenticated HTTP client for the EMOPET backend.
- `Emopet.World.Session` — client session lifecycle and fail-closed state transitions.
- `Emopet.World.Tests.EditMode` — deterministic contract tests.

There is deliberately no production scene yet.

## Gate 5B dormant gamification read client

`WorldGamificationReadClient` is a **non-activated read-only foundation** for the governed
`GET /api/world-gamification` snapshot.

It:
- accepts no Owner id;
- uses the existing bearer-token provider and HTTP transport;
- supports only `GET`;
- validates only `GLOBAL` or coarse region codes;
- strictly rejects unknown/duplicate JSON fields, raw `sourceRef`, XP/rank/streak expansion and malformed bounded values;
- exposes no write method;
- is not imported by any current scene, coordinator, prefab or runtime component.

Newtonsoft.Json is pinned explicitly because Unity `JsonUtility` ignores unknown response fields and is therefore too permissive for this authority boundary.

This does **not** activate Gate 5 cutover or production World gamification. Before merge/promotion of this Unity slice, run the EditMode test class:

`Emopet.World.Tests.WorldGamificationReadClientTests`

under the pinned Unity Editor **6000.3.25f1** and record the result explicitly.

## Validation

Real workstation Editor evidence was captured through #772:

- Unity Editor **6000.3.25f1**;
- project import and package resolution completed;
- generated `.meta`, package lock and required ProjectSettings were reviewed;
- Console after compile: **0 errors**;
- EditMode baseline: **32/32 passed, 0 failed, 0 skipped**.

That baseline proves repository import/compile/EditMode compatibility only. It is separate from the live Unity → Hono → Nakama validation below and does not authorize production World release.

## Live loopback validation

The first slice can be exercised end-to-end without a scene and without installing a Nakama SDK in Unity.

Prerequisites:
- the isolated Nakama spike is healthy from `infra/nakama/compose.yml`;
- backend dependencies are installed and `@emopet/api` has been built;
- the ignored `infra/nakama/.env` contains only synthetic test ids/secrets.

From the repository root, start the loopback-only Hono harness and keep it running:

```powershell
node --env-file=infra/nakama/.env backend/test/world-spike-unity-host.mjs
```

The host:
- refuses `NODE_ENV=production`;
- accepts only loopback HTTP Nakama;
- binds Hono to `127.0.0.1` only;
- reuses `createWorldSpikeRoutes`, `WorldRealtimeAdapter`, the canonical access-token signer, and the real Nakama transport;
- writes short-lived synthetic access tokens only to ignored `unity/world/Temp/world-live-harness.json`;
- removes that fixture on normal Ctrl+C shutdown;
- never prints access tokens.

With the host running, open the project in Unity 6000.3.25f1 and run:

`WorldBackendClientLiveTests.LiveTwoUserBootstrapPresenceChatRenewalAndDegradedTransport`

Recorded workstation result on 2026-10-01:
- **PASS**;
- duration: **2.487 s**;
- harness: `127.0.0.1:37651`;
- Nakama: `127.0.0.1:7350`;
- no Unity Console error attributable to the named live test was observed in the supplied validation log.

The live EditMode scenario exercises the actual Unity `UnityWebRequestWorldHttpTransport` path through Hono to Nakama for:
- two synthetic session bootstraps;
- canonical friend visibility;
- opt-in presence follow/update and event delivery;
- group creation/join;
- preset-only chat and event delivery;
- session renewal with chat-subscription restoration;
- a real no-response Unity transport failure reaching `Degraded`.

The degraded-transport assertion initially hung when using synchronous `Assert.CatchAsync` handling. The validated test uses awaited `try/catch` instead. If the fixture file is absent, the live test is skipped rather than fabricating success.

Stop the host with Ctrl+C after the run. This remains **SPIKE / NOT PRODUCTION AUTHORITY**.
