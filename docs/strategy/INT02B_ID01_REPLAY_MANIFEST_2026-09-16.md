# INT-02B — ID-01 canonical identity replay manifest

`STATUS = ANALYSIS ONLY / NO RUNTIME REPLAY / NO MIGRATION AUTHORITY / NOT RELEASE AUTHORITY`

Documentation only. This record moves no schema, no migration, no workflow and no runtime code.
It does **not** compete with the future INT-02A AUTH/session runtime PR: INT-02A owns
AUTH/session reconstruction, INT-02B owns canonical shared user/dog identity (ID-01). The two
slices touch disjoint files except for one shared workflow, handled in §8.

Parent decomposition plan: #246 · INT-02 replay manifest: #250 · ID-01 gate: #70 · AUTH-01 gate: #75
Frozen candidate source: #224 · INT-01 candidate: #249 · INT-01 forensic record: #254

---

## 1. Verified repository state

Rechecked at the start of this pass, not taken from prior text:

| Ref | SHA / state | Verification |
|---|---|---|
| `main` | `51bfdde694903c7f0e4b759ae8914c1d18f15810` | `git rev-parse origin/main` |
| #224 frozen candidate | `7e0d90445a3cf03b094d7037aa6addbfa6f2cc19` | `git rev-parse origin/experience-hardening-2026-09-06` |
| #249 INT-01 candidate | `21cf495c517a292bea072fde7b8ea4e6d558ac00` | PR API — OPEN / DRAFT / UNMERGED / `mergeable_state: clean` |
| #254 INT-01 manifest | `cd8a7ff56504632e41688ae6f910acd13b3c27d9` | PR API — OPEN / DRAFT / UNMERGED |
| #250 | open | INT-02 controlled replay manifest (AUTH-scoped) |
| #70 | open | ID-01 gate, `G-ID-01 = OPEN` |

### 1.1 Load-bearing fact about the INT-02B base

`git diff --name-only main 21cf495c…` returns exactly five files:

```
.github/workflows/security-supply-chain.yml
pnpm-lock.yaml
pnpm-workspace.yaml
scripts/security/verify-codeql-default-setup.mjs
scripts/security/verify-codeql-default-setup.test.mjs
```

**#249 touches no `backend/db/**`, no `backend/test/**` and no `p0-db-baseline.yml`.**
Therefore an INT-02B branch stacked on #249 inherits `main`'s database, schema, migration and
DB-workflow state byte-for-byte. Every ID-01 finding below holds identically whether INT-02B is
based on `main` or on the #249 head. This removes the base choice as an ID-01 variable.

---

## 2. ID-01 source lineage (exact)

Established by inspecting diffs and blobs, not commit messages.

| Path | Source commit(s) | Blob at that commit | Blob at #224 head |
|---|---|---|---|
| `backend/db/schema/eli-v5.ts` | `4a1b2c8` (2026-09-12) *original ID-01* → `b66eb82` (2026-09-13) *later, non-ID-01* | `5454a99…` → `1bfc6e4…` | `1bfc6e4a8406f8271dbefdd5e3bedafed35d3f49` |
| `backend/test/id-01-referential-integrity.sql` | `0d04d8d` (2026-09-12) *original* → `7efc903` (2026-09-13) *later, cross-domain* | `4f29565…` → `21f7d60…` | `21f7d60783ae1db81daf94ebab16c489c13a870c` |
| `.github/workflows/p0-db-baseline.yml` | `7569c73` (2026-09-12) *ID-01 step* (+13 unrelated commits) | — | mixed-domain |
| `backend/db/migrations/0013_eli_canonical_identity.sql` | `babadd9` (2026-09-13) *only commit* | `470a581…` | `470a5811a8e0bfef44dc2d09cb158f0ef0c1f7ff` (unchanged since creation) |

`main` blob of `eli-v5.ts` = `cbb7774b31e4801456cbd055b6de8729661e6a3f`.

### 2.1 Does any later commit supersede ID-01 behaviour?

**No.** This was the single most important thing to check, and the answer changes the replay scope.

`b66eb82` ("db: align ELI Drizzle semantics with historical SQL", +51/−36) leaves **all eight
ID-01 columns byte-identical** to `4a1b2c8`. What it actually changes is orthogonal:

- `real` → `doublePrecision` on ~25 metric columns (float4 → float8);
- four `check()` constraints (`slot`, `event_type`, `rsi_trend`, `source`);
- `.desc()` ordering on two indexes.

Those are **historical-SQL parity** concerns belonging to the `p0-db-authority-parity` workstream
(absent from `main`, deferred by #254 to INT-02+). They are not identity.

**Consequence:** the minimal ID-01 replay is the `4a1b2c8` *diff*, **not** the final `#224` blob of
`eli-v5.ts`. Replaying the final blob would silently import schema-parity scope, change generated
DDL beyond identity, and pre-empt a workstream that has not been authorised.

---

## 3. Replay matrix

| # | Path | Main state | #224 state | Provenance | Disposition | Reason / coupling |
|---|---|---|---|---|---|---|
| 1 | `backend/db/schema/eli-v5.ts` | 8 shared identity columns `text`, no FK (blob `cbb7774…`) | `uuid` + FK, **plus** doublePrecision/checks/index-desc (blob `1bfc6e4…`) | `4a1b2c8` | **NARROW PATCH** | Apply only the `4a1b2c8` hunks: 2 imports + 8 columns. Do **not** take the final blob (§2.1). |
| 2 | `backend/test/id-01-referential-integrity.sql` | absent | present, **includes copresence** (blob `21f7d60…`) | `0d04d8d` | **ADD at `0d04d8d` state** (blob `4f29565…`) | The `#224` blob asserts a NO-ACTION FK on `copresence_events` that does not exist on `main` (§6). Adding the final blob makes INT-02B fail for an INT-06 reason. |
| 3 | `.github/workflows/p0-db-baseline.yml` | applies 0001–0004 only; no ID-01 step; filter lacks the ID-01 test | mixed AUTH/Community/Privacy/DATA additions | `7569c73` | **NARROW PATCH** | Take only `7569c73`'s 6 lines: one path filter + one `ID-01 canonical identity and FK checks` step. Never replace the file — 13 other commits in its history are other domains. |
| 4 | *(same file)* baseline debt | 0005 exists but is not applied | candidate uses `find … \| sort` | — | **NARROW PATCH (explicit)** | Add `0005_behavioral_assessment_provenance.sql` explicitly to **both** replay passes (lines ~79 and ~101). Do **not** import `find \| sort` — that would implicitly replay 0006–0015. |
| 5 | `backend/db/migrations/0013_eli_canonical_identity.sql` | absent | present (blob `470a581…`) | `babadd9` | **OPEN GATE — see §4** | Semantically independent of 0006–0012 but its *number* asserts a lineage the target base does not have. |
| 6 | `backend/db/schema/index.ts` | exports `eli-v5.js` already (line 8) | adds professional-sharing / auth-sessions / contact | — | **DO NOT REPLAY** | ID-01 needs no barrel change. The candidate's additions are INT-05 / INT-02A / Contact. |
| 7 | `backend/db/schema/community.ts` (copresence FK) | `uuid` columns, **no FK** | `uuid` + `references(dogs.id)` | `7efc903` | **OPEN GATE / DEFER (§6)** | Genuinely shared dog identity, but bundled with migration 0015 + privacy topology. Ownership unresolved. |
| 8 | `backend/db/migrations/0015_copresence_dog_identity.sql` | absent | present | `7efc903` | **DEFER → INT-06** | Community migration. |
| 9 | `backend/test/copresence-identity-fingerprint.sql` | absent | present | `7efc903` | **DEFER → INT-06** | Parity fingerprint, needs the parity workflow. |
| 10 | `.github/workflows/p0-db-authority-parity.yml` | absent | present | `3160d59`+ | **DEFER → INT-02+** | Already deferred by #254. Would surface the doublePrecision/check divergence of §2.1. |
| 11 | `backend/test/migration-0013-eli-identity-seed.sql` | absent | present | `c927ef1` | **EVIDENCE ONLY / DEFER** | Existing-DB rehearsal fixture; only meaningful if §4 authorises a migration **and** the rehearsal workflow exists. |
| 12 | `backend/test/migration-0013-eli-identity-postcheck.sql` | absent | present | `5518916` | **EVIDENCE ONLY / DEFER** | As above. |
| 13 | `.github/workflows/p0-db-upgrade-rehearsal.yml` | absent | present | `a4bf647`+ | **DEFER → INT-02+** | Requires 0012/0013 + 6 fixtures. |
| 14 | `backend/test/migration-baseline-static.test.mjs` | present | present | — | **EVIDENCE ONLY (no change)** | Already enforces the invariants ID-01 needs (§5.2). No edit required. |
| 15 | `config/privacy/*-lineage.json`, `*-erasure-topology.json` | absent | present | `378ffdd`, `0a7663a`, `7efc903` | **DO NOT REPLAY → INT-04** | Privacy lineage/erasure. "Canonical ELI identity" in the message ≠ ID-01 ownership. |
| 16 | `backend/api/services/subject-discovery.ts` | absent | present | `cc84efe`+ | **DO NOT REPLAY → INT-04** | Subject discovery. |

---

## 4. The migration-number problem — conclusion

### 4.1 What the evidence establishes

**Finding A — 0013 is semantically independent of 0006–0012.** All seven tables it mutates are
created by migrations present on `main`:

| Table | Created by |
|---|---|
| `dog_sub_baselines`, `baseline_drift_monitor`, `walk_quality`, `routine_stability`, `user_config` | `0003_architecture_upgrade.sql` |
| `recovery_events`, `anticipation_events` | `0004_v6_additions.sql` |

Grepping candidate `0006`–`0012` for all seven table names returns **0 references in every file**.
0013's own header states it reconciles TEXT identities created by 0003/0004 — and the DDL agrees.

**Finding B — the ID-01 evidence does not need 0013 at all.** `7569c73` attaches the ID-01 check to
`GENERATED_DATABASE_URL` — the **Drizzle fresh baseline**, not the historical chain. ID-01 evidence
is therefore fresh-baseline evidence.

**Finding C — the historical↔generated comparison on `main` is name-only.**
`diff -u /tmp/tables-a.txt /tmp/tables-generated.txt` compares `tablename` lists. A `text`→`uuid`
column change does not affect it. The workflow that *would* catch the divergence
(`p0-db-authority-parity`, column-level fingerprints) is absent from `main` and deferred.

**Finding D — repository authority says there is no database to preserve.** #70 records
`NO_EXISTING_DB_TO_PRESERVE` and explicitly directs: *"do not modify historical SQL 0001–0004 as if
it were active production migration authority."* #70's own decomposition puts schema correction in
ID-01A and fresh-baseline QA in ID-01B; an existing-database migration is not in either.

**Finding E — the number would assert a false lineage.** `migration-baseline-static.test.mjs`
enforces *"every ALTER TABLE target exists earlier in the draft+historical SQL sequence"* — which a
0013 file would satisfy on `main` — but it performs **no gap detection**. A file numbered 0013 in a
chain ending at 0005 is accepted mechanically while implying six migrations that do not exist. If
INT-05/INT-06 later replay their own 0006–0012, a database that already applied 0013 would receive
lower-numbered migrations afterwards, out of order.

### 4.2 Conclusion: option 3, with option 2 explicitly rejected

**Recommended: defer the existing-database migration; integrate only the Drizzle/fresh-baseline
identity correction.**

This is option 3 in the task framing, and it is what the evidence supports rather than what is
convenient — it is in fact the *more* restrictive choice, since it withholds a migration that is
technically replayable.

- Option 1 (replay 0013 unchanged) — **rejected.** Not because it would fail (Finding A says it
  would run), but because the number asserts a lineage the base does not have (Finding E), and the
  gate it would satisfy does not exist on the base (Findings B, C).
- Option 2 (renumber to `0006_eli_canonical_identity.sql`) — **rejected.** The candidate already
  owns `0006_professional_share_authority.sql`. Two different migrations numbered 0006 across
  sibling slices creates an ordering collision that no current test detects.
- Option 3 (Drizzle/fresh-baseline only) — **recommended**, consistent with Findings B–D and #70.
- Option 4 — recorded as the residual gate below.

### 4.3 What remains OPEN

`G-ID-01-MIGRATION = OPEN`. This manifest does **not** authorise any existing-database migration.
Before one is created, the following must be decided by a human, because repository authority is
currently insufficient:

1. whether the integration sequence numbers focused migrations per-slice or reserves a global
   ordering (this is the root cause, not an ID-01 question);
2. whether `p0-db-upgrade-rehearsal` + the 0013 seed/postcheck fixtures are promoted as the
   evidence contract for existing-database ELI upgrades;
3. whether `NO_EXISTING_DB_TO_PRESERVE` still holds at the time the migration is written.

Deferring costs nothing today: with no database to preserve, the generated baseline is the
authority, and it is corrected by item 1 of §3.

---

## 5. Fresh-baseline scope (ID-01A)

Derived from the `4a1b2c8` diff.

### 5.1 Explicit answers

- **Columns `text` → `uuid` (8):** `dog_sub_baselines.dog_id`, `recovery_events.dog_id`,
  `anticipation_events.dog_id`, `baseline_drift_monitor.dog_id`, `walk_quality.dog_id`,
  `routine_stability.dog_id`, `user_config.dog_id`, `user_config.user_id`.
- **References `dogs.id` (7):** all of the above except `user_config.user_id`.
- **References `users.id` (1):** `user_config.user_id`.
- **Cascade semantics added:** **none.** Every reference is a bare `.references(() => …)` —
  Drizzle default, i.e. `NO ACTION`. No `onDelete`/`onUpdate` anywhere. Erasure policy stays with
  PRIV-01 (#69) exactly as #70 requires.
- **Primary keys changed:** **none.** `baseline_drift_monitor.dogId` was already the PK and remains
  so — only its type changes. Composite PKs (`dog_sub_baselines`, `routine_stability`,
  `user_config`) are preserved. `serial` event PKs on `recovery_events`, `anticipation_events`,
  `walk_quality` are untouched, per #70's ID-01D instruction not to convert internal event IDs.
- **Unrelated ELI tables altered:** **none** by `4a1b2c8`. (The later `b66eb82` does alter unrelated
  columns — which is precisely why it is excluded, §2.1.)
- **Circular import risk:** `eli-v5.ts` gains `import { dogs } from './dogs.js'` and
  `import { users } from './users.js'`. Neither `dogs.ts` nor `users.ts` imports `eli-v5.ts`, so
  the graph stays acyclic. The barrel already exports all three. **To be re-proven by typecheck on
  the actual head, not assumed.**
- **Does generated Drizzle SQL express the constraints?** **UNVERIFIED — must be proven in CI.**
  Asserting it here without running `drizzle-kit generate` would be fabrication. The ID-01 test
  (§6) is what proves it, which is why it must be added in the same slice.

### 5.2 No scientific/ELI semantic change

No metric, threshold, window, slot vocabulary or behavioural field is touched by `4a1b2c8`. This
manifest makes **no** claim about ELI scientific validity.

---

## 6. Referential-integrity evidence — what it proves and does not

Against the `0d04d8d` blob (`4f29565…`), which is the state INT-02B should adopt.

### 6.1 Proven

| Assertion | Mechanism |
|---|---|
| 7 ELI `dog_id` columns are `uuid` in the generated baseline | `information_schema.columns` loop |
| `user_config.user_id` is `uuid` | `information_schema.columns` |
| Every ELI `dog_id` has a FK to `dogs.id` | `pg_constraint` join, per table |
| `user_config.user_id` has a FK to `users.id` | `pg_constraint` |
| Nonexistent dog rejected | `INSERT dog_sub_baselines` expecting `foreign_key_violation` |
| Nonexistent user rejected **while the dog exists** | `INSERT user_config` expecting `foreign_key_violation` |
| Canonical valid pair accepted | positive `INSERT` into both tables |
| No side effects | whole file wrapped `BEGIN; … ROLLBACK;` |

### 6.2 NOT proven — explicit

- **Delete/restrict behaviour is not tested at the `0d04d8d` state.** The delete-blocking assertion
  exists only in the `7efc903` copresence block, which INT-02B excludes. So #70's ID-01C bullet
  *"deleting/restricting a dog cannot leave silent orphan ELI rows"* is **NOT** covered by this
  slice. Recorded as a gap, not quietly inherited.
- Not proven: API authorization; export privacy; erasure policy; cross-dog data retrieval
  (#70's "Dog A UUID cannot retrieve Dog B ELI data through API/export paths" is an INT-04 concern);
  scientific validity; production migration safety; that an **existing** database can be upgraded.
- FK integrity is a database constraint proof only. It is not an authorization proof.

---

## 7. Cross-domain exclusion audit

Twenty-two candidate commits in `main..#224` mention identity. Only three are ID-01.

| Domain | Commits | Owner | Verdict |
|---|---|---|---|
| **ID-01 core** | `4a1b2c8`, `0d04d8d`, `babadd9` | INT-02B / #70 | in scope (`babadd9` gated by §4) |
| Guardian professional sharing | `cc3f75c`, `37f07e7`, `75dbae2`, `07bd11c`, `9820cb0`, `b790369`, `39ed693`, `20c8c49` | **INT-05** | excluded |
| Privacy lineage / erasure topology | `1da0538`, `2acbc0a`, `378ffdd`, `0a7663a`, `1641105`, `dbe7524` | **INT-04** | excluded |
| Community copresence identity | `7efc903` | **INT-06** | excluded (§6, gate below) |
| Subject discovery | `cc84efe`, `ce57ed7` | **INT-04** | excluded |
| Device/firmware retry identity | `87275f7` | **INT-03 / Device Trust #66** | excluded |
| Mobile dog identity | `0e36fc9` | **INT-09** | excluded |
| ELI upgrade rehearsal | `c927ef1`, `5518916`, `f85e844` | INT-02+ | deferred with §4 |
| AUTH/session identity | `b2af634`, `54f0af7`, `4fe75b4` | **INT-02A / #250 / #75** | excluded — not this slice |

All exclusion-domain files verified **absent from `main`**: `subject-discovery.ts`,
`config/privacy/dog-subject-lineage.json`, `config/privacy/dog-erasure-topology.json`,
`professional-sharing.ts`, `auth-sessions.ts`, `contact.ts`, `0015_copresence_dog_identity.sql`,
`copresence-identity-fingerprint.sql`, `p0-db-authority-parity.yml`.

### 7.1 Copresence — genuine open question, not a silent exclusion

`copresence_events.dog_a_id` / `dog_b_id` **are** shared dog identity, which is #70's stated
domain. On `main` they are already `uuid` but carry **no FK** to `dogs`. The candidate adds the FK
in `community.ts` — bundled with migration 0015, a parity fingerprint and two privacy topology
configs.

So this is not "not ID-01"; it is "ID-01-shaped work that the candidate entangled with INT-06 and
INT-04." `G-ID-01-COPRESENCE = OPEN`: a human should decide whether INT-02B takes the
`community.ts` FK alone (small, in ID-01's domain) or INT-06 takes the whole bundle. This manifest
does not decide it, and INT-02B as scoped below does **not** include it.

---

## 8. Minimal future INT-02B file boundary

If and when a runtime INT-02B branch is authorised — **not created by this record** — it should be
bounded to:

```
backend/db/schema/eli-v5.ts                        NARROW PATCH (4a1b2c8 hunks only)
backend/test/id-01-referential-integrity.sql       ADD (0d04d8d blob 4f29565…)
.github/workflows/p0-db-baseline.yml               NARROW PATCH (7569c73 6 lines + explicit 0005)
```

Three files. No migration, no barrel change, no runtime service, no privacy config, no community
schema, no AUTH file.

### 8.1 Coordination with INT-02A

The only overlap with INT-02A is `.github/workflows/p0-db-baseline.yml`: INT-02A adds AUTH steps
and path filters, INT-02B adds the ID-01 step and filter. These are **different hunks in different
regions** (INT-02A around the AUTH integration steps; INT-02B at the path-filter list and
immediately after `drizzle-kit migrate`). A textual conflict is possible but semantically trivial —
both are additive. Whichever slice lands second should re-apply its own hunk rather than take the
other's file wholesale. INT-02B claims no ownership of that file.

---

## 9. CI / evidence requirements for a future INT-02B head

`backend/db/**` is already in the `p0-db-baseline` path filter on `main`, so editing
`eli-v5.ts` triggers the workflow. The ID-01 test file is **not** in the filter — which is exactly
what the `7569c73` narrow patch adds.

Required fresh on the INT-02B head:

1. `Repository-only migration checks` — static test green (table-name coverage, ALTER-target ordering, draft/active separation);
2. historical replay incl. **0005** green on both disposable databases;
3. repeatability — table inventory and full schema dump diffs clean;
4. `drizzle-kit generate` succeeds; ledger check passes; second generation produces no new migration;
5. generated baseline applies via `drizzle-kit migrate`;
6. **`ID-01 canonical identity and FK checks` green** — the load-bearing new evidence;
7. generated table inventory diff vs historical clean;
8. backend typecheck + tests green (also the real proof of §5.1's import-cycle claim);
9. INT-01 security controls still green on the composed head.

A green disposable PostgreSQL run is evidence about that candidate head only. It is **not**
production migration authority.

---

## 10. Non-claims

This record does not claim, and must not be cited as claiming:

1. that any ID-01 change has been implemented, replayed or tested — nothing was;
2. that an existing database can be upgraded safely — §4 explicitly withholds that;
3. production migration, production auth, or production security authority;
4. any scientific or ELI validity claim — §5.2;
5. any physical MAT/TAG validity claim;
6. release readiness or merge authority for #224, #249, #254 or any future INT-02B branch;
7. that the generated Drizzle DDL expresses the intended constraints — §5.1 marks that UNVERIFIED
   pending CI;
8. that `G-ID-01` can close on this slice alone — delete/restrict coverage and the export/erasure
   reconciliation in #70 remain outside it (§6.2).

Candidate evidence is not production authority. Green CI is evidence about the tested head only.

---

## 11. Open gates

| Gate | State | Blocker |
|---|---|---|
| `G-ID-01` | OPEN | #70 closure needs delete/restrict + export/erasure reconciliation beyond this slice |
| `G-ID-01-MIGRATION` | **OPEN** | §4.3 — slice-wise migration numbering authority is undecided |
| `G-ID-01-COPRESENCE` | **OPEN** | §7.1 — INT-02B vs INT-06 ownership of the copresence FK |
| ID-01C delete/restrict evidence | **OPEN** | §6.2 — not covered at the `0d04d8d` state |
| Generated-DDL constraint expression | **UNVERIFIED** | §5.1 — provable only by running CI |
| Historical↔generated column parity | DEFERRED | `p0-db-authority-parity.yml` absent from `main`; would surface §2.1 divergence |

---

*Controlled record — EMOPET integration control plane. Documentation only.*
*Created 2026-09-16 under #246 / #250 / #70. Base: `main` @ `51bfdde…`. Source: #224 @ `7e0d9044…`.*

---

## 12. Gate-resolution pass — 2026-09-16 (second forensic pass)

Sections 1–11 record the first pass and are **not** rewritten. This section resolves or narrows the
gates they left open, and records what changed in the world since (PR #255 now exists).

### 12.0 State rechecked at the start of this pass

| Ref | SHA | State |
|---|---|---|
| `main` | `51bfdde694903c7f0e4b759ae8914c1d18f15810` | unchanged |
| #224 frozen | `7e0d90445a3cf03b094d7037aa6addbfa6f2cc19` | unchanged |
| #249 INT-01 | `21cf495c517a292bea072fde7b8ea4e6d558ac00` | OPEN / DRAFT |
| **#255 INT-02A AUTH (new)** | `4eab7fbcd85a353fd2c71123bae33ac73a29f8e1` | OPEN / DRAFT, based on **#249 branch**, 13 files |
| #256 INT-02B (this record) | `77945b01fa34926bb39269620f90706b7c2c10e7` | OPEN / DRAFT |

---

### 12.1 `G-ID-01-COPRESENCE` → **RESOLVED: owned by INT-06**, with a recorded G-ID-01 closure dependency

**A1 — what #70 actually requires.** #70's implementation wording is narrower than its closure
wording, and the distinction is decisive:

- *Authority decision candidate*: "**ELI tables** that represent the same Guardian or dog must use
  the same UUID type and FK…". `copresence_events` is **not an ELI table** — it lives in
  `backend/db/schema/community.ts`.
- *ID-01A* is explicitly file-scoped: "import `uuid` in **`eli-v5.ts`**; reference `dogs.id` for
  every **ELI** `dog_id`; reference `users.id` for `user_config.user_id`". It names no other file.
- *Closure gate* is broader: "Close only when **canonical shared entity identity is enforced** in
  the active source/fresh baseline…". Copresence dog identity plausibly falls inside that.

So #70 does **not** put copresence inside ID-01A implementation, but its closure gate does depend
on it. Those are different things, and the first pass conflated them.

**A2 — separability (exact lines, `7efc903`).** The `community.ts` change is **three substantive
lines**:

```
+import { dogs } from './dogs.js';
-  dogAId: uuid('dog_a_id').notNull(),
-  dogBId: uuid('dog_b_id').notNull(),
+  dogAId: uuid('dog_a_id').notNull().references(() => dogs.id),
+  dogBId: uuid('dog_b_id').notNull().references(() => dogs.id),
```

It is **cleanly separable** from Community behaviour, migration `0015`, the parity fingerprint and
the privacy topology configs — all of which are separate files in the same commit. Nothing in
`community.ts` couples them.

**A3 — is it "purely relational authority"? No, and this correction matters.** The first pass
implied the FK is inert. It is not: adding it changes `DELETE FROM dogs` for a referenced dog from
*succeeds, leaving dangling UUIDs* to *fails with `foreign_key_violation`* (NO ACTION, §12.2). The
candidate's own test comment says so — "preserve NO ACTION **while erasure/location lifecycle
policy remains unresolved**".

- Community query semantics: unchanged.
- Community runtime logic: unchanged — no behavioural file is touched.
- **Deletion semantics: changed**, deliberately, and it interacts with PRIV-01 (#69).

**Symmetry that settles the argument:** the same deletion consequence applies to the seven ELI FKs
INT-02B already proposes. If that consequence is acceptable for `dog_sub_baselines`, it cannot be
the reason to exclude `copresence_events`. Exclusion rests on **ownership**, not on risk.

**A4 — decomposition boundaries.** #246 assigns INT-06 "Community durable core — membership/rules
authority; **bounded feed and persistence**; transactional authorization; disclosure projection and
location withholding". `copresence_events` is Community persistence. #246 gives INT-02 no Community
file. Taking the hunks into INT-02B would cross a documented boundary to save three lines.

**A5 — disposition: `RESOLVE → INT-06`.**

| Level | Evidence | Points to |
|---|---|---|
| 1 — explicit authority | #70 ID-01A is `eli-v5.ts`-scoped; "ELI tables"; #246 gives Community to INT-06 | INT-06 |
| 2 — code behaviour | schema-only, 3 lines, no Community runtime coupling | either (separability is not ownership) |
| 3 — provenance | candidate bundled it with Community + Privacy | INT-06 |

Levels 1–3 agree. **The change belongs to INT-06.** INT-02B does not take it.

**Recorded consequence:** `G-ID-01` cannot close on INT-02B alone — it now carries an explicit
dependency on INT-06 delivering these three lines. Tracked as sub-gate **E5** in §12.5. INT-06
should know the change is three lines plus its own migration/parity/privacy decisions.

---

### 12.2 ID-01C delete/restrict → **RESOLVED: IMPLEMENTATION NOT REQUIRED / TEST EVIDENCE REQUIRED**

**B1 — what does bare `.references()` generate? Proven inside this repository, not assumed.**

Direct empirical evidence, not framework memory:

- `7efc903` added to `id-01-referential-integrity.sql` an assertion requiring
  `c.confdeltype = 'a'` (PostgreSQL `NO ACTION`) on the `copresence_events → dogs` FKs;
- those FKs are declared with bare `.references(() => dogs.id)` — no `onDelete`;
- that file runs against `GENERATED_DATABASE_URL`, i.e. the **Drizzle-generated** baseline applied
  in the immediately preceding step;
- on candidate head `7e0d9044…`, P0 DB baseline run **`34870082023`**, job `104063518297`:
  step 22 `Apply generated Drizzle baseline with migrate` **success**, step 23
  `ID-01 canonical identity and FK checks` **success**.

So a bare Drizzle `.references()` demonstrably produces `confdeltype = 'a'` in this project's
generated DDL. Corroborating convention: hand-written `0000_core_baseline.sql` declares
`owner_id UUID NOT NULL REFERENCES users(id)` with no `ON DELETE`, and candidate `0013` adds its
FKs with no `ON DELETE` either.

**B2 — schema change required? No.** `NO ACTION` already blocks deleting a referenced parent row.
That is exactly the restrictive behaviour #70's ID-01C asks for. Adding explicit `onDelete` would
be a *policy* change belonging to PRIV-01 #69, not an ID-01 correction — and §5.1 deliberately
records that no cascade semantics are added.

**B3 — smallest future test delta.** The conceptual shape in the task brief is right, and it is
purely additive to the file INT-02B already plans to add. No implementation, no schema edit.

**B4 — coverage: two different proofs, two different scopes.**

| Proof | Scope needed | Cost |
|---|---|---|
| **Definition** — FK carries the expected action | **all 8** FKs | one extra predicate (`AND c.confdeltype = 'a'`) inside the existing `FOREACH` loop that already checks FK existence |
| **Behaviour** — an actual `DELETE` is refused | **one representative** table is sufficient | one `DO $$ … EXCEPTION WHEN foreign_key_violation` block, plus a post-delete existence assertion |

Exercising a real `DELETE` against all seven adds no information once the definition check covers
all eight: the behaviour follows from the action, and the action is asserted per-FK. One
representative behavioural case guards against the action being right while the constraint is
somehow not enforced.

**B5 — disposition.** `ID-01C = IMPLEMENTATION NOT REQUIRED / TEST EVIDENCE REQUIRED`. It does not
block the three-file boundary in §8; it refines what the added test file should contain. The §6.2
gap is therefore **closable within INT-02B** — a correction to the first pass, which recorded it as
simply "not covered".

**Still not proven by any of this** (unchanged from §6.2): API authorization, export privacy,
erasure *policy*, cross-dog retrieval, scientific validity, existing-database upgrade safety.

---

### 12.3 `G-ID-01-MIGRATION` → **NARROWED to one small decision; AUTH precedent proven unavailable**

**C1 — existing authority found.** `docs/control/P0_DB_AUTHORITY_DECISION_NO_EXISTING_DB.md`
(recorded 2026-08-29) states `NO_EXISTING_DB_TO_PRESERVE`,
`FRESH_DB_PATH = AUTHORIZED_FOR_CONTROLLED_BASELINE_PREPARATION` and — decisively —
**`ACTIVE_DRIZZLE_MIGRATION_BASELINE = OPEN`**. The active ledger does not yet exist, so there is no
settled sequence for a focused slice to slot into.

`backend/db/baseline-draft/README.md` supplies the **promotion-gate model**: preparation artifacts
live *outside* `backend/db/migrations/` and are promoted only once a gate is satisfied; the static
test enforces the separation. #250 applies the same rule to AUTH: `0000c_auth_sessions.sql` is
`NON-EXECUTABLE DRAFT / NOT AN ACTIVE MIGRATION` and "must not be silently promoted".

No explicit *numbering* policy exists anywhere on `main`. The only related string is a comment in
`0000_core_baseline.sql`: "It does not modify, delete, or **renumber** historical migrations."

**C2 — are candidate numbers reserved slots, or chronology?** Chronology.

| Migration | Domain owner |
|---|---|
| 0006, 0009 | Guardian professional sharing → INT-05 |
| 0007, 0008, 0011, **0015** | Community → INT-06 |
| 0010 | Contact authority |
| 0012 | Sensor/device provenance → INT-03 |
| **0013** | ELI canonical identity → **INT-02B** |
| 0014 | Dataset writer authority → INT-07 |

Consecutive numbers belong to different slices, and the ID-01 number (0013) sits *after* five other
domains. Since INT-02 precedes INT-05/06/07 in #246's dependency order, preserving candidate
numbering would promote slices in an order contradicting their numbers. The numbering is accidental
candidate chronology, not reserved allocation.

**C3/C4 — and the finding that closes off the obvious answer.** The natural move is to copy the
AUTH precedent: park ID-01's delta in `baseline-draft/` as a non-executable draft and number it at
promotion. **That does not work, and the repository proves it.**

`migration-baseline-static.test.mjs` `orderedSqlSources()` concatenates **all draft files before all
migration files**, irrespective of number. Its second test requires every `ALTER TABLE` target to
have been created earlier in that order. Verified: **none** of the seven ID-01 tables is created in
`0000_core_baseline.sql` — all are created by `0003`/`0004`. An `ALTER`-based ID-01 draft artifact
would therefore produce seven `ALTER TABLE … before CREATE TABLE` violations.

AUTH's `0000c_auth_sessions.sql` escapes this only because it is **CREATE-only** (0 `ALTER`
statements, verified on #255's head). **The AUTH precedent is structurally unavailable to ID-01.**

**C5 — narrowest recommendation.** Keep the migration deferred, preserve semantics and provenance,
and allocate an active number only at promotion. Concretely, the remaining human decision is now
just two options:

| Option | Consequence |
|---|---|
| **(a) Provenance-only until the ledger closes** *(recommended)* | The delta stays identified by `#224` commit `babadd9` / blob `470a581…`; no repository artifact, no new convention, no static-test conflict. Costs nothing today: `NO_EXISTING_DB_TO_PRESERVE` means nothing needs upgrading, and the fresh baseline is corrected by §3 item 1. |
| **(b) Authorize a new draft directory** (e.g. `backend/db/pending-upgrades/`) outside both `migrations/` and `baseline-draft/` | Would hold ALTER-based deltas without tripping the ordering rule — but **creates a convention that does not exist**. That is project authority I do not have; it needs an explicit human decision and a static-test update. |

`G-ID-01-MIGRATION` is therefore no longer an open research question. It is a binary choice between
(a) and (b), with (a) requiring no new authority. Option 1 from the first pass (replay `0013`
unchanged) and option 2 (renumber to 0006, colliding with `0006_professional_share_authority.sql`)
remain rejected for the reasons in §4.2.

---

### 12.4 PR #255 compatibility — read-only check (§8.1 made precise)

Verified against #255 head `4eab7fbc…`; **#255 was not modified.**

| Check | Result |
|---|---|
| #255 boundary | 13 files, exactly as its description states; no ELI schema, no `id-01-referential-integrity.sql`, no active migration |
| **0005 in both historical passes** | **YES** — lines 85 and 108 of its `p0-db-baseline.yml` |
| Broad `find … \| sort` imported? | **No** — explicit per-file list preserved, as §3 item 4 required |
| ID-01 insertion point consumed? | **No.** `drizzle-kit migrate` (line 149) is still immediately followed by `Verify generated table inventory` (line 151). `7569c73` inserts the ID-01 step precisely into that gap. #255's AUTH step sits *after* the inventory check (line 158). |
| ID-01 path filter additive? | **Yes** — #255 added AUTH paths; `backend/test/id-01-referential-integrity.sql` is absent, so the one-line filter addition remains purely additive. `backend/db/**` is still present, so `eli-v5.ts` still triggers the workflow. |
| AUTH schema/runtime change needed for ID-01? | **No.** #255 touches `schema/index.ts` only to add one AUTH export; ID-01 needs no barrel change (the barrel already exports `eli-v5`). No AUTH file appears in ID-01's three-file boundary. |
| New dependency needed? | **No.** #255 changes no `package.json` and no lockfile; ID-01 adds none. |

**Consequence for §3 item 4:** if INT-02B is later based on **#255** (or on a state that carries it),
the explicit-`0005` repair is **already done** and INT-02B must not duplicate it. If INT-02B is
based on `main` or on **#249**, the repair is still required — #249 does not touch that workflow
(§1.1). This is now a base-dependent instruction rather than an unconditional one.

**Residual coordination risk: textual only.** Both slices edit the path-filter list and add a step
to the same job. Git may report a conflict; the resolution is always "keep both additions". Neither
slice should take the other's file wholesale.

---

### 12.5 `G-ID-01` decomposed into independently closable sub-gates

The first pass treated `G-ID-01` as one gate. It is not — and several of its closure requirements
are not database work at all.

| Sub-gate | Requirement | Evidence state | Owner | Closable by INT-02B? |
|---|---|---|---|---|
| **E1 — ID-01A** canonical types/FKs in active source | 8 columns → `uuid` + FK | replay identified exactly (`4a1b2c8`); not yet applied | **INT-02B** | **Yes** |
| **E2 — ID-01B** generated-baseline evidence | Drizzle generate/apply/stability + typecheck/tests green | workflow already exists on `main`; triggers on `backend/db/**` | **INT-02B** | **Yes**, on fresh CI |
| **E3 — ID-01C** delete/restrict | `NO ACTION` proven generated (§12.2); needs assertion + one behavioural case | **no implementation required** | **INT-02B** | **Yes** (§12.2) |
| **E4 — existing-database migration** | upgrade path for a live DB | deferred; `NO_EXISTING_DB_TO_PRESERVE`; `ACTIVE_DRIZZLE_MIGRATION_BASELINE = OPEN` | **human decision** (§12.3) | **No** — and not required while no DB exists |
| **E5 — copresence canonical dog identity** | 2 FKs on `copresence_events` | 3-line change identified; owned elsewhere | **INT-06** | **No** (§12.1) |
| **E6 — API/export cross-dog authorization** | "Dog A UUID cannot retrieve Dog B ELI data through API/export paths" | not started | **INT-04** (export/privacy) | **No — not database work** |
| **E7 — Privacy/erasure interaction** | erasure/deletion policy reconciliation | not started; PRIV-01 #69 | **INT-04 / #69** | **No** |
| **E8 — ID-01D** observation/provenance identity | do *not* convert serial event PKs without need | #70 already answers: no conversion | — | Already settled by #70 |
| **E9 — ID-01E** device principal identity | DB row UUID ≠ hardware identity | out of scope by #70 | **Device Trust #66** | **No** |

**Conclusion on #70's status.** E6, E7 and E9 are explicitly cross-domain: they are authorization,
privacy-policy and hardware-identity concerns that happen to be *listed* in #70 because #70 is the
identity umbrella. Database FK integrity cannot close them, and §6.2 already refuses to conflate
them.

**Recommendation: #70 should remain OPEN as an umbrella even after a successful INT-02B slice**, and
should record E1–E3 closing while E4–E7 and E9 remain with their real owners. A focused INT-02B PR
should therefore claim *"closes ID-01A/B/C"*, never *"closes #70"*.

---

### 12.6 Net effect on the first pass

| First-pass item | Status after this pass |
|---|---|
| `G-ID-01-COPRESENCE = OPEN` | **Resolved** → INT-06 owns it; recorded as G-ID-01 closure dependency E5 |
| ID-01C "not covered" | **Resolved** → implementation not required; test-evidence delta specified; closable in INT-02B |
| `G-ID-01-MIGRATION = OPEN` | **Narrowed** → binary choice (a)/(b); AUTH draft precedent proven unavailable; (a) needs no new authority |
| §8.1 coordination "possible conflict" | **Made precise** against #255's real head; insertion point confirmed unconsumed |
| §3 item 4 (explicit 0005) | **Now base-dependent** — already done by #255; still required on `main`/#249 |
| `G-ID-01` single gate | **Decomposed** into E1–E9 with owners |
| §5.1 generated-DDL "UNVERIFIED" | **Partially resolved** — FK *action* now proven (§12.2); full constraint expression still awaits fresh CI on an INT-02B head |

Nothing in §§1–11 was rewritten. Two first-pass statements are corrected rather than edited in
place: the copresence FK is **not** behaviourally inert (§12.1 A3), and the ID-01C gap is **not**
an implementation gap (§12.2).

### 12.7 Non-claims for this pass

This pass performed no implementation, created no migration, modified no workflow, schema,
dependency or runtime file, and did not modify #249, #254 or #255. It establishes no production
migration, security, scientific, physical or release authority. The `NO ACTION` finding in §12.2 is
evidence about this repository's generated DDL on the candidate head — it is not a claim that any
deletion *policy* has been decided; that remains PRIV-01 #69.

---

### 12.8 `G-ID-01-MIGRATION` relocated to repository-wide gate #258 — 2026-09-16

Recorded after §12.3 was written. §12.3 is left intact; this subsection supersedes its *status*, not
its analysis.

**What changed.** The project owner opened **#258 — "P0 DB: define active migration ledger authority
for integration slices"**, `G-DB-MIGRATION-LEDGER = OPEN`, and stated on #256 that the migration
numbering question moves there. Verified directly against issue #258, not from the comment alone.

**Disposition.** `G-ID-01-MIGRATION` is **no longer an INT-02B gate**. It is subsumed by
`G-DB-MIGRATION-LEDGER` (#258), which correctly scopes it as an integration-ledger authority problem
rather than an ID-01 implementation defect. #258's *Trigger* section adopts the four §12.3 findings
verbatim as its evidence base: 0013's independence from 0006–0012, its 0003/0004 table lineage, the
false-lineage problem, the 0006 collision, and the structural unavailability of the `0000c` draft
precedent.

**Interim rule now binding on INT-02B** (quoted from #258, *Interim rule while OPEN*):

- do not replay `0013_eli_canonical_identity.sql` unchanged onto a chain ending at `0005`;
- do not opportunistically renumber it to `0006`;
- **do not invent a new ALTER-draft convention inside INT-02B**;
- preserve its SQL/provenance as evidence only;
- future DB slices must explicitly identify whether they introduce an active migration or only
  fresh-baseline schema authority.

**Effect on §12.3's two options.** Option **(a)** (provenance-only until the ledger closes) is now
the binding interim rule. Option **(b)** (a new draft directory for ALTER deltas) is **explicitly
prohibited inside INT-02B** and relocated to #258 *Decision 3*, where it belongs — a repository-wide
convention was never INT-02B's to create. The §12.3 recommendation therefore stands, but it is no
longer presented here as an open choice awaiting a decision.

**Effect on the replay matrix.** §3 row 5 (`0013_eli_canonical_identity.sql`) changes disposition
from `OPEN GATE` to **`EVIDENCE ONLY — provenance preserved, blocked by #258`**. The blob
(`470a5811a8e0bfef44dc2d09cb158f0ef0c1f7ff`, commit `babadd9`) remains the provenance record, which
satisfies #258 *Decision 2*'s requirement that provenance survive any later renumbering.

**Effect on §12.5.** Sub-gate **E4** (existing-database migration) keeps its owner as a human
decision, now precisely located: **#258**, not INT-02B and not #70.

**Unchanged.** No file in `backend/db/` is touched by this record; nothing is replayed, renumbered
or promoted. The §8 three-file boundary is unaffected — it never contained a migration.
