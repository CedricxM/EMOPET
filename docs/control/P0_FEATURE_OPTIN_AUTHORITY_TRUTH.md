# P0 FEATURE OPT-IN AUTHORITY TRUTH

Status: `DRAFT / PROTOTYPE AUTHORITY CLASSIFICATION / NOT LEGAL SIGN-OFF / NOT RELEASE AUTHORITY`

Issue: #131 `PRIV-OPTIN-01`  
Snapshot boundary: `main@c099581ff8aed1e619f72ab38898fc05833b7c66`

## 1. Purpose

This record classifies the current feature-progress opt-in, rules and waitlist state without promoting prototype behavior into durable account authority.

The repository type is named `ConsentRecord`. That name is not sufficient to establish legal/regulatory consent status. This document uses **opt-in state** unless a narrower product contract is explicitly evidenced.

## 2. Current authority classes

| Surface | Current storage / source | Authority class | Durable account evidence? | Product-use boundary |
|---|---|---|---|---|
| Backend feature opt-in records | process `Map<string, ConsentRecord[]>` | `VOLATILE_PROCESS` | No | Prototype progression only; do not treat as durable preference/audit history |
| Backend Community-rules acceptance | process `Map<string, string>` | `VOLATILE_PROCESS` | No | Prototype gate only; restart loses state |
| Backend feature waitlists | process nested `Map` | `VOLATILE_PROCESS` | No | Prototype interest signal only |
| Backend UGC reports / blocks in feature-progress service | process arrays | `VOLATILE_PROCESS` | No | Not durable moderation/lifecycle evidence |
| Mobile no-token feature progress | local app context | `DEMO_LOCAL` | No | UI/demo fallback only |
| Mobile no-token `ConsentRecord` result | constructed locally with `demo-user` | `DEMO_LOCAL` | No | Must not be uploaded/reinterpreted as historical account proof |
| Mobile no-token Community-rules acceptance | locally constructed `demo-user` response | `DEMO_LOCAL` | No | Demo/UI continuity only |
| Future persisted account opt-ins | not implemented | `DURABLE_ACCOUNT_BOUND` candidate | Not yet | Requires reviewed schema, identity, lifecycle and privacy controls |
| Future temporary proximity activation | not implemented | `SESSION_BOUND_TEMPORARY` candidate | Not yet | Requires explicit TTL/revocation/scope contract |

## 3. Identity truth

The protected backend feature-progress router previously substituted `demo-user` when `c.var.userId` was missing.

That behavior is not acceptable for a protected account route because a missing identity must never collapse into a shared synthetic principal.

Candidate patch behavior:

- no backend `demo-user` fallback;
- every feature-progress GET/POST fails `401 { error: 'unauthorized' }` when the route identity is absent;
- the normal mounted API still relies on the repository authentication middleware;
- canonical UUID/session hardening remains owned by AUTH-01 / ID-01 and is not duplicated here.

`OPTIN-G1 = CANDIDATE`

## 4. Volatile-state truth

Current backend opt-ins and rules can disappear when the process restarts. That creates a conservative failure mode for currently locked prototype functions, but it is not durable account history.

Therefore current state must not be described as:

- persisted consent history;
- durable preference storage;
- audit evidence;
- durable moderation evidence;
- cross-device/account synchronization.

It may be described as:

`VOLATILE_PROCESS / PROTOTYPE`

until a real durable writer/reader exists.

`OPTIN-G2 = OPEN`

## 5. Temporary proximity/location state

The shared purpose `location_nearby_temp` is labelled temporary, but the current `ConsentRecord` contract contains only:

- userId;
- purpose;
- status;
- timestamp;
- optional context.

It contains no explicit:

- `expiresAt`;
- TTL;
- activation/session identifier;
- foreground/background scope;
- device binding;
- restart semantics.

No real proximity/location behavior should be activated from this record until those semantics are defined and tested.

`OPTIN-G3 = OPEN`

## 6. Mobile demo boundary

The mobile service intentionally builds local feature-progress state when no auth token is present. This can remain for UI/demo exploration provided that:

1. it is non-authoritative;
2. `demo-user` never becomes a backend principal;
3. locally constructed records are not silently uploaded as past account state;
4. no privacy-sensitive production feature treats the local shape as durable authorization;
5. missing backend state never falls back to a plausible accepted account state.

Current classification:

`MOBILE_NO_TOKEN_OPTIN = DEMO_LOCAL / NON_AUTHORITATIVE`

`OPTIN-G5 = OPEN` pending machine-readable/mobile UI evidence if needed before release.

## 7. Future durable contract requirements

Before `DURABLE_ACCOUNT_BOUND` is authorized, define:

- canonical authenticated user ID;
- purpose/version taxonomy;
- accepted/declined/revoked chronology;
- source client/device/channel where appropriate;
- effective time and, for temporary state, expiry time;
- read-after-write proof;
- cross-device reconciliation;
- source unavailable versus none-found semantics;
- PRIV-01 retention/erasure treatment;
- DATA-01 export/access treatment;
- migration rule: prototype/demo state is not automatically migrated.

No legal retention period or legal basis is selected here.

## 8. STOP conditions

STOP rather than activate if a patch would require:

- treating `demo-user` as account identity;
- interpreting process memory as durable evidence;
- activating real temporary location without TTL/revocation semantics;
- silently restoring accepted state from demo/local fallback after backend failure;
- importing prototype records into a durable store without explicit migration authority;
- claiming GDPR/legal-consent closure from the TypeScript type name alone.

## 9. Current disposition

`BACKEND_DEMO_IDENTITY_FALLBACK = REMEDIATE_CANDIDATE`

`BACKEND_OPTIN_STORAGE = VOLATILE_PROCESS / PROTOTYPE`

`MOBILE_NO_TOKEN_OPTIN = DEMO_LOCAL / NON_AUTHORITATIVE`

`TEMP_LOCATION_AUTHORITY = HOLD`

`DURABLE_ACCOUNT_OPTIN = NOT_IMPLEMENTED`

`G-FEATURE-OPTIN-AUTHORITY-01 = OPEN`

No production activation, legal conclusion, persistence migration, merge or release is authorized by this record.
