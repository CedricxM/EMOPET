# EMOPET — Guardian Authority BOLA Matrix v0.1

**Status:** QA DESIGN / NOT EXECUTED  
**Date:** 2026-09-06  
**Parent:** #64

## 1. Purpose

Prevent broken-object-level authorization across dog, Guardian delegation and professional sharing routes.

## 2. Actor matrix

Every sensitive dog-scoped endpoint should be tested with:

- primary Guardian of target dog;
- trusted Guardian with exact required capability;
- trusted Guardian without capability;
- household user with no durable grant;
- unrelated authenticated user;
- anonymous user;
- professional recipient with active grant;
- professional recipient with expired/revoked grant;
- Community/Circle contact;
- same actor but different dog ID.

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
- Community friendship does not imply Guardian status;
- professional recipient does not become Trusted Guardian;
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

Static documents and code review do not close this gate.