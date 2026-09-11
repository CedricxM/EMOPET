# EMOPET — OWNER AUTHORITY MASTER v0.1

**Source lineage date:** 2026-09-01  
**Canonical terminology revision:** 2026-09-11  
**Original GitHub workstream:** #64  
**Status:** `PROPOSED PRE-PRODUCTION AUTHORITY / NOT IMPLEMENTED / NOT RELEASED`  
**Legacy source gate identifier:** `G-GUARDIAN-AUTHORITY-01` retained for historical traceability; no new executable gate is created by this terminology revision.  
**Terminology authority:** DOMAIN-TERM #245

> This file is the canonical terminology successor to `EMOPET_GUARDIAN_AUTHORITY_MASTER_v0.1.md`. The earlier source is retained unchanged as historical evidence. This revision changes names, not authorization scope.

## 1. Principle

The Owner–dog relationship is the central authorization boundary.

> **Access is granted to a person, for a dog, for a purpose, for a scope, for a time.**

No social relationship, device possession, household membership or professional title silently expands that authority.

## 2. Primary actors

- `PRIMARY_OWNER`
- `HOUSEHOLD_MEMBER`
- `TRUSTED_CAREGIVER`
- `PROFESSIONAL_RECIPIENT`
- `PARTNER_RESEARCH_USER`
- `SUPPORT_OPERATOR`
- `DEVICE_PRINCIPAL`
- `SERVICE_PRINCIPAL`

`TRUSTED_CAREGIVER` is the terminology successor to the legacy trusted-delegate label. It does not imply legal ownership and does not expand the permissions previously defined for that delegate role.

## 3. Primary Owner

Candidate authority:

- manage dog relationship;
- bind/rebind devices;
- manage permissions;
- create/revoke delegated grants;
- authorize professional sharing;
- export/delete within product/legal constraints.

Sensitive operations may require re-authentication.

## 4. Household member

Household membership is context, not full authority.

No automatic inheritance of:

- professional sharing;
- export/delete;
- device transfer;
- private continuity-circle administration;
- private Memories;
- precise location;
- Rescue address;
- Voice privileges.

## 5. Trusted Caregiver

Must be:

- named;
- invited;
- accepted;
- scope-limited;
- dog-specific;
- optionally time-limited;
- suspendable/revocable;
- auditable.

A trusted caregiver is not promoted to Owner merely because a grant exists.

## 6. Professional recipient

Access is:

- recipient-bound;
- purpose-bound;
- data-category-bound;
- time-window-bound;
- expiring/revocable.

No default access to:

- raw telemetry;
- private Memories;
- Community;
- World;
- private Breiz conversation;
- unrelated location.

## 7. Social trust separation

Community/World states such as `CONNECTED` or `TRUSTED` do not equal `TRUSTED_CAREGIVER`.

Private continuity access is infrastructure, not a social badge.

## 8. Grant object

Every durable grant must include:

- subject person/service;
- target dog/relationship;
- capabilities;
- purpose;
- start;
- expiry;
- grantor;
- state;
- revocation state;
- audit identifiers.

## 9. Backend authority

Clients submit intentions and render effective policy.

They do not self-authorize.

## 10. Success

A user should always be able to answer:

- Who can access something?
- Which dog?
- What exactly?
- Why?
- Until when?
- Can I stop it?
- What happened before?

**STATUS: MASTER READY FOR FOUNDER / PRIVACY / SECURITY REVIEW.**
