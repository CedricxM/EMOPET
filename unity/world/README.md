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

## Validation

When Unity 6000.3.25f1 is available, run EditMode tests from the Test Runner or batch mode.
Until an Editor run exists, repository review is **static only**.

Before any merge:
1. open the project in the pinned Editor;
2. let Unity generate/import required metadata;
3. commit generated `.meta` files after review;
4. run EditMode tests;
5. confirm zero Console compile errors;
6. keep the PR draft until explicit approval.
