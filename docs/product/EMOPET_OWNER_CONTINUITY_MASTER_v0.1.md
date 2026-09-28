# EMOPET — OWNER CONTINUITY MASTER v0.1

**Source lineage date:** 2026-09-01  
**Canonical terminology revision:** 2026-09-11  
**Original GitHub workstream:** #65  
**Status:** `PROPOSED PRE-PRODUCTION AUTHORITY / NOT IMPLEMENTED / NOT RELEASED`  
**Legacy source gate identifier:** `G-GUARDIAN-CONTINUITY-01` retained for historical traceability; no new executable gate is created by this terminology revision.  
**Terminology authority:** DOMAIN-TERM #245

> This file is the canonical terminology successor to `EMOPET_GUARDIAN_CONTINUITY_MASTER_v0.1.md`. The earlier source is retained unchanged as historical evidence. This revision changes names, not capability scope or safety requirements.

## 1. Product purpose

Owner Continuity covers four related but distinct private capabilities:

1. `PERSONAL_LEXICON`
2. `VOICE_CUES`
3. `RELAY`
4. `RESCUE`

They help an Owner preserve practical continuity around their dog when they are not physically present.

They do **not** create:

- continuous remote surveillance;
- a walkie-talkie;
- an automatic emergency service;
- dog emotion decoding;
- public location broadcasting;
- unrestricted trusted-caregiver access.

## 2. Hard architecture boundaries

### Personal Lexicon

Stores intentionally curated human words/cues, variants, trials and learning status.

It is not a dog-language translator, emotion inference or hidden behavioural profiling.

### Voice Cues

Only intentionally created clips may be stored or played.

No:

- raw TAG microphone recording/transfer;
- continuous listening;
- open microphone;
- hidden playback;
- aversive sound.

### Relay

Private mission between authorised people.

No public crowd-tasking in current authority.

### Rescue

Minimal disclosure surface using expiring/revocable token.

Exact private address is never embedded in the public token.

## 3. Automation prohibition

ELI must not automatically:

- dispatch Voice Cue;
- create Relay mission;
- reveal exact address;
- publish Community alert.

Breiz also cannot silently perform these actions.

## 4. Authorization

All consequential actions require current server-side authorisation against:

- Owner–dog relationship;
- capability grant;
- scope;
- expiry/revocation;
- action-specific policy.

Delegated authority remains person-specific, dog-specific and scope-limited. A delegated person does not become an Owner merely by receiving access.

## 5. Audit

Sensitive actions produce auditable events:

- lexicon/clip creation/deletion;
- dispatch request/authorization/playback/failure;
- Relay creation/acceptance/location reveal/completion;
- Rescue token issue/use/revoke;
- address reveal.

## 6. Product maturity

### Current priority to study

`HOME_VOICE_BASE / MAT-side playback`

### Candidate only

`TAG_LOCAL_PLAYBACK`

Do not assume the reference TAG contains speaker/playback hardware.

### Deferred

`CONNECTED_CELLULAR_TAG`

No production claim.

## 7. Safety posture

An Owner Continuity feature must fail safely:

- no command replay;
- no playback after revoke;
- no address leak on stale/forwarded token;
- no stale mission accepting after expiry;
- no fake “played” state without evidence;
- no emergency-effectiveness claim.

**STATUS: MASTER READY FOR FOUNDER / SECURITY / PRIVACY / HARDWARE REVIEW.**
