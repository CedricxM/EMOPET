# EMOPET — WORLD SOCIAL TRUST PERMISSION MATRIX v0.1

**Date:** 2026-09-01  
**GitHub:** #46  
**Status:** PROPOSED PRE-PRODUCTION AUTHORITY / FOUNDER REVIEW REQUIRED  
**Implementation:** NOT IMPLEMENTED

## 1. Core rule

The Social Trust Ladder is a **permission state machine**, not a relationship measurement.

Allowed states:
- `STRANGER`
- `CONTEXTUAL_ACQUAINTANCE`
- `CONNECTED`
- `TRUSTED`

Forbidden:
- numerical friendship score;
- percentage bond;
- “best friend” algorithm;
- automatic trust upgrade from proximity;
- trust based on dog data, ELI, activity, breed, popularity or mutual friends alone.

## 2. State definitions

### STRANGER
A person visible in the same permitted World context with no accepted relationship.

### CONTEXTUAL_ACQUAINTANCE
A person with whom a bounded shared context exists, such as:
- same moderated event;
- same cooperative activity;
- same Circle/session context.

This state may be temporary.

### CONNECTED
A mutual social connection explicitly accepted by both users.

### TRUSTED
A higher-permission state explicitly granted by the user to an already connected person.

`TRUSTED` does not mean emotionally closer. It only means the user has chosen to permit additional actions.

## 3. Permission matrix

| Action | Stranger | Contextual acquaintance | Connected | Trusted |
|---|---:|---:|---:|---:|
| See chosen display name/pseudonym | ✅ | ✅ | ✅ | ✅ |
| See public avatar | ✅ | ✅ | ✅ | ✅ |
| See public dog representation | ✅ | ✅ | ✅ | ✅ |
| Send Wave / Salut | ✅ | ✅ | ✅ | ✅ |
| Send preset coordination | Public activity only | ✅ | ✅ | ✅ |
| Invite to public activity | ✅ | ✅ | ✅ | ✅ |
| View public profile card | ✅ | ✅ | ✅ | ✅ |
| Send connection request | ✅ | ✅ | — | — |
| Invite to private/personal space | ❌ | ❌ by default | ✅ | ✅ |
| Direct text message | ❌ | ❌ by default | ✅ if policy permits | ✅ if policy permits |
| Group message | ❌ | Context group only | ✅ | ✅ |
| See precise World instance presence | Current shared context only | Shared context | If opted in | If opted in |
| See approximate real-world area | ❌ | ❌ | ❌ by default | Separate Meet Mode only |
| See exact real-world location | ❌ | ❌ | ❌ | ❌ unless separately explicit/temporary feature later |
| See Care / MAT / TAG / ELI | ❌ | ❌ | ❌ | ❌ |
| See private Memories | ❌ | ❌ | ❌ | Explicit per-item share only |
| Invite to Meet Mode | ❌ | ❌ by default | Future separately gated | Future separately gated |
| Block | ✅ | ✅ | ✅ | ✅ |
| Report | ✅ | ✅ | ✅ | ✅ |
| Mute | ✅ | ✅ | ✅ | ✅ |
| Leave interaction | ✅ | ✅ | ✅ | ✅ |

## 4. Upgrade rules

### STRANGER → CONTEXTUAL_ACQUAINTANCE
May occur automatically only from a bounded shared context.

Examples:
- both joined the same moderated activity;
- both entered the same Circle event.

This does **not** grant private-space access, DM or location.

### CONTEXTUAL_ACQUAINTANCE → CONNECTED
Requires explicit mutual acceptance.

### CONNECTED → TRUSTED
Requires explicit unilateral permission by the granting user.

Trust can be asymmetric:
- A may mark B as `TRUSTED`;
- B may still keep A as `CONNECTED`.

## 5. Downgrade/revocation

User may downgrade at any time.

Priority rules:
- `BLOCKED` overrides all trust states;
- revoked connection immediately removes connected-only actions;
- leaving an event removes contextual acquaintance permissions unless another valid context remains;
- trust does not survive account blocking.

## 6. Anti-inference rule

The product must never say:
- “You two are becoming close.”
- “You have a strong bond.”
- “This person is trustworthy.”
- “Your dogs get along.”

The product may say:
- “You’re connected.”
- “You allowed this person to access X.”
- “You met in this event/activity.”

## 7. Safety constraints

No trust state may silently unlock:
- precise location;
- health data;
- ELI;
- phone/email;
- legal identity;
- automatic Meet Mode;
- access to private Community content.

**STATUS: PERMISSION MATRIX READY FOR FOUNDER REVIEW.**