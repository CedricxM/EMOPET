# Open-items promotion QA

**Result:** `PASS_WITH_NOTES / NOT RELEASED`

| Check | Result |
|---|---:|
| R2 checkpoint SHA-256 | `1fda848d1bb7a77513450f797171ba672f9a7fc7062b701f6af8c088ad713ce7` |
| R2 ZIP compressed-data test | PASS |
| Master gate rows | 70 |
| Active / next-release-only gate rows | 63 |
| R2 reconciliation occurrences | 444 |
| Candidate files before QA/manifest | 149 |
| Losslessly chunked large records | 8 |
| Credential-pattern findings | 0 |
| Source payload binaries copied | 0 |
| Third-party originals copied | 0 |
| MOKO payload/archive binaries copied | 0 |

## Notes

- Exact R2 control-plane records are byte-preserved where copied.
- Large records are losslessly chunked; `CHUNKED_FILE_INDEX.csv` records original and part hashes.
- Gate cards and active/reference indexes are derived review views and make no closure claim.
- The 2026 repository rebrand remains current for repository-facing work; historical R2 brand assertions are not promoted as current authority.
- The manifest is generated last, after this QA record.
