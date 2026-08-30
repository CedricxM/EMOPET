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

## Rules for future entries

A dependency risk acceptance must never be used merely to obtain a green build. It must include the advisory identifiers, exact dependency path, exploitability analysis for EMOPET, compensating controls, named review date, hard expiry, and objective removal criteria.
