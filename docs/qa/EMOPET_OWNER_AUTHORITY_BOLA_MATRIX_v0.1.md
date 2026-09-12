# EMOPET — Owner Authority BOLA Matrix v0.1

**Source lineage date:** 2026-09-06  
**Canonical terminology revision:** 2026-09-11  
**Status:** QA DESIGN / NOT EXECUTED  
**Parent:** #64  
**Terminology authority:** DOMAIN-TERM #245  
**Legacy gate identifier:** `G-GUARDIAN-BOLA-QA-01 = NOT_RUN`

> This file is the canonical terminology successor to `EMOPET_GUARDIAN_AUTHORITY_BOLA_MATRIX_v0.1.md`. The earlier source remains unchanged as historical evidence. This revision changes actor names only; QA expectations and authorization semantics are unchanged.

## 1. Purpose

Prevent broken-object-level authorization across dog, Owner delegation and professional sharing routes.

## 2. Actor matrix

Every sensitive dog-scoped endpoint should be tested with:

- primary Owner of target dog;
- trusted Caregiver with exact required capability;
- trusted Caregiver without capability;
- household user with no durable grant;
- unrelated authenticated user;
- anonymous user;
- professional recipient with active grant;
- professional recipient with expired/revoked grant;
- Community/Circle contact;
- same actor but different dog ID.

A trusted Caregiver is a delegated non-owner role. The label does not create ownership or broaden authority.

## 3. Object mutation matrix

For every authorized happy-path request, repeat with one field tampered at a time:

- dogId;
- grantId;
- recipient principal/email;
- scope;
- dataFrom/dataTo;
- access expiry;
- target user/principal;
- selected note IDs;
- Community/Circle ID where present.

Expected default: DENY.

## 4. Information disclosure rule

Unauthorized responses should not reveal more than necessary about whether another user's dog/grant exists.

Test status/body consistency to prevent enumeration through:
- 403 vs 404 differences;
- detailed validation before authorization;
- timing differences where material;
- object titles/names in error text.

## 5. Capability non-transitivity

Explicitly test that:

- `VIEW_CARE` does not imply `MANAGE_PROFESSIONAL_SHARING`;
- household relationship does not imply `VIEW_CARE`;
- Community friendship does not imply Owner or Trusted Caregiver status;
- professional recipient does not become a Trusted Caregiver;
- access to one dog does not imply access to another dog under the same account;
- one professional-share scope does not imply another.

## 6. Revocation matrix

After revoking a grant/delegation:

- current API access denies;
- previously issued link/token denies;
- refreshed client no longer displays effective capability;
- stale client attempts still deny server-side;
- audit records remain;
- underlying dog data is unchanged.

## 7. Gate

`G-GUARDIAN-BOLA-QA-01 = NOT_RUN`

The gate identifier is retained for evidence continuity. Its name is historical and does not re-authorize Guardian as current product vocabulary.

Static documents and code review do not close this gate.
