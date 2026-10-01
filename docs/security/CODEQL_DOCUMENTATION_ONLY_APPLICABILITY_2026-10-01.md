# EMOPET — CodeQL documentation-only applicability

**Date:** 2026-10-01  
**Status:** `IMPLEMENTED FAIL-CLOSED SCOPE EXCEPTION`

## Problem

The security workflow requires GitHub-managed CodeQL evidence for the exact pull-request head.

For documentation-only pull requests, GitHub default setup may not create an exact-head dynamic CodeQL run because no analyzable source file changed. The repository evidence job can therefore wait for a run that will never exist and fail despite the PR containing no executable change.

PR #847 exposed this path.

## Decision

The verifier has one narrow applicability exception for pull requests whose complete changed-file inventory contains documentation only.

Accepted paths are limited to:
- `docs/**/*.md`;
- `docs/**/*.mdx`;
- `docs/**/*.txt`;
- root `README.md`;
- root `ARCHITECTURE.md`;
- root `CONTRIBUTING.md`;
- root `SECURITY.md`.

Any other path keeps the existing exact-head CodeQL requirement.

## Fail-closed rules

Documentation-only applicability is rejected when:
- the changed-file inventory is empty;
- any code/config/workflow/data file is present;
- a docs file was renamed from a non-doc path;
- the PR head SHA differs from the expected SHA;
- changed-file pagination cannot be completed;
- the native CodeQL open-alert inventory is not empty.

Examples that do **not** qualify:
- `apps/web/lib/foo.ts`;
- `.github/workflows/security-supply-chain.yml`;
- `docs/control/policy.json`;
- rename `apps/web/foo.ts -> docs/archive/foo.md`.

## Evidence artifact

Documentation-only PASS still writes `codeql-default-setup-evidence.json` with:
- exact head SHA;
- PR files URL;
- `applicability: documentation-only`;
- complete changed-file inventory;
- native CodeQL open-alert inventory;
- `runId: null` because exact-head analysis is not applicable.

## Security boundary

This is not a general CodeQL skip.

Any PR touching a non-documentation path still requires the existing managed CodeQL exact-head run and configured-language evidence.

No workflow permissions, configured languages or open-alert gates are reduced.
