# Repository branch lifecycle audit

**Status:** READ-ONLY OPERATOR TOOL / NOT DELETION AUTHORITY  
**Issue:** #679 — branch lifecycle and controlled stale-branch cleanup

## Purpose

The repository has accumulated hundreds of historical branches. The risk is not
only clutter: a stale or reused branch can be mistaken for current authority,
used as a contaminated PR base, or treated as safely merged when its ref has
moved since the original pull request.

This tool automates the **audit classification only**. It does not delete,
force-update, close, merge, or retarget any branch or pull request.

## Command

Live repository audit:

```bash
GITHUB_TOKEN=... node scripts/repository/branch-lifecycle-audit.mjs \
  --repository CedricxM/EMOPET \
  --output branch-lifecycle-audit.json
```

Offline/replay audit from a captured JSON inventory:

```bash
node scripts/repository/branch-lifecycle-audit.mjs \
  --fixture branch-inventory-fixture.json \
  --output branch-lifecycle-audit.json
```

A fixture must contain:

```json
{
  "repository": "CedricxM/EMOPET",
  "defaultBranch": "main",
  "branches": [
    { "name": "feature/example", "sha": "<sha>", "protected": false }
  ],
  "pulls": [
    {
      "number": 123,
      "state": "closed",
      "merged": true,
      "headRef": "feature/example",
      "headSha": "<sha>",
      "headRepoFullName": "CedricxM/EMOPET",
      "baseRef": "main"
    }
  ]
}
```

## Classifications

| Status | Meaning |
| --- | --- |
| `KEEP_DEFAULT_BRANCH` | Canonical default branch. Never a cleanup candidate. |
| `KEEP_HARD_EXCLUSION` | Branch is explicitly excluded by the controlled #679 hard-exclusion registry. |
| `KEEP_OPEN_PR_HEAD` | An open PR currently uses the branch ref. |
| `KEEP_PROTECTED` | Protected branch. Requires separate governance review. |
| `SAFE_MERGED_MAIN_HEAD_CANDIDATE` | Current branch SHA exactly matches a same-repository PR head merged into the canonical default branch, with no contradictory same-ref SHA evidence. |
| `HOLD_REF_MOVED` | The same branch name appears in PR evidence at another SHA. Reuse/movement is ambiguous. |
| `HOLD_NON_MAIN_MERGE` | Exact SHA was merged, but not into the canonical default branch. |
| `HOLD_CLOSED_UNMERGED` | Exact SHA belongs to a closed, unmerged PR. Supersession/provenance must be recorded explicitly. |
| `HOLD_UNPROVEN` | No exact evidence proves the ref disposable. |

## Hard-exclusion registry

Explicit #679 exclusions are versioned in:

`config/repository/branch-lifecycle-hard-exclusions-v1.json`

They are evaluated before merged-head cleanup candidacy. Presence in that registry always yields `KEEP_HARD_EXCLUSION`.

## Fail-closed rules

The audit intentionally refuses to infer deletion authority from:

- branch age;
- branch naming conventions;
- a closed PR by itself;
- a merge into another feature branch;
- a branch name reused at a different SHA;
- a fork PR with the same ref name;
- an old audit receipt without current SHA re-verification.

Only an exact current branch SHA matching a same-repository PR head that merged
into the canonical default branch can be emitted as an automatic **candidate**.

Even then, the output is still not a deletion command.

## Relationship to issue #679

Issue #679 already records:

- `delete_branch_on_merge=true`;
- historical cleanup receipts;
- hard exclusions for active/provenance-sensitive branches;
- the requirement to re-check SHA and open-PR state immediately before any
  destructive operation.

This tool reduces repeated manual inventory work. It does not replace the final
pre-delete verification or the deletion receipt required by #679.

## Output authority

Every report carries:

```text
READ_ONLY_AUDIT_NOT_DELETION_AUTHORITY
```

A downstream operator must treat all `HOLD_*` states as non-deletable without
separate evidence. `SAFE_MERGED_MAIN_HEAD_CANDIDATE` means "eligible for a
fresh destructive preflight", not "delete now".
