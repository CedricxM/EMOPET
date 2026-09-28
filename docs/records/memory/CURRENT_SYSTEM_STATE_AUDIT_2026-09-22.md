# EMOPET — Current System-State Audit — 22 September 2026

**Audit date:** 2026-09-22
**Status:** `CONTROLLED MEMORY / AUDIT SNAPSHOT — CREATES NO PRODUCT, SCIENTIFIC OR LEGAL AUTHORITY`
**Scope:** the observable state of the repository, its issue tracker and its open pull requests, one week after the 17 September authority-conflict audit. Where the source assessment relies on external evidence (regulatory qualification, hardware bench results, supplier status), this record marks it `NOT VERIFIED HERE` rather than repeating it as fact.
**Base audited:** `main` @ `a8688ecb9d0c5359087d656018060acefc6eb9c6` (2026-09-21 19:52 +0200)
**Preceding record:** `CURRENT_REPO_AUTHORITY_CONFLICT_AUDIT_2026-09-17.md`

## Purpose

A founder-level assessment dated 22 September 2026 described a shift in the project's centre of gravity: the dominant software workstream is no longer the mega-PR `#224`, and Privacy has become the dominant recent workstream.

This record does three things:

1. preserves that assessment's structure and date as controlled memory;
2. attaches **file-level evidence** to the claims that the repository can actually prove;
3. **corrects two of its claims** where the repository shows something more precise.

It redefines nothing. It approves nothing. It does not convert any finding below into a decision.

---

## 1. What this record does not do

- It does not promote any open pull request into `main` authority.
- It does not close, reword or re-scope any open issue.
- It does not set a retention duration, a feature definition, a threshold, or a hardware architecture.
- It does not qualify EMOPET's legal status under any regulation.

Per `INDEX.md` *Current-over-history rule*: this snapshot is dated, and a later controlled authority supersedes it without blending.

---

## 2. Verified movement on `main` since 2026-09-17

### 2.1 The Privacy wave is real code, not documentation

Ten Privacy merges landed on `main` between `#466` and `#477` — `#466`, `#469`, `#470`, `#471`, `#472`, `#473`, `#474`, `#475`, `#476`, `#477` — interleaved with one dependency bump (`#467`) and one contrast fix (`#468`). The two findings worth recording:

**Canonical retention authority now exists as machine-readable configuration.** `config/privacy/retention-schedule.json` carries **22 categories**, each with `trigger`, `activeRetention`, `archive`, `finalDisposition`, `holdConditions`, `purgeEvidence` and `authority`.

**The AI zero-durable decision (AI-A / R4) is enforced at two layers, not asserted.**

| Layer | Evidence |
|---|---|
| Repository / runtime guard | `backend/api/services/ai-zero-durable-retention-readiness.ts` |
| PostgreSQL boundary | `backend/db/migrations/0012_ai_zero_durable_write_guard.sql:18` — `CHECK (false) NOT VALID` |
| Runtime attestation of the constraint | probe verifies `CONSTRAINT_PRESENT`, `CHECK_EXPRESSION_FALSE`, validation state |

The migration's own comment records the deliberate restraint: *"Preserve any pre-existing rows for separately governed residue/purge handling, while blocking every new INSERT/UPDATE at the PostgreSQL boundary."* Legacy rows are **not** silently destroyed. This matches the source assessment exactly.

**The boundary is stated in the artefact itself.** `config/privacy/retention-schedule.json:4` reads `"runtimeEnforcement": "NOT_IMPLEMENTED"`, and the aggregate plan added by `#477` declares `"mode": "DRY_RUN_ONLY"` with `"destructiveActionAuthorized": false` over six categories. Nothing destructive is authorised. The dry-run is a plan, not an execution.

### 2.2 Abstention is implemented as a route contract, not a UI string

Two surfaces refuse to produce a value rather than producing a weak one:

| Surface | Behaviour | Evidence |
|---|---|---|
| ELI current + history | `501 eli_runtime_not_implemented` for a correctly owned dog | `backend/api/routes/sensors.ts:343`, `:354` |
| Presence events (create + list) | `503 PRESENCE_PERSISTENCE_NOT_READY`, `retryable: false` | `backend/api/routes/sensors.ts:42-47` |

The ELI route carries its own reasoning in a comment: *"No canonical ELI producer/runtime is wired. Do not represent NOT_IMPLEMENTED as an authoritative successful no-result."*

Under `CLAUDE.md` §5 this is valid product behaviour. It is also, read plainly, a statement that **two named capabilities do not exist**.

---

## 3. Maturity correction — four cited advances are open pull requests, not merged evidence

The source assessment cites `#410`, `#430`, `#435` and `#341` as evidence of progress. Verified at the audit base: **all four are open**, and `#435` is a **draft**. Open PR count: **46**.

| PR | Claim in source assessment | State 2026-09-22 |
|---|---|---|
| `#410` | retires the global ELI index | `OPEN` — proposal |
| `#430` | 212 focusable elements traversed; 21 buttons without visible focus on `/world` | `OPEN` — measurement made, fix not on `main` |
| `#435` | eight routes overflowed at 390px; 765px on `/quartier` → 390px | `OPEN`, `DRAFT` |
| `#341` | INT-05 durable grants, audits, DB constraints, recipient projection | `OPEN` |

Consequence for the record, in the repository's own maturity vocabulary: these are **`proposé/candidat`**, not **`implémenté`**. The rendered-QA work in `#430`/`#435` demonstrates a real advance in **method** — measuring the actual screen instead of trusting green tests — and no advance in shipped **state**. The distinction matters precisely because the numbers are persuasive.

`#224` and its decomposition issue `#246` both remain open. The source assessment's judgement that the "parallel universe" risk has diminished is consistent with the reconstructed blocks landing on `main`; the parallel universe is not yet closed.

---

## 4. Verified standing contradictions

### 4.1 `rr_variability` — three layers, two incompatible definitions

This is the sharpest verifiable scientific conflict in the repository, and it is worse than a tuning disagreement: **unit and window both differ.**

| Layer | Window | Statistic | Unit | Evidence |
|---|---|---|---|---|
| `docs/firmware_protocol.md` | **60 s** rolling ring | **CV** — `std(ibi) / mean(ibi)` | dimensionless ratio | `:20`, `:32`, `:35` |
| `docs/eli_model.md` | **60 s** | **CV** of inter-breath intervals | dimensionless ratio | `:17-18` |
| `firmware/mat/main/sensors/rr_variability.c` | **300 s** (`RR_IBI_BUFFER_WINDOW_SEC 300`) | **SD** — `sqrt(var)`, no division by mean | seconds | `.h:23`, `.h:6`, `.h:39`, `.c:78` |

A consumer calibrated on one produces a numerically and dimensionally wrong result on the other. Both documents cite Homma & Masaoka (2008) for a definition the firmware does not compute. Tracked as `#86` (FW-SCI-01).

Under `CLAUDE.md` maturity rules, no canine validation protocol should be executed against a feature whose unit is undecided.

### 4.2 The canonical engine is a declared dependency with zero runtime importers

`@emopet/eli-engine` is declared as a `workspace:*` dependency in **all three** applications — `backend/package.json:18`, `apps/web/package.json:19`, `apps/mobile/package.json:16`.

Verified across every `.ts`/`.tsx` file outside `packages/eli-engine/`: **no import or require statement resolves to it.** The only two occurrences of the package name are prose in comments:

- `apps/web/lib/eli/catalog.ts:5` — *"Valeurs alignées sur le moteur canonique (`@emopet/eli-engine`) mais…"*
- `apps/web/lib/narration.ts:35`

This is the `#118` finding recorded on 2026-09-17, unchanged one week and twelve merges later, and now with the added detail that the dependency edge exists in three manifests while the import edge exists nowhere. A manifest dependency is not runtime wiring.

---

## 5. Privacy diagnosis correction — the durations exist; the legal frame does not

The source assessment argues that `#69` is blocked on decisions *"not codable by GitHub"*, giving as its example *"how long do we keep a given category?"*, and recommends building a validation sheet of `Purpose → legal basis → retention trigger → duration → deletion/anonymisation → exception → approver`.

The repository shows something more precise, and the correction sharpens rather than weakens the recommendation.

**Already present**, per category, for 22 categories in `config/privacy/retention-schedule.json`: retention trigger, duration, final disposition (deletion or irreversible anonymisation), hold conditions, purge-evidence requirement.

**Absent from the schedule entirely**: `purpose`, `legalBasis`, `approver`. The file's own status field states the gap at `:3` — `PRODUCT_APPROVED_CANDIDATE_LEGAL_PRIVACY_SIGNOFF_PENDING`.

So the blocking input is **not** "a developer must not invent durations" — product-level durations are already recorded and the repository is explicit that they are candidates. The blocking input is the **lawful-basis and sign-off column that no engineering pass can produce**: for each of the 22 categories, the purpose it serves, the legal basis it rests on, and a named human approver.

That is the whole of the remaining first step, and it is a sheet a lawyer signs, not a service to write.

---

## 6. Open gates carried forward unchanged

Verified open at the audit base. 79 open issues in total; those the source assessment relies on:

| Issue | Domain | Why it is still the gate |
|---|---|---|
| `#69` | Privacy authority | controller/legal entity, legal bases, final schedule, destructive execution, provider deletion, backups, processors/transfers, production approval |
| `#70` | Identity | ID-01A/B/C delivered on `main`; residual E7 → `#69`, E9 → `#66` |
| `#122` | Sensor ingestion | BLE bytes → parsed frame → features → `EliInput` is not yet an authoritative chain |
| `#124` | ELI API | phantom mobile endpoint vs. the backend's `501` |
| `#118` | ELI runtime + science authority | G4–G8 unassigned; see §4.2 |
| `#86` `#87` `#89` `#90` `#91` | Science contracts | `rr_variability`, `activity_variability` arousal hypothesis, anticipation, recovery, WQI/RSI freeze |
| `#133` | Presence semantics | row count ≠ hours; missing MAT/TAG fields ≠ zero; no authoritative hourly join |
| `#66` | Device Trust | manufacturing identity, claim, binding, rebind, stolen-device recovery, signed commands, secure boot, OTA signing, anti-rollback, SBOM |
| `#175` | Privileged access | no real MFA / workforce provider selected or evidenced |
| `#239` `#37` | CRA readiness | human evidence missing: primary AR, EU Login/MFA, backup, intake, off-SRP package, tabletop |
| `#257` | Repository governance | ruleset shape chosen; required checks not yet configured |
| `#230` | MAT commercial gate | incremental value over TAG-only not proven |
| `#114` `#116` | IP and third-party rights | contributor/asset provenance and data/service rights evidence |
| `#68` | Data boundary | persistence/access matrix; Data Act ≠ centralise every raw stream |
| `#246` | Integration | `#224` decomposition still open |

The pattern the source assessment names is visible in this table and is the most useful thing in it: the repository now holds a large and genuinely good inventory of controls that can say **no**, while several positive capabilities remain deliberately absent. Sound at this stage. Dangerous the moment `fail-closed everywhere` is mistaken for `functional product`.

---

## 7. Eight decision locks proposed by the source assessment

Recorded as **proposals**, with the issue that already owns each one. None is decided by this record.

| Lock | Question to close | Owning issue |
|---|---|---|
| `PRIV-RETENTION-01` | purpose + legal basis + named approver for the 22 existing categories (see §5) | `#69` |
| `ELI-RUNTIME-OWNER-01` | named owner and one narrow vertical slice: one authorised observation + provenance + quality + abstention | `#118` |
| `RR-VARIABILITY-01` | CV/60 s, SD/300 s, or another definition chosen on evidence (see §4.1) | `#86` |
| `DEVICE-TRUST-01` | device identity + claim + OTA architecture before TAG advances further | `#66` |
| `TAG-FEASIBILITY-01` | combined battery / RF / PDN / antenna / enclosure / thermal / acoustic packing review before routing freeze | *none — gap* |
| `MAT-VALUE-01` | keep MAT explicitly conditional on incremental-value evidence | `#230` |
| `PRIVILEGED-IDP-01` | choose one provider to test in staging against the real workforce stack, instead of extending the generic adapter | `#175` |
| `MAIN-PROTECTION-02` | finish the ruleset's required checks once check topology is stable | `#257` |

---

## 8. Claims in the source assessment that this record does not verify

Listed so that a later reader does not mistake preservation for confirmation.

| Claim | Status here |
|---|---|
| CRA Article 14 reporting obligations apply from 11 September 2026; ENISA SRP operational | `NOT VERIFIED HERE` — external regulatory source. EMOPET's own applicability per state remains a legal qualification, not a repository fact. |
| Batteries Regulation Article 11 removability applies from 18 February 2027 | `NOT VERIFIED HERE` — external regulatory source |
| AI Act Article 50 applicable since 2 August 2026 | `NOT VERIFIED HERE` — external regulatory source |
| MAT remains engineering/DFM candidate, not physically validated | `CONSISTENT WITH REPOSITORY` — no bench evidence artefact was found that would close PZ/cable, load-cell, AFE, DRDY timing, noise, crosstalk or repeatability gates. Absence of evidence here is not proof of absence in the lab. |
| TAG architecture more detailed but not validated | `NOT VERIFIED HERE` — no physical evidence in repository |
| Drive documents, supplier quotes, MOKO progress | `NOT VERIFIED HERE` — outside repository |
| Guardian/Vet, Community, Breiz, GTM, financing and unit-economics judgements | `PRESERVED AS ASSESSMENT` — product judgement, not a repository-verifiable fact |

---

## 9. Provenance and limits

- **Method:** reading the repository at the stated base commit, plus the GitHub issue and pull-request state on 2026-09-22. No file, issue, pull request or external document was modified in producing the source assessment.
- **Coverage:** 79 open issues and 46 open pull requests were enumerated; the four pull requests cited in §3 were checked individually for state. Pull-request *contents* were not reviewed line by line, so §3 records their state, not a verdict on their correctness.
- **What this record cannot see:** hardware bench results, Drive documents, supplier correspondence, legal advice, and anything decided in conversation and not written down.
- **Maturity of the record itself:** `AUDIT SNAPSHOT`. Under `CLAUDE.md`, an audit is not a decision, a beautiful document is not technical maturity, and this file gains no authority from being detailed.
