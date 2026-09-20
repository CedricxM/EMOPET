# EMOPET — GUARDIAN CONTINUITY MASTER v0.1

**Original date:** 2026-09-01  
**Original GitHub workstream:** #65  
**Status:** `PROPOSED PRE-PRODUCTION AUTHORITY / NOT IMPLEMENTED / NOT RELEASED`  
**Gate:** `G-GUARDIAN-CONTINUITY-01`  
**Imported to project memory:** 2026-09-07

## 1. Product purpose

Guardian Continuity covers four related but distinct private capabilities:

1. `PERSONAL_LEXICON`
2. `VOICE_CUES`
3. `RELAY`
4. `RESCUE`

They help a Guardian preserve practical continuity around their dog when they are not physically present.

They do **not** create:

- continuous remote surveillance;
- a walkie-talkie;
- an automatic emergency service;
- dog emotion decoding;
- public location broadcasting;
- unrestricted Trusted Guardian access.

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

- Guardian–dog relationship;
- capability grant;
- scope;
- expiry/revocation;
- action-specific policy.

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

A Guardian continuity feature must fail safely:

- no command replay;
- no playback after revoke;
- no address leak on stale/forwarded token;
- no stale mission accepting after expiry;
- no fake “played” state without evidence;
- no emergency-effectiveness claim.

**STATUS: MASTER READY FOR FOUNDER / SECURITY / PRIVACY / HARDWARE REVIEW.**
