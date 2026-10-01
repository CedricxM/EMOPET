# WORLD Unity live validation — 2026-10-01

Status: **PASS / SPIKE EVIDENCE / NOT PRODUCTION AUTHORITY**

## Environment

- Unity Editor: **6000.3.25f1**
- Project: `unity/world`
- Named test: `Emopet.World.Tests.WorldBackendClientLiveTests.LiveTwoUserBootstrapPresenceChatRenewalAndDegradedTransport`
- Hono harness: `127.0.0.1:37651`
- Nakama: `127.0.0.1:7350`
- Result: **PASS**
- Duration: **2.487 s**

The existing 32/32 Editor baseline from #772 is separate evidence and is not counted as this live result.

## What the live scenario exercised

The named EditMode test used the real Unity `UnityWebRequestWorldHttpTransport` and exercised:

1. two synthetic World session bootstraps;
2. canonical friend visibility;
3. opt-in presence follow/update and event delivery;
4. group creation and join;
5. preset-only chat delivery;
6. session renewal with chat-subscription restoration;
7. no-response transport failure reaching `WorldSessionState.Degraded`.

The harness remains loopback-only, rejects production mode, uses the canonical Hono World routes and backend access-token signer, and keeps Nakama credentials outside Unity.

## Hang found and corrected

The live scenario initially reproduced a hang in the degraded-transport assertion path. Source commit `afa5b5e4b4ab30b67aefc94940b4049bb4ba20f0` replaced synchronous `Assert.CatchAsync` handling with awaited `try/catch`. The same named scenario then completed successfully in **2.487 s**.

## Provenance

Source validation PR: #865.

Source branch: `spike/world-unity-live-567-20260930`.

Before reconstructing this evidence on current `main`, the repository diff from the tested PR base `d88baa5ed27964fafe012ce44891cdde2c199ce4` to `main@0c8da12a4dca85d608c4d1aebf3b2e65b654f1d0` changed only production runtime-config authority files. No World backend, Unity World client, live harness, or World authority-guard surface exercised by the test changed in that interval.

## Non-claims

This evidence does **not** authorize:

- production World release;
- production credentials or direct Unity → Nakama authority;
- durable client-side identity/social/privacy authority;
- production deployment readiness;
- playtest/product-value conclusions.

The result closes the named live Unity transport evidence gate for the spike only.
