# EMOPET World — Unity project context

**Status:** INTEGRATED ON `main` / EDITOR VALIDATION PENDING  
**Issue:** #567  
**Analyzed/created:** 2026-09-28  
**Integrated via:** #749 on 2026-09-30

## Confirmed environment

- Unity: **6.3 LTS / 6000.3.25f1**
- Render pipeline: **unresolved / no SRP package installed in the first slice**
- Input: **unresolved / no Input System package installed in the first slice**
- Networking: **no Unity networking framework and no Nakama SDK**
- Backend boundary: canonical EMOPET HTTP API at `/api/world-spike`
- Scenes/build settings: **none authored yet**
- Production art/content: **none**

## Architecture

`Emopet.World.Core` owns pure client-side state contracts.

`Emopet.World.Transport` talks only to the EMOPET backend. Nakama credentials,
tokens and sockets stay server-side.

`Emopet.World.Session` owns the ephemeral Unity-side session lifecycle:
`SignedOut -> Bootstrapping -> ConnectedInvisible -> ConnectedVisible`, with
explicit `Degraded`, `Revoked` and `Disconnected` states.

Unity renders server-authorized state and initiates requests. It never becomes
durable authority for protected EMOPET domains.

## Backend contract

Base mount: `/api/world-spike`

- `POST /bootstrap`
- `POST /sessions/:handle/commands`
- `GET /sessions/:handle/events`
- `POST /sessions/:handle/presence`
- `DELETE /sessions/:handle/presence`
- `POST /sessions/:handle/reports`
- `DELETE /sessions/:handle`

Errors are bounded to:
`invalid_request`, `invalid_session`, `forbidden`, `unreachable`, `busy`,
`unavailable`, `timeout`.

## Testing

EditMode tests target deterministic state transitions and backend request/error contracts, including terminal presence withdrawal.
No PlayMode, scene, device or build validation has happened yet.

## Tooling

Unity Editor validation is still pending on a real workstation. Repository integration and CI are complete; Editor import/compile/EditMode/device evidence must be captured next.

## Important constraints

- presets only for the first World chat test;
- no free-text UI;
- no location;
- presence is invisible by default and opt-in; confirmed withdrawal/disconnect clears the handle, while cancelled or unknown show/withdraw/disconnect outcomes are represented as `Degraded` uncertainty rather than false visible/invisible/offline claims;
- blocked/offline targets remain deliberately indistinguishable as `unreachable`;
- no per-frame network polling;
- no automatic replay of uncertain writes;
- repository integration is complete, but #49 playtest/editor evidence is still absent, so production client authority remains gated.

## Unknowns before presentation work

- render pipeline;
- mobile target matrix and minimum OS versions;
- input/control scheme;
- scene composition;
- avatar/art pipeline;
- polling cadence and foreground/background policy;
- final auth-token handoff from the shipping EMOPET client.
