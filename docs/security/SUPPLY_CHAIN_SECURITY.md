# EMOPET Supply-Chain Security

Status: `P0 SOFTWARE CONTROLS IMPLEMENTED / FIRMWARE SIGNING GATED`

## Software controls

P0 adds:

- Dependabot for npm/pnpm manifests and GitHub Actions;
- dependency audit in CI with the complete JSON report retained as a workflow artifact;
- Semgrep security SAST as the repository-independent blocking static-analysis gate;
- CodeQL JavaScript/TypeScript default-setup evidence as a repository-required security check, alongside Semgrep as the repository-owned blocking SAST control;
- CycloneDX and SPDX SBOM generation as build artifacts;
- Gitleaks secret scanning with pull-request read permission and full-history checkout.

A green workflow is evidence for that commit only; it is not a general production-security claim. The active `main-protection` ruleset requires `CodeQL default setup evidence` and the other selected security/supply-chain contexts before merge. Semgrep remains an independent repository-owned SAST gate.

## Dependency vulnerability gate

The CI gate fails on high or critical advisories reported by `pnpm audit`. The machine-readable `pnpm-audit.json` artifact is retained even when the gate fails so remediation can be tied to exact package, advisory, dependency path and commit SHA instead of relying on screenshots or console summaries.

Dependency overrides are permitted only when all of the following are true:

1. the patched version is compatible with every affected dependency range or has been explicitly compatibility-tested;
2. the lockfile is regenerated reproducibly rather than hand-edited;
3. application build/typecheck/tests remain green;
4. the audit report for the exact candidate commit is green, or any remaining advisory has a documented risk disposition.

Do not silence a production-relevant advisory by changing the audit command to omit the affected dependency class.

## Release signing

Before a production software release, EMOPET must define and implement:

- protected release branches/tags;
- immutable release artifacts;
- cryptographic signing/attestation of release artifacts;
- build provenance linked to commit SHA;
- SBOM archived with the release;
- dependency and vulnerability disposition at release time.

Preferred future direction: Sigstore/cosign or an equivalent controlled signing/attestation flow. Selection remains `TO_CONFIRM`.

### Production release authority

Production release and deployment authority is tracked under #831.

Canonical provider-neutral evidence contracts:

- `config/release/production-release-evidence-contract-v1.json` with its doctrine at `docs/control/PRODUCTION_RELEASE_EVIDENCE_CONTRACT_2026-10-01.md`;
- `config/release/production-db-migration-authority-v1.json` with its doctrine at `docs/control/PRODUCTION_DB_MIGRATION_AUTHORITY_2026-10-01.md`.

These contracts are **fail-closed control surfaces, not deployment permission**. Their checked-in defaults explicitly deny production release and production migration authority. A green security workflow, a green P0 DB run, an SBOM artifact, or the `Release provenance gate` alone does not authorize a production release.

Until #831's external and operational gates are satisfied, `G-PROD-RELEASE-AUTHORITY = OPEN` and `PRODUCTION_DB_MIGRATION = NOT AUTHORIZED`.

## Firmware / device update security

MAT/TAG firmware security is a hardware/firmware workstream and must not be silently implemented before the MCU/bootloader architecture is controlled.

Required design gates:

1. secure boot rooted in device trust material;
2. signed firmware images;
3. anti-rollback policy;
4. key separation between development and production;
5. key rotation/revocation procedure;
6. update authenticity and integrity verification before install;
7. interrupted-update recovery / safe fallback;
8. vulnerability-fix update path for the declared support period;
9. device/firmware version exposed in audit and Data Act provenance;
10. SBOM for firmware components when tooling supports it.

MCUboot and The Update Framework are useful reference architectures, not automatically selected dependencies.

## OTA status

`SECURE_BOOT = GATED_HARDWARE_ARCHITECTURE`

`FIRMWARE_SIGNING = GATED_KEY_MANAGEMENT`

`ANTI_ROLLBACK = GATED_BOOTLOADER_SELECTION`

`OTA_DISTRIBUTION = GATED_UPDATE_ARCHITECTURE`

No document may describe these as implemented until verified on target hardware.

## Third-party dependency intake

Any new dependency must be reviewed for:

- licence compatibility;
- maintainer/activity health;
- known vulnerabilities;
- transitive dependency cost;
- data/telemetry behavior;
- update cadence;
- whether it is runtime, build-only or dev-only.

Avoid adding a dependency when the standard library or an existing controlled package is sufficient.
