# EMOPET — Current System-State Audit — 22 September 2026 — Addendum 02

**Addendum date:** 2026-09-22
**Parent snapshot:** `CURRENT_SYSTEM_STATE_AUDIT_2026-09-22.md`
**Preceding addendum:** `CURRENT_SYSTEM_STATE_AUDIT_2026-09-22_ADDENDUM_01.md` (covers `#70` closure and the `#86` window arithmetic; not repeated here)
**Status:** `CONTROLLED MEMORY / ADDENDUM — CREATES NO PRODUCT, SCIENTIFIC OR LEGAL AUTHORITY`
**Parent snapshot base:** `main@a8688ecb9d0c5359087d656018060acefc6eb9c6`
**Reason for addendum:** record two further post-snapshot findings, and one correction to branch work that the parent snapshot did not contain, without rewriting the dated snapshot.

Follows Addendum 01's discipline: the parent remains accurate for its stated time, and later state is recorded separately.

---

## 1. A condition the snapshot could not see: the committed lockfile was not reproducible

Not observable by reading the repository. It surfaces only on attempting a dependency change, which is why nine sections of repository review did not find it.

Adding **any** dependency anywhere in the workspace forces full re-resolution, which then failed `trustPolicy: no-downgrade` on four packages **already present in the committed `pnpm-lock.yaml`**:

| Package | Reached via | Attested? |
|---|---|---|
| `undici-types@6.21.0` | `@types/node@22.19.15` (`apps/web`) | present 6.13.0–6.18.2, absent 6.19.0–7.2.0, present again 7.16.0 |
| `eslint-import-resolver-typescript@3.10.1` | `eslint-config-next@15.5.24` (`apps/web`) | absent 3.6.3–3.10.1, present from 4.4.4 |
| `ua-parser-js@1.0.41` | `fbjs@3.0.5`, i.e. the `react-native` chain | absent 1.0.37–1.0.41, present from 2.0.0 |
| `semver@5.7.2` | `react-native@0.76.9` | absent across all 5.x and 6.x; present only from 7.x |

`pnpm install --lockfile-only` on the pristine tree completes in 422 ms precisely because the lockfile is already current and nothing is re-resolved. The lockfile was **usable but not reproducible**.

### 1.1 The part that looked like a policy conflict was a configuration trap

In pnpm 10.33.0, `evaluateVersionPolicy` returns on the **first** rule whose package name matches. With `semver@6.3.1` listed first, a separate `semver@5.7.2` entry in `trustPolicyExclude` was **unreachable** — parsed into the config and silently ineffective. Several exact versions of one package must be written as a `||` union on one line. Read from pnpm's own `createPackageVersionPolicy` / `parseExactVersionsUnion`.

The same trap applies to `minimumReleaseAgeExclude`, which uses the same builder.

### 1.2 Why this is not a weakening of the policy

Re-resolution with all four exceptions in place changed **zero resolved versions**; the `pnpm-lock.yaml` diff was 8 lines, all of it one newly added package. The graph was reproducible throughout and only unreachable through the trap. The exceptions permit recording what is already committed and already green in CI; they admit no new code.

Recorded under `#482`, with per-package evidence inline in `pnpm-workspace.yaml`. `ua-parser-js` is named explicitly there rather than listed silently, given its 2021 takeover history.

Scope decision taken and recorded: the trust policy applies to `devDependencies` and type-only packages on the same terms as runtime dependencies, since a build-time dependency executes in CI with the checkout and the job's secrets.

---

## 2. The parent snapshot §3 gained a case, and it is the stronger form of the claim

§3 records that four cited advances were open pull requests, and that rendered-QA work demonstrated an advance in method rather than in shipped state. That stands.

A same-day case shows the method claim is narrower than it looks. A mobile typography change was written, typechecked, guarded by a purpose-built regression test, and green throughout — and its **web** target still named a font family that nothing registers. `expo-font` emits `@font-face{font-family:<the key useFonts was given>}`, so the registered CSS families are the aliases passed to `useFonts`, not the human family name. The migration would have read as complete and rendered the system sans on web.

Nothing in the test suite could have caught it. It was found by reading the library's own source. Recorded because the useful generalisation is not `green tests ≠ good experience` but the sharper one: **a guard proves the invariant its author thought of.** The guard was subsequently extended to the web target, and verified by injecting the defect.

---

## 3. Correction to branch work — a derivation in this session's own output was wrong

Recorded here rather than quietly fixed, because it was published in issue comments that a reader could act on.

Branch work argued that a maximum query horizon for `#142` was **derivable** from `config/privacy/retention-schedule.json` at 36 months, via `sensor_preprocessed_detailed` and `eli_inferred_detailed`. That derivation was wrong in two ways:

1. **The call sites read nothing.** Both consumers of `parseLookbackWindow` — `GET /api/dogs/:id/absence-comparison` and `GET /api/sensors/presence/:dogId/events` — return `503 NOT_IMPLEMENTED`. There is no durable Presence category in the retention schedule, so there is no storage/lifecycle ceiling to derive from until `#135` names one. The derivation named the categories the routes were assumed to read, not the ones they read.
2. **`#140` was folded in wrongly.** The vet-report path uses its own `parseVetReportDays` (`backend/api/routes/dogs.ts:69`) over a different mixed dataset. It does not use the guarded helper at all, so a control on that helper never owned `#140`'s decision.

Corrected on branch in `fdd1a58` / `09e695b`: the helper now records the real authority gap (`#135`, no known ceiling) instead of a retention-derived number, states that `#140` is out of scope, and the guard test asserts `doesNotMatch` on `36 months`, `sensor_preprocessed_detailed` and `eli_inferred_detailed` so the incorrect derivation cannot be reintroduced. A third test asserts both call sites stay fail-closed.

The guard's original purpose survives: `#142` WINDOW-G3's instruction not to invent an arbitrary maximum is enforced by a test rather than by a comment. Only the claimed source of a future cap was wrong.

---

## 4. What this addendum does not change

No pull request was merged, no gate closed by code, and `main` is unchanged by any of it — the work sits on `claude/emopet-audit-sept-22-ni7yo7`. The parent snapshot's eight decision locks remain proposals, and its four open pull requests remain open. `#86` keeps CV-vs-SD, the sleep tail and scientific validity open, per Addendum 01. Under `CLAUDE.md`, an audit plus a set of guards is still not a decision.
