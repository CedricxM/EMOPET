# EMOPET Supply-Chain Security

Status: `P0 SOFTWARE CONTROLS IMPLEMENTED / FIRMWARE SIGNING GATED`

## Software controls

P0 adds:

- Dependabot for npm/pnpm manifests and GitHub Actions;
- dependency audit in CI;
- CodeQL JavaScript/TypeScript analysis;
- CycloneDX and SPDX SBOM generation as build artifacts;
- an informational secret scan until a repository-level required scanner is validated.

A green workflow is evidence for that commit only; it is not a general production-security claim.

## Release signing

Before a production software release, EMOPET must define and implement:

- protected release branches/tags;
- immutable release artifacts;
- cryptographic signing/attestation of release artifacts;
- build provenance linked to commit SHA;
- SBOM archived with the release;
- dependency and vulnerability disposition at release time.

Preferred future direction: Sigstore/cosign or an equivalent controlled signing/attestation flow. Selection remains `TO_CONFIRM`.

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
