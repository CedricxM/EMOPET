# Production Artifact Identity and Provenance Authority

Status: `CONTRACT_ONLY / ARTIFACT_IDENTITY_DEFINED / SIGNING_AUTHORITY_UNSELECTED`  
Authority issue: #831  
Machine-readable contract: `config/release/production-artifact-provenance-authority-v1.json`

## Purpose

This record defines the repository-owned portion of REL-G3 without selecting a signing vendor or claiming that EMOPET currently produces signed release artifacts.

It separates four things that must not be conflated:

1. source identity;
2. artifact identity;
3. SBOM binding;
4. cryptographic signing/attestation authority.

## Immutable candidate identity

A future releasable candidate must bind:

- one immutable Git commit SHA;
- one named artifact identity;
- one SHA-256 digest for that artifact;
- one build-run reference;
- one builder reference;
- CycloneDX and SPDX SBOM references **plus their SHA-256 digests**.

A branch name, PR number, mutable URL or floating tag is not sufficient release identity.

## Attestation boundary

The checked-in default is deliberately:

- `attestation.status = UNVERIFIED`;
- `attestation.mechanism = null`;
- `signingAuthority.state = UNSELECTED`;
- `signingAuthority.authorityRef = null`.

A future verified attestation must bind the reviewed artifact digest to the reviewed source commit and build run.

Sigstore/cosign remains a possible future direction from `docs/security/SUPPLY_CHAIN_SECURITY.md`, not a selected mechanism.

## Truth boundary for the current CI

The required check named **Release provenance gate** currently verifies repository policy presence. It does **not** itself create cryptographic provenance, sign an artifact or prove a production artifact.

Likewise, GitHub Actions artifact upload stores CI outputs but is not signing authority.

Those distinctions are mechanically preserved by the release-authority guard.

## Fail-closed production rule

Production remains HOLD while any of the following is missing:

- immutable artifact digest;
- immutable source commit;
- build evidence;
- CycloneDX/SPDX references and digests;
- reviewed attestation evidence;
- selected signing authority.

## Data and secret safety

Release/provenance receipts contain digests and evidence references only.

Never store:

- private signing keys;
- provider tokens;
- passwords;
- secret-manager values;
- production credentials;
- personal-data dumps.

## Current disposition

`REL-G3 ARTIFACT IDENTITY + PROVENANCE CONTRACT = DEFINED`

`SIGNING / ATTESTATION AUTHORITY = UNSELECTED / UNVERIFIED`

`G-PROD-RELEASE-AUTHORITY = OPEN`

Refs: #831 and `docs/security/SUPPLY_CHAIN_SECURITY.md`.
