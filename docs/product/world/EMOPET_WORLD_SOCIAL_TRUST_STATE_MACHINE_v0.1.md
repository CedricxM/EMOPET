# EMOPET — WORLD SOCIAL TRUST STATE MACHINE v0.1

**Date:** 2026-09-01  
**GitHub:** #46  
**Status:** PROPOSED STATE CONTRACT / NOT IMPLEMENTED

## States

```text
STRANGER
  │
  ├── shared bounded context ──> CONTEXTUAL_ACQUAINTANCE
  │                                  │
  │                                  └── mutual connection accept ──> CONNECTED
  │                                                                       │
  │                                                                       └── explicit permission grant ──> TRUSTED
  │
  └── mutual connection accept ────────────────────────────────────────> CONNECTED
```

Global override:
`BLOCKED`

## Events

- `SHARED_CONTEXT_ENTERED`
- `SHARED_CONTEXT_LEFT`
- `CONNECTION_REQUESTED`
- `CONNECTION_ACCEPTED`
- `CONNECTION_DECLINED`
- `CONNECTION_REVOKED`
- `TRUST_GRANTED`
- `TRUST_REVOKED`
- `BLOCKED`
- `UNBLOCKED`

## Rules

1. `SHARED_CONTEXT_ENTERED`
   - may create temporary contextual acquaintance state;
   - does not grant DM/private-space/location access.

2. `SHARED_CONTEXT_LEFT`
   - removes temporary context permissions if no other shared context exists.

3. `CONNECTION_ACCEPTED`
   - requires mutual explicit acceptance;
   - creates `CONNECTED`.

4. `TRUST_GRANTED`
   - can only be applied to `CONNECTED`;
   - is user-scoped/asymmetric.

5. `BLOCKED`
   - immediately suppresses all social affordances between the two accounts where technically possible;
   - prevents rematching/invitations in the same controlled session.

## Nakama candidate mapping

Nakama may transport:
- presence;
- friend request;
- group membership;
- session invitation.

Authoritative EMOPET backend must own:
- effective trust state;
- permission policy;
- block/report;
- age-policy constraints;
- location permissions;
- audit.

Do not infer trust state only from Nakama friend status.

## Data model seed

```ts
type SocialTrustState =
  | 'STRANGER'
  | 'CONTEXTUAL_ACQUAINTANCE'
  | 'CONNECTED'
  | 'TRUSTED'
  | 'BLOCKED';

interface SocialRelationshipPolicy {
  viewerId: string;
  subjectId: string;
  state: SocialTrustState;
  contextIds: string[];
  grantedCapabilities: string[];
  revokedCapabilities: string[];
  updatedAt: string;
}
```

`TRUSTED` is directional.

**STATUS: STATE MACHINE READY FOR ARCHITECTURE REVIEW.**