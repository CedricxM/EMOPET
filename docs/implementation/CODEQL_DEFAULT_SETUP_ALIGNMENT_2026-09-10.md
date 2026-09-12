# CodeQL — align CI with enabled default setup

Date: 2026-09-10. Parent: #74. Candidate workflow change on draft PR #224.

The user enabled GitHub CodeQL default setup. On commit
`9fa2aed4fd35dbafa644eb133c7aa8db2550638c`, GitHub-managed
[run 34445544941](https://github.com/CedricxM/EMOPET/actions/runs/34445544941)
completed the Actions, C/C++, JavaScript/TypeScript and Python jobs. The
JavaScript/TypeScript log confirms both upload and completed processing.

The old advanced job in
[Security run 34445547864](https://github.com/CedricxM/EMOPET/actions/runs/34445547864)
also generated SARIF, but GitHub rejected processing because default setup was
enabled. Its preserved SARIF remains available as artifact `10139530656`.
The previous feature-disabled blocker has therefore changed to a duplicate
configuration conflict.

## Workflow behavior

GitHub default setup owns analysis and SARIF upload. The existing blocking check
name `CodeQL JavaScript/TypeScript` is retained in Security supply chain. It now
requires a GitHub-managed default-setup run for the exact PR head commit (or
workflow commit for push/dispatch), with all four configured language jobs and
their actual analysis/upload steps successful.

`scripts/security/verify-codeql-default-setup.mjs` uses the Actions read API. It
ignores custom workflows and other commit SHAs, selects the newest matching run,
and fails for missing analysis, failed/cancelled/skipped jobs, missing language
coverage, incomplete job inventory or a changed attempt during verification.
Queued/in-progress analysis is awaited for at most eight minutes. It cannot turn
an absent default-setup run into a passing check.

After success, a JSON artifact records the commit, GitHub run/attempt and job
results. Artifact names include the current workflow attempt. The obsolete
advanced upload steps are removed, along with the Security workflow's unused
`security-events: write` permission. Default setup retains its own managed upload
permissions. Repository visibility, settings and default-setup activation are not
changed by this workflow patch.

Four dependency-free regression tests exercise the evidence gate's fail-closed
behavior. Final live CI results belong in #74 and PR #224. Successful CodeQL
execution/upload is evidence of analysis coverage, not a claim of zero findings
or production readiness.
