# EMOPET — Company Operating System Architecture

**Date:** 2026-10-01  
**Status:** `PROPOSED COMPANY CONTROL PLANE / DOES NOT REPLACE DOMAIN AUTHORITIES`  
**Branch base:** `main@a7e9002fbd744641128aad3c3ac1a06a4dd3564e`

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

## 6. Core company surfaces

| Surface | Purpose | Authority behavior |
|---|---|---|
| `COMPANY.md` | Front door to EMOPET as a company | Navigation only |
| `STATE.md` | Human-readable current snapshot | Projection, not domain authority |
| `state/company-state.json` | Machine-readable current snapshot | Projection with authority/evidence refs |
| `MILESTONES.md` | Stage gates and proof sequence | V1 projection/index |
| `METRICS.md` | Evidence/traction/quality metrics | V1 projection/index |
| `RISKS.md` | Company risk register and kill gates | V1 projection/index |
| `FINANCE_STATE.md` | Unit economics, runway, funding state | V1 public-safe projection; no invented values |
| `CORPORATE.md` | Public-safe entity, governance, IP and rights state | V2 projection/index; restricted evidence stays external |
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

Later phases should add an append-only state-transition ledger instead of silently editing away important history.

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

V2 adds the public-safe Corporate/IP projection in `CORPORATE.md` and `state/corporate/corporate-state.json`, indexing entity/governance status and the controlled rights gates in #114, #116 and #680 without copying restricted instruments.

Next bounded slices should add, in order:

1. freshness and STALE semantics tied to evidence review cadence;
2. per-registry schemas and cross-object dependency validation;
3. generated human views from machine-readable state to prevent drift;
4. founder cockpit derived from controlled state;
5. redacted investor and supplier views derived from the same controlled state.

Each slice must remain incremental and must not manufacture certainty to make the cockpit look complete.
