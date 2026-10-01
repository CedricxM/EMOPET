# Production Release Evidence Contract

Status: `CONTRACT_ONLY / NO_PRODUCTION_RELEASE_AUTHORITY`  
Authority issue: #831  
Machine-readable contract: `config/release/production-release-evidence-contract-v1.json`

## Purpose

This contract defines the minimum receipt EMOPET will require **before a future production release can be represented as reviewed**.

It does not deploy anything. It does not create a production environment. It does not select a cloud, signing vendor, secret manager, database operator or release approver.

The template is deliberately fail-closed: its initial state is `DRAFT_UNVERIFIED`.

## Canonical identity

A release receipt must bind the candidate to:

- one immutable Git commit SHA;
- one named artifact identity;
- one SHA-256 digest for that artifact;
- the exact CycloneDX and SPDX SBOM evidence associated with the candidate.

A branch name, PR number, mutable URL or green workflow by itself is not a release identity.

## Required dispositions

The receipt must carry reviewed evidence for:

1. dependency/vulnerability disposition;
2. artifact signing or attestation;
3. target environment authority;
4. accountable release-owner review;
5. production database migration disposition;
6. production transport/TLS disposition;
7. backup/restore disposition.

The machine-readable contract records the required fields and the fail-closed template.

## State machine

### `DRAFT_UNVERIFIED`

Default. Missing or unreviewed evidence exists. Production promotion is prohibited.

### `REVIEWED_HOLD`

A reviewer has evaluated the receipt and at least one required gate is not satisfied. Production promotion is prohibited.

### `REVIEWED_GO`

Reserved for a future candidate whose complete evidence has been reviewed under the authorities selected in #831. This document does **not** create such a candidate or grant anyone authority to issue this state.

### `SUPERSEDED`

The receipt is retained as historical evidence but is no longer the active candidate.

## Database boundary

`P0 DB baseline validation` remains disposable QA. It proves repository database behavior for the tested commit; it does not authorize a production migration.

A future production receipt needs a separate migration disposition with operator/review authority and an evidence reference for the reviewed migration/rollback or forward-fix plan.

## Supply-chain boundary

Reuse `docs/security/SUPPLY_CHAIN_SECURITY.md`:

- immutable release artifact;
- cryptographic signing/attestation;
- commit-linked provenance;
- SBOM archived with the release;
- dependency/vulnerability disposition.

Sigstore/cosign remains a future direction, not a selected authority.

## External evidence boundary

Repository code cannot manufacture:

- production TLS/edge configuration;
- secret-manager/runtime-injection configuration;
- backup configuration or restore success;
- production environment protection;
- provider-side attestation/signing evidence.

Those remain external evidence until attached through reviewed references.

## Data minimisation

A release receipt must contain references and digests, not secrets or personal data.

Never place in a receipt:

- passwords or API tokens;
- private keys or signing material;
- webhook secrets;
- database credentials;
- raw personal-data dumps;
- email-verification or session tokens.

## Current disposition

`G-PROD-RELEASE-AUTHORITY = OPEN`

`REL-G8-RECEIPT-CONTRACT = DEFINED / NO RELEASE EXECUTED`

Refs: #831, #214, #69, #680.
