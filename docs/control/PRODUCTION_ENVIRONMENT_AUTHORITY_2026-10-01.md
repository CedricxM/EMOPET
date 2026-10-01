# Production Environment and Release-Owner Authority

Status: `CONTRACT_ONLY / NO_ENVIRONMENT_CONFIGURED / RELEASE_ROLES_UNASSIGNED`  
Authority issue: #831  
Machine-readable contract: `config/release/production-environment-authority-v1.json`

## Purpose

This record defines the repository vocabulary for REL-G1 and REL-G2 without creating a production environment, assigning a real person, or authorizing deployment.

The contract is deliberately fail-closed.

## Canonical environment vocabulary

The repository uses three canonical names:

- `development` — non-production; repository convention only;
- `staging` — pre-production; actual provider/environment authority remains external and unverified;
- `production` — production; actual provider/environment authority remains external and unverified.

These names are vocabulary, not evidence that any environment exists.

If GitHub Actions is ever used to promote production, the production job must target a **named protected GitHub Environment** rather than an unscoped job. This contract does not create that Environment object.

## Release roles

Two symbolic roles are defined:

- `release_owner` — accountable release owner;
- `independent_approver` — independent production review authority.

No person, account or team is assigned to either role here. Repository authorship, PR authorship, commit history and CODEOWNERS must not be treated as assignment evidence.

## Independent approval

For a production receipt to become `REVIEWED_GO`, the repository contract requires:

- a production environment authority reference;
- a `release_owner` review reference;
- an independent approval reference;
- the independent approver evidence to be distinct from the release-owner review evidence.

Until those references exist, the release remains HOLD.

## Non-effects

This contract does not:

- create GitHub Environments;
- choose a hosting or deployment provider;
- identify a real release owner or approver;
- grant deployment credentials;
- authorize production migration;
- execute a deployment or release.

## Current disposition

`REL-G1 ENVIRONMENT VOCABULARY = DEFINED / REAL ENVIRONMENT AUTHORITY UNVERIFIED`

`REL-G2 RELEASE ROLES = DEFINED / ACTUAL ASSIGNMENTS UNVERIFIED`

`G-PROD-RELEASE-AUTHORITY = OPEN`

Refs: #831, #257, #680.
