# Dependency Risk Acceptance Register

Status: `ACTIVE / TIME-BOUNDED`

This register is not a blanket vulnerability waiver. Every exception must be advisory-specific, dependency-path-specific, justified by current technical exposure, and expire automatically in CI.

## RA-DEP-001 — image-size / Metro build-time DoS advisories

**Advisories**

- `GHSA-w3rx-r6r6-pgpr` — high severity, ICNS parser infinite-loop denial of service.
- `GHSA-5p2g-fcmc-qvqq` — high severity, JXL/HEIF parser infinite-loop denial of service.

**Affected dependency path**

`apps/mobile -> react-native -> @react-native/community-cli-plugin -> metro -> image-size`

The CI exception applies only when the audit finding resolves through the exact path encoded in `tools/security/evaluate-pnpm-audit.mjs`. If `image-size` appears through another path, especially a backend or user-input runtime path, the gate fails.

**Why this is temporarily accepted**

As of 2026-08-30, the upstream `image-size` package has no published patched release for these advisories. The current EMOPET occurrence is inside Metro tooling used while bundling the mobile application. The affected parser is not an EMOPET API endpoint and is not intended to process untrusted end-user uploads at production runtime.

The practical residual threat in the current architecture is therefore a malicious or malformed repository-controlled image causing a developer/CI mobile bundle process to hang. That still matters, but it is materially different from exposing the parser to arbitrary production network input.

**Compensating controls**

1. no production API or user-upload flow may import or expose this transitive `image-size` instance;
2. mobile assets entering the repository remain reviewable source artifacts;
3. Gitleaks, SAST, dependency audit and review controls remain active;
4. the exception is exact-GHSA and exact-path, not package-wide or severity-wide;
5. CI fails automatically after the expiry date unless the decision is explicitly renewed;
6. the exception must be removed immediately when a compatible patched dependency chain becomes available.

**Review date:** `2026-10-31`

**Hard expiry enforced by CI:** `2026-11-30T23:59:59Z`

**Removal criteria**

Any of the following closes this acceptance:

- a patched `image-size` release compatible with Metro is published;
- React Native / Metro / Expo moves to a dependency chain without the affected package;
- EMOPET replaces the vulnerable build-time component with an audited compatible alternative;
- architecture changes make the parser reachable from untrusted runtime input, in which case the exception is invalid immediately and release is blocked.

## RA-DEP-002 — node-forge / Expo CLI signature-verification advisory

**Advisory**

- `GHSA-86w9-cpqp-85rv` — high severity, RSA PKCS#1 v1.5 signature verification accepts extra nested `DigestAlgorithm` elements.

**Affected dependency path**

`apps/mobile -> expo -> @expo/cli -> node-forge`

The CI exception applies only when the audit finding resolves through that exact path and exact advisory ID. Any `node-forge` occurrence through a backend, server, runtime-service or second mobile dependency path remains blocking.

**Why this is temporarily accepted**

As of 2026-10-02, the GitHub advisory publishes no patched `node-forge` version, and the current upstream `@expo/cli` package still declares `node-forge ^1.3.3`. The accepted EMOPET occurrence is therefore inside Expo CLI development/build tooling. EMOPET's Security CI invokes Expo CLI only for repository-controlled project/config inspection (`expo config --type prebuild`); this acceptance does not authorize a backend or production-server use of `node-forge`.

Upstream evidence:

- https://github.com/advisories/GHSA-86w9-cpqp-85rv
- https://github.com/expo/expo/blob/main/packages/%40expo/cli/package.json

**Compensating controls**

1. the exception is exact-GHSA, exact-module and exact-path;
2. any additional `node-forge` dependency path fails closed;
3. workspace SAST, secret scanning, CodeQL and dependency audit remain active;
4. Expo CLI inputs used by CI remain repository-controlled;
5. the acceptance does not classify the cryptographic flaw as harmless and does not authorize production-runtime exposure;
6. CI fails automatically after the expiry unless the decision is explicitly reviewed.

**Review date:** `2026-10-16`

**Hard expiry enforced by CI:** `2026-10-31T23:59:59Z`

**Removal criteria**

Remove this acceptance immediately when any of the following becomes true:

- a patched `node-forge` release is published and usable by Expo CLI;
- Expo removes `node-forge` from the CLI dependency path;
- EMOPET can move to an Expo dependency chain that no longer contains the vulnerable path;
- a reviewed compatible replacement/fork removes the vulnerable verification behavior;
- the package becomes reachable through any EMOPET backend, production server or other unaccepted runtime path.

## Rules for future entries

A dependency risk acceptance must never be used merely to obtain a green build. It must include the advisory identifiers, exact dependency path, exploitability analysis for EMOPET, compensating controls, named review date, hard expiry, and objective removal criteria.
