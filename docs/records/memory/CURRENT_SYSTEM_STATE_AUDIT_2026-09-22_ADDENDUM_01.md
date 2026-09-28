# EMOPET — Current System-State Audit — 22 September 2026 — Addendum 01

**Addendum date:** 2026-09-22  
**Parent snapshot:** `CURRENT_SYSTEM_STATE_AUDIT_2026-09-22.md`  
**Status:** `CONTROLLED MEMORY / ADDENDUM — CREATES NO PRODUCT, SCIENTIFIC OR LEGAL AUTHORITY`  
**Parent snapshot base:** `main@a8688ecb9d0c5359087d656018060acefc6eb9c6`  
**Reason for addendum:** preserve the dated snapshot unchanged while recording two material facts that changed or were established immediately after it was written.

This file does **not** rewrite the parent snapshot. Under the memory index's current-over-history rule, the parent remains an accurate record of what was observed at its stated time. This addendum records later state and later evidence separately.

---

## 1. #70 is no longer an open current gate

The parent snapshot §6 lists `#70` (ID-01) among the open gates. That was true at the time the snapshot was committed.

After the snapshot was committed, issue `#70` was closed as `completed` on 2026-09-22 at 07:35:35 UTC.

The closure does **not** mean its residual cross-domain dependencies disappeared. They remain owned by their successor gates, especially:

- privacy / erasure → `#69`;
- device-principal identity / Device Trust → `#66`.

Controlled implication for later summaries: do not carry `#70` forward as an open gate merely because the dated snapshot names it. Preserve the snapshot; use the current issue state and successor owners.

---

## 2. #86 window viability was narrowed by arithmetic after the snapshot

The parent snapshot §4.1 correctly records the unresolved cross-layer contradiction:

- documentation: CV of inter-breath intervals over 60 s;
- MAT firmware: SD over a 300 s buffer;
- minimum accepted interval count in firmware: `RR_IBI_MIN_COUNT = 30`.

After the snapshot, branch evidence narrowed the **window** part without selecting the contested statistic.

### 2.1 60 s is unreachable at the documented normal-rest range

`scripts/science/rr-variability-window-audit.mjs` now parses the firmware constants and checks only count/window viability.

Using the external veterinary resting-rate range recorded in `#86` and in the audit script (15–30 breaths/min):

| Rate | Breaths observable in 60 s | Inter-breath intervals | Minimum required |
|---|---:|---:|---:|
| 15/min | 15 | 14 | 30 |
| 30/min | 30 | 29 | 30 |
| 31/min | 31 | 30 | 30 |

Therefore a 60 s window cannot satisfy the same contract's 30-interval gate anywhere in the cited normal resting range. The first arithmetically possible value occurs at 31 breaths/min.

The firmware's current 300 s window yields 74 intervals at 15 breaths/min, so it is viable at the slow end of the cited normal resting range.

### 2.2 The viable window still exposes a sleep-tail blind spot

The same audit reports, rather than hides, a second boundary: at the deep-sleep tail represented in the branch audit as 6 breaths/min, 300 s yields 29 intervals, one short of the 30-interval gate.

That does **not** restore 60 s as a candidate. It means the eventual `#86` authority must review the relationship among:

- the 300 s window;
- `RR_IBI_MIN_COUNT`;
- the intended sleep observation state;
- abstention semantics when the minimum is not reached.

The 6 breaths/min value is an external reference carried by the branch audit, not an EMOPET bench or canine-validation result.

### 2.3 What this evidence does not decide

This arithmetic does **not** decide:

- coefficient of variation vs standard deviation;
- the final units;
- the ELI observation function;
- canine scientific validity;
- any diagnostic or emotional interpretation.

The audit is deliberately constrained against becoming a second feature-definition authority: its tests reject adding mean-division or square-root statistic logic.

Branch evidence:

- `scripts/science/rr-variability-window-audit.mjs`;
- `scripts/science/rr-variability-window-audit.test.mjs`;
- package scripts `science:rr-audit` and `science:rr-audit:test`;
- commit `41d283a2e7b4c367ef1750d52cdd8061ad5ef499`.

Negative verification was performed by temporarily regressing the firmware window to 60 s: the audit exited non-zero with the expected unreachable-window diagnostic, then the firmware was restored with no firmware diff.

---

## 3. Current interpretation

The original 22 September snapshot remains immutable historical evidence.

For current work after this addendum:

1. treat `#70` as closed and route residual work to its successor owners;
2. treat the 60 s `rr_variability` window as arithmetically incompatible with the existing 30-interval gate at the cited normal-rest range;
3. keep the statistic, units, sleep-tail handling and scientific validity open in `#86`;
4. do not interpret a PASS from the arithmetic audit as bench, animal, scientific or product validation.
