# Production Database Migration Authority

Status: `CONTRACT_ONLY / NO_PRODUCTION_MIGRATION AUTHORITY`  
Authority issue: #831  
Migration-ledger lineage: #258  
Machine-readable contract: `config/release/production-db-migration-authority-v1.json`

## Purpose

This contract separates **repository database correctness evidence** from **authority to mutate a production database**.

EMOPET already has strong disposable PostgreSQL QA. That evidence is necessary, but it is not sufficient for production migration.

## Existing repository decision

The repository has selected:

`NO_EXISTING_DB_TO_PRESERVE`

That decision resolved how the active repository baseline could be reconstructed and validated during integration. It does **not** mean:

- a future production database is disposable;
- no production database exists;
- a green P0 DB run may be applied to a live database;
- existing production data can be replaced by a fresh baseline.

The existing reconciliation record already states:

`Production migration: NOT AUTHORIZED`

This contract preserves that boundary.

## Required promotion identity

A future migration promotion must bind to:

- one immutable release receipt under #831;
- one exact Git commit SHA;
- one target environment authority reference;
- one non-secret database principal/operator authority;
- one ordered migration set;
- one SHA-256 digest for that reviewed set.

Each migration entry must carry:

- order;
- repository path;
- SHA-256 digest;
- provenance reference.

No mutable branch name is sufficient migration identity.

## Preflight gates

Before a future execution window may be authorized, the receipt requires:

1. disposable P0 DB QA evidence;
2. existing-database upgrade rehearsal evidence, unless a reviewed authority proves there is no existing target database;
3. backup/restore evidence for any durable production database;
4. reviewed target-environment authority;
5. reviewed database principal/operator authority;
6. reviewed operator + approver references;
7. an explicit recovery disposition for the exact migration set.

Missing evidence means `HOLD`.

## State machine

### `DRAFT_HOLD`

Default. The migration plan is incomplete or unreviewed. Execution prohibited.

### `REVIEWED_HOLD`

The plan was reviewed but one or more gates are not satisfied. Execution prohibited.

### `AUTHORIZED_WINDOW_PENDING`

Reserved for a future exact migration set with complete reviewed preflight evidence and an authorized execution window.

This document does not create such an authorization.

### `EXECUTED_PENDING_VERIFICATION`

Execution occurred under a future valid authority, but post-apply verification is incomplete. Promotion is not yet complete.

### `VERIFIED_COMPLETE`

Post-apply evidence for the exact target and migration set has been reviewed.

### `SUPERSEDED`

Historical receipt only.

## Recovery boundary

The contract deliberately does not choose universal rollback versus forward-fix.

For the exact migration set, reviewers must establish:

- whether rollback is technically safe;
- whether a forward-fix is the controlled recovery path;
- what backup/restore authority exists;
- what evidence proves recovery readiness.

A generic “we can rollback” statement is not evidence.

## Credential boundary

The receipt stores authority references and role names, never credentials.

Do not record:

- database passwords;
- connection strings containing secrets;
- provider API tokens;
- private keys;
- secret-manager values;
- personal-data dumps.

## Relationship to P0 DB

`P0 DB baseline validation` remains the repository's disposable database QA gate.

It can prove:

- migration ordering and repeatability in disposable PostgreSQL;
- historical and generated-baseline compatibility;
- schema/constraint/index evidence covered by the workflow;
- targeted integration behavior.

It cannot prove:

- the state of a production database;
- backup/restore readiness;
- operator authority;
- a safe execution window;
- production rollback/forward-fix readiness;
- post-migration production verification.

## Current disposition

`REL-G4-PRODUCTION-DB-MIGRATION-CONTRACT = DEFINED`

`PRODUCTION_DB_MIGRATION = NOT AUTHORIZED`

Refs: #831, #258, #214, #69.
