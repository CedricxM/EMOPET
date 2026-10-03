# EMOPET — WORLD VERTICAL SLICE STATE & AUTHORITY MODEL v0.1

**Date:** 2026-09-01  
**Status:** PROPOSED TECHNICAL PRE-PRODUCTION CONTRACT  
**Implementation:** NOT AUTHORIZED

## 1. Purpose

Define the minimum state model before Unity/Nakama implementation so presentation does not silently become authority.

## 2. Identity states

### Guardian social identity
Server-authoritative fields:
- `guardian_id`
- `display_name`
- `avatar_id`
- `dog_profile_id?`
- `visibility_state`
- `block_state`
- `report_state`

Unity displays.
Nakama may reference session identity.
Neither owns durable truth.

## 3. Presence states

Candidate enum:

- `OFFLINE`
- `WORLD_VISIBLE`
- `WORLD_PRIVATE`
- `IN_PERSONAL_SPACE`
- `IN_ACTIVITY`
- `HIDDEN`

Presence is revocable.

No state contains exact real-world coordinates.

## 4. Activity party states

- `FORMING`
- `INVITED`
- `READY`
- `ACTIVE`
- `LEFT`
- `COMPLETED`
- `ABORTED`

Important:
`COMPLETED` is participation state only.
It is not a performance grade.

## 5. Keepsake state

Server-authoritative:

```text
keepsake_id
guardian_id
source_activity_id
acquired_at
display_slot?
visibility
```

No:
- market value;
- rarity power;
- health linkage;
- dog-performance metric.

## 6. Dog-avatar runtime state

Allowed presentation states:

- `IDLE`
- `WALK`
- `RUN`
- `SIT`
- `LIE`
- `FOLLOW`
- `WAYPOINT`
- `OBJECT_INTERACT`
- `ENTER`
- `EXIT`

Forbidden runtime fields:
- `mood`
- `happiness`
- `anxiety`
- `stress`
- `pain`
- `valence`
- `arousal`
- `wellbeing_state`
- `eli_score`

No hidden alias for these fields is permitted.

## 7. Community event states

- `DRAFT`
- `SUBMITTED`
- `PENDING_MODERATION`
- `PUBLISHED`
- `REVISION_REQUIRED`
- `REJECTED`
- `ESCALATED_HUMAN_REVIEW`
- `ARCHIVED`

Only `PUBLISHED` events may expose a public `Join in World` action.

## 8. World invitation states

- `PENDING`
- `ACCEPTED`
- `DECLINED`
- `EXPIRED`
- `REVOKED`
- `BLOCKED`

An invitation carries:
- inviter social identity;
- activity/space ID;
- World instance;
- expiry.

It must not carry:
- exact real-world location;
- private Care data;
- ELI/MAT/TAG data.

## 9. Moderation boundary

Pre-publication moderation applies to public Community content.

Realtime interaction uses a separate abuse-control path:
- filter;
- rate limit;
- mute;
- block;
- report;
- removal;
- audit.

Do not model realtime chat as “scientifically approved” content.

## 10. Technical ownership

### Authoritative backend
Owns:
- durable identity;
- permission;
- moderation state;
- visibility;
- block/report;
- keepsakes;
- persistent personal-space layout;
- audit.

### Nakama candidate
Owns only transient/session concerns:
- presence transport;
- party session;
- realtime activity state;
- chat transport;
- temporary room membership.

### Unity candidate
Owns only presentation/local interaction:
- scene;
- rendering;
- animation;
- camera;
- input;
- temporary UI.

## 11. Anti-cheat / anti-authority rule

Even though the first slice has no competitive economy, client authority must still not decide:
- moderation approval;
- visibility rights;
- durable keepsake acquisition;
- access to private space;
- blocked-user bypass.

## 12. Logging requirements

Minimum test logs:
- session join/leave;
- invite sent/accepted/declined;
- block/report;
- activity start/complete/abort;
- keepsake grant;
- moderation transition;
- visibility change.

Do not log:
- unnecessary raw Care data;
- unnecessary exact real-world location.

## 13. Kill-gate technical question

If implementing these boundaries in Unity/Nakama adds disproportionate complexity for no social/interaction gain, challenge the architecture before scaling.

**STATUS: STATE MODEL READY FOR ARCHITECTURE REVIEW — NOT IMPLEMENTED.**