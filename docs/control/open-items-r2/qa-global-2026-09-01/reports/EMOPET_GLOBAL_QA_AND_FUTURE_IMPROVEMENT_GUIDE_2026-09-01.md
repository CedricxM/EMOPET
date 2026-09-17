# EMOPET — Global QA and future-improvement guide

Document ID: `EMOPET-GUIDE-QA-001`  
Revision: `1.0`  
Date: `2026-09-01`  
Status: `CONTROLLED INTERNAL GUIDE / NOT RELEASED`

## 1. What the current QA status means

- `PASS`: the measured control passed within its stated scope.
- `PASS_WITH_NOTES`: the file is intact and reviewable, but one or more improvements, evidence gaps or publication gates remain.
- `FAIL`: the measured control failed and the file requires controlled remediation before reliance.
- `NOT_APPLICABLE`: the control does not apply to that file format.

`PASS_WITH_NOTES` is not a release, transmission, scientific validation, legal conclusion, physical validation or manufacturing authorization.

## 2. Current baseline

- 430/430 source files match the immutable source archive.
- Zero source files were changed by QA.
- All 430 are retained as `PASS_WITH_NOTES / INTERNAL REVIEW ONLY / NOT RELEASED`.
- `OPEN-DOC-005` remains open and corpus-wide visual conversion remains blocked.

## 3. When new evidence arrives

1. Preserve the existing source and record its SHA-256.
2. Identify the exact governing authority, owner, revision, classification and supersession relationship.
3. Reconcile claim-level evidence separately from document formatting.
4. Create a new controlled revision; never silently overwrite a frozen archive or third-party original.
5. Resolve only the findings supported by the new evidence or explicit authority.
6. Render the new revision using controlled typography where technically available.
7. Run structural, metadata, formula, link, accessibility and full-size page-by-page visual QA.
8. Generate the manifest, SHA256SUMS and archive hash only after all remediation and QA are complete.
9. Promote on GitHub only through the correct controlled folder and review workflow; keep open items separate from closed records.

## 4. Priority improvement order

1. Evidence/authority contradictions and unresolved gates.
2. Final publication typography under `BRAND-AUTHORITY-001`.
3. XLSX print profiles that split registers across excessive pages.
4. Core metadata title/creator fields.
5. Table header flags and image alternative text.
6. External-link target verification.
7. Final page-by-page publication review and approval.

## 5. Non-inference rule

Formatting, source availability, repository presence or a passing integrity check cannot establish component selection, system architecture implementation, scientific validity, legal effect, physical performance, manufacturing readiness, supplier transmission or Product release.

## 6. GitHub handling

- Apply the current repository-facing brand declared in `AGENTS.md`; keep historical Work brand records traceable without silently rewriting them.
- Closed controlled records: preserve their approved path and review history.
- Open or partially reconciled records: keep in the separate quarantine/open-items folder.
- Immutable source packages and third-party originals: reference by identity and hash; do not republish or modify unless explicitly authorized.
- QA checkpoints: label `NOT_RELEASED`, include manifest and SHA-256, and never imply that main or a release tag was updated unless separately performed and evidenced.
