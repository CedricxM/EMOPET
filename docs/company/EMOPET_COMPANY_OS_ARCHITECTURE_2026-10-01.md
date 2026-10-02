# EMOPET — Company Operating System Architecture

**Date:** 2026-10-01  
**Status:** `PROPOSED COMPANY CONTROL PLANE / DOES NOT REPLACE DOMAIN AUTHORITIES`  
**Branch base:** `main@cdec93af57bdf49429598fbe0c20f28ffef9a6c0`

## 1. Purpose

EMOPET already uses GitHub as its canonical index, chronology, decision, strategy, scientific-framework and evidence-memory layer. This document adds the missing company-level control plane.

The goal is not to create one giant document that pretends to know everything. The goal is to make the repository able to answer, quickly and auditably:

- What is true now?
- Which source controls that truth?
- What is proven, open, blocked, proposed or superseded?
- What are the next gates?
- Which evidence would change the decision?
- Which work is consuming time or capital, and which milestone is it buying?
- What was true at an earlier date?

## 2. Non-authority rule

The Company OS is an **index and projection layer**.

It MUST NOT silently replace:

- founder strategy authorities;
- product/Care authorities;
- scientific authorities;
- brand authorities;
- legal or privacy sign-off;
- hardware engineering evidence;
- supplier-native evidence;
- executed contracts;
- original email evidence.

If a Company OS field conflicts with its cited controlling source, the controlling source wins and the projection must be corrected.

## 3. Three layers

### STATE

A compact machine-readable projection of the current company state.

Initial source:

- `state/company-state.json`

Human view:

- `STATE.md`

### EVIDENCE

The material that supports or falsifies a state.

Evidence can live in GitHub or outside GitHub. For restricted/external evidence, GitHub stores only the minimum necessary metadata: identifier, date, status, source system, hash when appropriate, confidentiality and related decision/gate.

### HISTORY

Append-only or supersession-preserving records explaining how the state changed.

Existing examples include:

- `docs/records/memory/`
- `docs/records/communications/`
- `docs/records/attachments/`
- Git commits, issues and pull requests.

## 4. Source-of-truth hierarchy

1. **Controlled domain authority** for the question being asked.
2. **Current machine-readable Company OS projection** pointing to that authority.
3. **Current operational evidence** such as merged code, tests, bench evidence or signed status.
4. **Dated audits and memory records**.
5. **Historical/superseded material**.

Detailed implementation does not outrank a controlled decision. A detailed document does not outrank physical evidence. A supplier discussion does not equal a supplier commitment. A green synthetic test does not equal animal or bench validation.

## 5. Company object model

Every company-level object should eventually have a stable ID and a small common envelope:

```json
{
  "id": "EMO-...",
  "domain": "product|hardware|science|software|market|finance|corporate|legal|industrial|funding",
  "status": "evidence-supported status",
  "owner": "named role or OPEN",
  "authority_refs": ["repository path or issue"],
  "evidence_refs": ["repository/external evidence reference"],
  "updated_at": "YYYY-MM-DD",
  "confidentiality": "PUBLIC|INTERNAL|RESTRICTED",
  "next_gate": "what must become true next"
}
```

No object should become more certain merely because it is machine-readable.

### Freshness overlay

Freshness is **orthogonal to substantive status**. A state can be technically implemented yet stale, or still open yet freshly reviewed.

The Company OS freshness layer uses:

- `UNREVIEWED` when a controlled domain review date or cadence is absent;
- `CURRENT` only when a controlled review event and cadence establish that review is not yet due;
- `REVIEW_DUE` when the review date has arrived but the hard stale boundary has not;
- `STALE` when the hard stale boundary has arrived;
- `NOT_APPLICABLE` only where review freshness genuinely does not apply.

Git activity, document edit time and file naming do not reset domain freshness. Missing cadence stays missing; the Company OS must not invent review intervals.

### Registry contracts and dependency validation

Every V1 machine-readable registry has an explicit JSON Schema contract indexed by `state/schemas/registry-schema-map.json`.

The every-PR Company OS guard validates those registry files against their declared schemas and validates semantic cross-object dependencies, including:

- milestone gate → experiment ID resolution and stage consistency;
- finance planning scenario → fundraising object resolution;
- finance/fundraising currency, target and runway consistency;
- internal `state/` references resolving only to registered Company OS state surfaces;
- fundraising use-of-funds fractions remaining internally coherent.

Schema conformance does not make a claim true. It only prevents malformed or dangling projections from masquerading as controlled state.

### Generated human views

`STATE.md`, `CORPORATE.md`, `FRESHNESS.md`, `FOUNDER_COCKPIT.md`, `INVESTOR_VIEW.md`, `SUPPLIER_VIEW.md`, and `TIME_MACHINE.md` are deterministic renderings of machine-readable Company OS state through `scripts/control/generate-company-os-views.mjs`.

The every-PR Company OS guard compares committed bytes against fresh renders. A manual edit that is not backed by machine-readable state therefore fails closed instead of silently creating a second source of truth.

Generation changes presentation only. It does not promote substantive status, reset freshness, create evidence, or override a controlled domain authority.

### Founder cockpit boundary

`FOUNDER_COCKPIT.md` is a public-safe derived navigation view. It may aggregate the current stage gate, experiments, freshness blocks, unknowns, risks, metrics, public-safe finance statuses and Corporate/IP gates, but it MUST NOT:

- create a founder decision that does not exist in a controlled source;
- assign a synthetic priority score, risk score or probability;
- convert source order into a ranking;
- expose restricted legal, personal, supplier, banking or investor material;
- convert a planning scenario into approved financing or committed capital;
- treat recent repository activity as fresh domain evidence.

Its job is to shorten navigation from "what needs attention?" to the controlling source, not to replace that source.

### Audience-redacted external views

`INVESTOR_VIEW.md` and `SUPPLIER_VIEW.md` are generated public-safe audience projections, not separate sources of truth.

The investor view may expose stage, gate, metric-status, finance-status, Corporate/IP status and freshness context, but it MUST NOT expose or infer private cash detail, valuation, dilution target, investor identity/correspondence, private financing terms or committed capital beyond what a controlled public-safe state explicitly authorizes.

The supplier view may expose physical-proof gates, experiment status, economics-field status, rights/provenance status and freshness context, but it MUST NOT expose supplier identities, private quotes, payment terms, confidential manufacturing packages, executed contracts or procurement/release authority.

Both views fail closed: missing data remains missing, planning remains planning, and repository activity never promotes evidence or freshness.

## 6. Core company surfaces

| Surface | Purpose | Authority behavior |
|---|---|---|
| `COMPANY.md` | Front door to EMOPET as a company | Navigation only |
| `STATE.md` | Generated human-readable current snapshot | Projection, not domain authority |
| `state/company-state.json` | Machine-readable current snapshot | Projection with authority/evidence refs |
| `MILESTONES.md` | Stage gates and proof sequence | V1 projection/index |
| `METRICS.md` | Evidence/traction/quality metrics | V1 projection/index |
| `RISKS.md` | Company risk register and kill gates | V1 projection/index |
| `FINANCE_STATE.md` | Unit economics, runway, funding state | V1 public-safe projection; no invented values |
| `CORPORATE.md` | Generated public-safe entity, governance, IP and rights state | V2 projection/index; restricted evidence stays external |
| `FRESHNESS.md` | Generated review cadence, CURRENT/REVIEW_DUE/STALE view | V2 projection/index; never substitutes for domain review |
| `FOUNDER_COCKPIT.md` | Generated public-safe founder navigation cockpit | V2 derived view; not decision or ranking authority |
| `INVESTOR_VIEW.md` | Generated redacted public-safe investor orientation | V2 derived view; not fundraising, valuation or investment authority |
| `SUPPLIER_VIEW.md` | Generated redacted public-safe supplier orientation | V2 derived view; not procurement, specification-freeze or release authority |
| `TIME_MACHINE.md` | Generated append-only transition chronology | V2 history view; not decision or domain authority |
| `state/history/company-transitions.jsonl` | Canonical append-only Company OS transition ledger | V2 historical record; corrections append, never rewrite |
| `state/history/pending-transition-proposals.json` | Committed review-only proposal queue | V2 proposal staging; not ledger or decision authority |
| `state/history/reviewed-transition-append.schema.json` | Reviewed append-candidate contract | V2 preparation contract; never authorizes ledger mutation |
| `.github/PULL_REQUEST_TEMPLATE/company-transition-append.md` | Human append-PR checklist | V2 review aid; not approval authority |
| `scripts/control/verify-transition-source-snapshot.mjs` | Verify appended source snapshot is already contained in PR-base main | V2 ancestry guard; not domain validation |
| `scripts/control/transition-workflow-status.mjs` | Read-only mechanical status for proposal → review → append workflow | V2 operator aid; not review, decision or finalization authority |
| `scripts/control/transition-review-packet.mjs` | Human-readable rendering of review-only transition proposals | V2 review aid; not approval, review record, decision or ledger authority |
| `state/freshness/freshness-state.json` | Machine-readable freshness overlay | V2 projection with decision-use guardrails |
| `state/schemas/registry-schema-map.json` | Registry → JSON Schema contract map | V2 structural contract; not domain authority |
| `EXPERIMENTS.md` | Hypothesis → test → result → decision ledger | V1 projection/index |
| `UNKNOWNS.md` | Critical unknowns / value-of-information ledger | V1 projection/index |
| `docs/strategy/COMPETITIVE_LANDSCAPE.md` | Competitor intelligence | Existing controlled watch |
| `docs/records/*` | Evidence chronology and memory | Existing controlled layer |

## 7. Stage-gate model

EMOPET should allocate work by uncertainty retired, not by feature count.

Proposed company stages:

| Stage | Question |
|---|---|
| `S0 THESIS` | Is the problem, user and product thesis coherent enough to test? |
| `S1 PHYSICS` | Can MAT/TAG produce repeatable, trustworthy evidence in their intended contexts? |
| `S2 PRODUCT` | Does the narrow end-to-end product create recurring owner value? |
| `S3 ECONOMICS` | Can the product be built, supported and sold with viable unit economics? |
| `S4 LAUNCH` | Can EMOPET operate a controlled regional launch with support, trust and compliance? |
| `S5 PLATFORM` | Which adjacent surfaces deserve scale after core proof? |

A workstream may be technically ahead of the company stage. That does not move the whole company to a later stage.

## 8. Gates, experiments and capital

Every material experiment should eventually record:

- hypothesis;
- why it matters;
- owner;
- inputs;
- expected evidence;
- metric or acceptance criterion;
- cost and time budget when known;
- result;
- `GO`, `ITERATE`, `HOLD` or `KILL`;
- evidence refs;
- decision refs.

Every material spend should be linkable to the milestone or uncertainty it is intended to retire. Funding is therefore treated as **proof capital**, not as permission to expand scope.

## 9. Innovation portfolio

Innovation should be visible as a portfolio, not hidden inside feature work.

Suggested classes:

- `CORE`: required to make the current product thesis work;
- `BET`: high-value differentiated capability with evidence path;
- `OPTION`: preserve cheaply until a trigger makes it worth activating;
- `MOONSHOT`: strategically interesting, explicitly non-critical to the current proof path.

A moonshot must never quietly become a launch dependency.

## 10. Company Time Machine

Git history plus dated state snapshots should make it possible to reconstruct:

- company state at a date;
- active authorities at that date;
- open gates;
- assumptions;
- why a decision changed;
- which evidence triggered the change.

The Company Time Machine now uses `state/history/company-transitions.jsonl` as an append-only transition ledger. Existing lines are immutable; corrections are appended as explicit `CORRECTION` events. Pull-request CI compares the candidate ledger with the base-branch copy and fails closed on historical rewrites.

The bootstrap event marks the start of controlled transition logging and does not claim exhaustive reconstruction of pre-ledger history.

### Review-only transition proposals

`scripts/control/propose-company-transitions.mjs` derives deterministic review proposals from differences between controlled Company OS state at a pull-request base and the candidate state.

The proposal layer MUST remain weaker than the append-only ledger:

- a proposal is always `REVIEW_REQUIRED`;
- `append_ready` is always `false`;
- no proposal is a founder, legal, product, scientific, funding or release decision;
- CI may generate and preserve proposal artifacts, but it MUST NOT append to `company-transitions.jsonl`;
- explicit human review remains required before a separate append-only transition event is created.

Tracked diffs cover stable Company OS object IDs and material state fields such as status, decision, freshness, stage, classification, measured value and controlling refs. Duplicate controlled IDs fail closed instead of being silently overwritten. Missing or untracked meaning is not inferred.

### Reviewed proposal acceptance / append preparation

`scripts/control/prepare-reviewed-transition-append.mjs` provides an explicit, review-gated preparation path after a transition proposal has been examined by a human reviewer.

The preparer is intentionally weaker than a ledger append:

- it requires an explicit `--accept` action;
- it requires a dated public-safe review reference of kind `path`, `issue` or `pr`;
- it carries the current ledger tail ID forward but does not allocate a final event ID;
- it preserves the proposal candidate ref but leaves the final `source_snapshot_ref` null;
- its `append_to_ledger` flag is structurally fixed to `false`;
- it requires a separate human-approved PR before any append-only history mutation;
- it refuses to use the canonical ledger path as its output destination.

This slice does not create any reviewed acceptance record because no human review is fabricated by automation. It only establishes the controlled path that can be used after a real review exists.

### Human-approved transition finalization

`scripts/control/finalize-reviewed-transition-append.mjs` is the controlled finalization path for a real, reviewed proposal.

Finalization is intentionally outside automation:

- CI is forbidden from invoking the finalizer;
- a human must supply `--finalize`, the final event ID, review date, already-merged `main@<sha>` snapshot and append-PR reference;
- the reviewed candidate must still match the current ledger tail, otherwise it is stale and must be re-reviewed;
- final event IDs are explicit and unique, and their date component must match the recorded date;
- the human review reference and append PR are preserved in `decision_refs`;
- the canonical ledger is mutated only by appending one new JSON line;
- normal pull-request CI then validates schema, ordering and strict append-only history.

The finalizer does not decide whether the underlying state change is correct. It only records an already-reviewed transition against an already-merged source snapshot.

### Append-PR checklist and merged-main snapshot verification

A real ledger append should use `.github/PULL_REQUEST_TEMPLATE/company-transition-append.md`.

The checklist makes the human review boundary explicit: reviewers confirm the underlying state change, the reviewed candidate, event ID/date, current ledger tail, append-only behavior, public-safe content and regenerated Time Machine view.

`scripts/control/verify-transition-source-snapshot.mjs` adds the repository-proof half of that boundary. For every event newly appended by a pull request, CI verifies that `source_snapshot_ref` is equal to or an ancestor of the PR base SHA on `main`.

This prevents an unmerged branch commit, divergent commit or future PR head from being cited as if it were already merged company history. The check validates Git ancestry only and cannot approve or substantively validate the transition.

### Human-readable transition review packets

`scripts/control/transition-review-packet.mjs` renders a proposal queue into a bounded review surface without changing the queue or ledger.

The packet:

- shows base/candidate refs, proposal IDs, subject/field/source and exact before/after values;
- exposes public-safe authority, evidence and decision refs already present in the proposal;
- validates supported reference shapes and fails closed on malformed/unknown refs;
- includes a human review checklist;
- supports focusing one proposal by ID;
- preserves `REVIEW_REQUIRED` and `append_ready=false`;
- never writes a review decision, prepares a reviewed append candidate, finalizes an event or appends history;
- explicitly states that source order is not a priority ranking.

A rendered packet is not itself a review record. If a real reviewer accepts a proposal, the separate reviewed-append preparation path must still receive a real dated review reference.

### Mechanical workflow status

`scripts/control/transition-workflow-status.mjs` reduces operator guesswork across the reviewed-transition workflow without mutating any controlled record.

It reports only mechanical state:

- whether the proposal queue is empty or still requires review;
- whether an optional reviewed candidate still maps to the current proposal queue;
- whether its candidate ref still matches;
- whether its recorded ledger tail still matches the current append-only ledger;
- which mechanical step is possible next;
- when review is mechanically required, a deterministic handoff to the existing read-only review packet.

The status helper MUST remain weaker than review/finalization:

- it never writes files or appends history;
- it never marks a proposal accepted, approved, validated or decided;
- it never allocates an event ID or source snapshot;
- it never substitutes for the human review reference or append PR;
- `READY_FOR_MANUAL_FINALIZATION_INPUTS` means only that mechanical references still align;
- an `operator_handoff` is navigation, not prioritization: if multiple proposals are pending it renders the full queue and MUST NOT select a proposal on the operator's behalf.

## 11. Confidentiality boundary

The repository is public. Therefore the Company OS MUST NOT contain:

- secrets or credentials;
- bank details;
- private addresses;
- identity documents;
- raw personal user data;
- signatures;
- unnecessary contract text;
- confidential supplier material;
- private investor terms that should remain restricted.

For restricted evidence, store only safe metadata and a controlled external reference.

## 12. AI-agent contract

Any AI agent doing substantive EMOPET work should:

1. read `AI_READ_FIRST.md`;
2. read the relevant controlled authorities;
3. read `state/company-state.json` for company context;
4. distinguish authority, implementation and evidence;
5. avoid promoting hypotheses or external discussions into facts;
6. link material work to a gate, risk, experiment, milestone or maintenance need;
7. leave an auditable state/evidence/decision update when the work materially changes company truth.

## 13. Implementation sequence

V1 includes the company front door, machine-readable state, milestone/experiment/finance/metrics/risk/unknowns registries, and an every-PR structural evidence guard.

V2 adds the public-safe Corporate/IP projection, the freshness overlay, per-registry schema contracts with cross-object dependency validation, deterministic human views generated from machine-readable state, a public-safe founder cockpit, redacted investor/supplier views, an append-only Company Time Machine transition ledger, review-only transition proposals generated from controlled state diffs, reviewed-proposal append preparation, a human-approved finalization path, and an append-PR checklist with merged-main source-snapshot verification, a read-only transition workflow status doctor, and a read-only transition review packet renderer. Freshness remains conservative, and structural, presentation, historical-record, proposal, preparation, finalization or ancestry validity never substitutes for domain evidence or authority.

Next bounded slices should be chosen from observed operator friction in the reviewed transition workflow rather than added for completeness.

Each slice must remain incremental and must not manufacture certainty to make the cockpit look complete.
