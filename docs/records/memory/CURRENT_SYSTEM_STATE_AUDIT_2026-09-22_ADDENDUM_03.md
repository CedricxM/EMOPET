# EMOPET — Current System-State Audit — 22 September 2026 — Addendum 03

**Addendum date:** 2026-09-22
**Parent snapshot:** `CURRENT_SYSTEM_STATE_AUDIT_2026-09-22.md`
**Preceding addenda:** `…_ADDENDUM_01.md` (#70 closure, #86 window arithmetic), `…_ADDENDUM_02.md` (lockfile reproducibility, a guard's blind spot, one self-correction)
**Status:** `CONTROLLED MEMORY / ADDENDUM — CREATES NO PRODUCT, SCIENTIFIC OR LEGAL AUTHORITY`
**Parent snapshot base:** `main@a8688ecb9d0c5359087d656018060acefc6eb9c6`
**Reason for addendum:** the parent snapshot §4.1 examined one science feature. All five were then audited the same way. The cross-feature pattern is the finding, and it does not live in any single issue.

Follows the established discipline: the parent remains accurate for its stated time; later evidence is recorded separately.

---

## 1. Five features, four distinct failure mechanisms

The parent snapshot recorded `rr_variability` as a contradiction and implied the others were of the same kind. They are not. Each mechanism needs a different remedy, which is why the distinction matters more than the count.

| Feature | Mechanism | Evidence |
|---|---|---|
| `rr_variability` (#86) | **Fork** — two internally self-consistent, mutually incompatible specifications | docs say CV/60 s, non-monotonic, plateau `·0.5`; firmware + `observation-model.ts` + its test say SD/300 s, monotonic, plateau `·1.35` |
| `recovery_speed` (#90) | **Divergence asserted by tests** — four rules differ, and the test file declares them correct in its own comments | `// back above low -> reset` on a `0.5` sample where `low=0.3`, `high=0.6` |
| `anticipation_index` (#89) | **False equivalence, invisible to the fixture** — thresholds faithful, one approximation claimed as exact, unreachable by the test data | every fixture occurrence was built exactly on the hour, where bucket ≡ ±30 min |
| `activity_variability` (#87) | **Contract holds, functional form does not** — firmware matches the document exactly; the observation model is additive in the doc, proportional in code | `mean + a·k2` versus `vBase·(1 + 0.4a)` |
| WQI / RSI (#91) | **Sold without definition** — entitlement-gated at a paid tier, no computation, no entry in the model document | `entitlements/index.ts:38-39`, `min_tier: 'kit'` |

`activity_variability` is the useful counter-example: the TAG firmware implements the documented rule exactly (`1800 s`, `900` valid, `sqrt(var)/mean`). The v6 round was **not** uniformly unreliable, so a blanket "rewrite the v6 features" reading would be wrong.

## 2. Two findings that cross features

### 2.1 The observation models are additive in the document and proportional in code

`docs/eli_model.md` writes `h = mean + a·k1` and `h = mean + a·k2`, with **`k1` and `k2` never assigned a value anywhere**. `observation-model.ts` writes `vBase·(1 + 0.5a)` and `vBase·(1 + 0.4a)`.

The Jacobian therefore differs in kind, not degree: `k` is baseline-independent in the document, `vBase·k` scales with the baseline in code. A dog with low baseline variability gets proportionally **muted** sensitivity under the coded form — the observation can barely move the latent state. That runs against a product whose premise is comparing a dog to its own references, since the calmest, most regular dogs are where a subtle change matters most.

Six observation gains are hardcoded with no provenance in the model document: `0.4`, `0.5`, `1.2`, `0.4`, `0.6`, `0.3 / −0.2`.

### 2.2 The engine's unit tests are not independent evidence about the model document

Established across three features and stated here because it changes how any future audit should read a green suite:

- for `recovery_speed` the tests **encode a competing specification**, with comments spelling out the divergence;
- for `anticipation_index` the fixture is **too idealised to reach** the diverging path;
- for `rr_variability` the test **locks** the monotonic reading (`expect(s1.x[0]).toBeGreaterThan(predicted.x[0])`).

So a green `pnpm test` proves conformance to the tests, not to `docs/eli_model.md`. Resolving any of these toward the documents will fail engine tests, and that failure is the signal rather than a regression.

## 3. What was corrected rather than decided

No firmware constant, engine model, threshold, coefficient or algorithm was changed. Three statement-level corrections were made, all zero-behaviour:

- `anticipation-tracker.ts` — the comment asserting `±30 min ≡ same hour bucket` replaced with an accurate approximation note; two **characterisation** tests added with off-the-hour times, which now prove the inversion by measurement: eight departures inside a 30-minute band yield coverage `0.50`, while eight spread across `08:00–08:55` yield `1.00`;
- `recovery-tracker.ts` — the class docstring claimed `rrMean`-derived thresholds "+ 1.5\*std" in arousal units, contradicting `update()` in the same file and implying a `≥ 60 s` start rule the code lacks;
- `vet-report.ts` — the coverage line said `Couverture de donnees` for a sensor-only ratio, and the owner-note count was decided twice (fetch `5`, render `slice(0, 4)`).

## 4. This addendum's own reliability

Recorded because a memory record that hides its corrections is worth less than one that shows them.

Three claims published in this session's issue comments were wrong and were retracted:

1. **#142 / #140** — a maximum query horizon was argued to be derivable from the 36-month retention categories. Both consumers of `parseLookbackWindow` return `503` and read nothing, and `#140` uses a separate `parseVetReportDays`. Retracted; corrected upstream in `fdd1a58` / `09e695b`.
2. **#91** — "nothing tells the Guardian this is simulated". False: `ConfidenceBadge` renders `DÉMO · {label}` and `Gauge` renders `DÉMO · /100`, both present in the WQI and RSI cards. Retracted.
3. **#86** — CV was recommended partly because the engine's baseline fields "assume it". They do not; the engine's comment reads *"Expected **STD** of IBI"*. Withdrawn.

The three share one cause: **a claim about composed behaviour was made from a single file.** A grep of one page cannot answer what a React surface renders; a grep of one document cannot answer what a pipeline computes. The same failure produced two guards in this session that tripped on their own explanatory comments, and one characterisation test that passed `vitest` while failing `tsc`.

## 5. What this addendum does not change

No pull request was merged, no gate closed, `main` is untouched; the work sits on `claude/emopet-audit-sept-22-ni7yo7`. All five science gates remain open, and the decisions they need are unchanged in kind: `#86` needs a model sign before a unit, `#87` needs the affective hypothesis separated from the ODBA citation, `#89` needs an eligibility rule and a timezone, `#90` needs four rules and a threshold derivation, `#91` needs a product and commercial decision. Under `CLAUDE.md`, an audit plus a set of guards is still not a decision.
