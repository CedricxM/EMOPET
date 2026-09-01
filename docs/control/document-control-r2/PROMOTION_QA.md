# R2 repository promotion QA

**Document ID:** QA-GH-PROMO-R2-001  
**Revision:** 1.0  
**Date:** 2026-09-01  
**Status:** PASS_WITH_NOTES — READY FOR PULL-REQUEST REVIEW  
**Classification:** INTERNAL CONTROLLED

## Result

| Check | Result |
|---|---:|
| Exact source records selected | 5 |
| Exact record hashes matched to R2 manifest | 5 / 5 |
| Repository-generated control records | 6 |
| Binary files | 0 |
| ZIP or third-party payloads | 0 |
| Absolute workspace paths | 0 |
| Credential-pattern findings | 0 |
| Historical typography-authority terms in promoted files | 0 |
| Source archive mutations | 0 |

## Selection QA

| Candidate class | Decision | Basis |
|---|---|---|
| Custody recovery records | PROMOTE | Exact manifest-matched internal control evidence |
| Metadata normalization QA | PROMOTE | Exact manifest-matched, explicitly non-inferential record |
| R2 guide and workbook | HOLD | Historical typography authority conflicts with current repository addendum |
| Verbatim R2 verification record | HOLD | Contains a historical visual-authority statement |
| R2 package scope and release notes | HOLD | Refer to held guide/workbook artifacts |
| Archives, source payloads and third-party originals | EXCLUDE | Not required for repository control traceability |
| Four R2 gates with active count `NO` | MAP | Each closure is promoted only within its stated scope |

## Governance QA

- Repository `main` is used only as the pull-request base.
- The promotion branch is created from the exact observed `main` commit.
- No product or release gate is changed by this commit.
- Negated governance terms inside the exact custody records remain part of the controlled audit evidence; they are not user-interface claims.
- The root `AGENTS.md` remains the current authority for repository brand and product-language rules.

## Disposition

The eleven-file documentation-only set may be submitted for pull-request review. Merge remains subject to repository review and checks. The held R2 guide/workbook family requires a new reconciled controlled revision before any future promotion.
