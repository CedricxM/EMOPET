# EMOPET — Guardian Authority Master v0.1

**Status:** CONTROLLED DESIGN AUTHORITY / PRE-PRODUCTION  
**Date:** 2026-09-06  
**Parent:** #64  
**Gate:** `G-GUARDIAN-AUTHORITY-01 = OPEN`

## 0. Core principle

The Guardian–dog relationship is the primary authorization boundary for personal EMOPET data and device authority.

> **Social proximity is not authorization. Household proximity is not authorization. Client state is not authorization. Backend durable policy decides effective access.**

## 1. Principal classes

### Primary Guardian
Candidate full dog-scoped authority subject to sensitive-action re-authentication:
- manage dog profile;
- bind/unbind devices;
- manage consents;
- create/revoke scoped delegations;
- create/revoke professional sharing grants;
- export/delete where legally/product appropriate;
- inspect access audit.

### Household Member
A household relationship may support UX/context but grants no sensitive authority by itself.

Default:
- no consent management;
- no device ownership transfer;
- no professional sharing;
- no delete/export;
- no delegation administration.

### Trusted Guardian
Explicitly invited principal with explicit capabilities, expiry and revocation.

Candidate capabilities:
- `VIEW_CARE`
- `ADD_DECLARED_CONTEXT`
- `VIEW_SELECTED_MEMORIES`
- `MANAGE_ROUTINE` (future controlled scope)
- `MANAGE_PROFESSIONAL_SHARING` only when deliberately granted

Capabilities must never be inferred from relationship labels such as partner, family, sitter or friend.

### Professional Recipient
Access only through professional-share grant authority. Not a Guardian.

### Community / World Principal
Never inherits Care/Guardian authority from social graph, Circle membership, proximity, co-presence or World interaction.

## 2. Dog-scoped capability model

Every durable grant candidate must include:

- grant ID;
- dog ID;
- granting Guardian ID;
- recipient principal/identity;
- capability/scope list;
- purpose where relevant;
- createdAt;
- effectiveAt;
- expiresAt where applicable;
- status;
- revocation metadata;
- audit linkage.

No wildcard dog authority in V1 unless separately controlled.

## 3. Sensitive actions

Candidate sensitive actions requiring stronger authorization/re-authentication before release:

- transfer Primary Guardian;
- delete dog/account data;
- export broad account data;
- create long-lived Trusted Guardian delegation;
- grant `MANAGE_PROFESSIONAL_SHARING`;
- change device ownership/provisioning authority;
- reveal precise long-term location history;
- modify privacy defaults affecting other principals.

## 4. Revocation rule

Backend revocation wins over:

- cached client state;
- existing navigation state;
- previously issued capability display;
- unexpired bearer token where revocation-sensitive access is intended;
- prior Community/World membership.

Clients must refresh effective authority after revocation-sensitive operations.

## 5. Emergency access candidate

Emergency activation is **not authorized by this document**.

If later pursued, it requires a separate protocol defining:
- eligible principal;
- pre-registration;
- exact emergency scopes;
- activation trigger;
- short expiry;
- Guardian notification;
- immutable audit;
- abuse/false activation controls;
- legal/privacy review.

No generic `emergency=true` bypass is permitted.

## 6. Audit model

Sensitive authorization changes should record at minimum:

- actor;
- dog;
- target recipient/principal;
- action;
- scope/capability delta;
- timestamp;
- success/deny result;
- reason code;
- grant/delegation ID.

Do not log secrets, bearer tokens or private content bodies.

## 7. Cross-surface firewall

| Source relationship | Can grant Care access? | Can grant professional sharing? |
|---|---:|---:|
| Primary Guardian | Yes, backend policy | Yes, scoped grant |
| Explicit Trusted Guardian capability | Only granted capabilities | Only if explicitly granted |
| Household label | No | No |
| Community friend | No | No |
| Circle membership | No | No |
| World interaction | No | No |
| Veterinarian relationship label | No | No, grant required |
| Breiz suggestion | No | No |

## 8. Client authority

Mobile/web may:
- display current grants/capabilities;
- collect intent;
- request creation/revocation;
- optimistically show loading state only.

Mobile/web may not:
- decide that ownership exists;
- create an effective grant locally;
- override server expiry/revocation;
- infer capabilities from UI role labels.

## 9. Current implementation reality

The repository still has an incomplete auth/production foundation. Therefore this document defines the target authorization contract but does not assert the current runtime fully enforces it.

Professional sharing has been specifically hardened so the old generic bearer-link flow is release-HOLD while recipient-bound durable grants are designed.

## 10. Required closure evidence

Before `G-GUARDIAN-AUTHORITY-01` can close:

- durable principal/grant store;
- controlled DB migrations;
- server-side authorization middleware;
- revocation propagation;
- sensitive-action re-auth decision;
- BOLA/negative tests;
- professional sharing runtime tests;
- privacy/security review;
- usability review of grants/revocation/audit;
- Founder approval.

`G-GUARDIAN-AUTHORITY-01 = OPEN`
