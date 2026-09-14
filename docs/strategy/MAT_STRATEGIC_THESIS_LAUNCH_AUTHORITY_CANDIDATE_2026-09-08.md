# EMOPET — MAT strategic thesis vs launch authority

**Control date:** 2026-09-08  
**Status:** `CANDIDATE / OPEN / REQUIRES_FOUNDER_APPROVAL`  
**Authority effect:** `NONE UNTIL APPROVED`  
**Related authority:** `docs/strategy/FOUNDER_STRATEGIC_LOCKS_2026-09-07.md`  
**Related gate:** issue `#230`, `G-MAT-INCREMENTAL-VALUE-01`

## Why this candidate exists

Two valid project controls currently pull in different directions:

1. Founder Strategic Locks describes **MAT + TAG + application** as the core product architecture.
2. `G-MAT-INCREMENTAL-VALUE-01` explicitly allows `MAT_CORE`, `MAT_OPTIONAL`, `MAT_POST_V1`, `MAT_REDIRECT`, or `MAT_KILL`, with no sunk-cost exception.

That ambiguity must not be resolved silently by implementation, copy, procurement, or a presentation.

## Proposed hierarchy

The following wording is a **candidate only** until the Founder explicitly approves it:

> **Strategic thesis:** MAT + TAG + application is the multi-context architecture of value EMOPET is actively trying to prove.
>
> **Launch authority:** inclusion of MAT in Product V1 is conditional on `G-MAT-INCREMENTAL-VALUE-01`. Evidence may narrow, defer, redirect, or kill MAT regardless of sunk cost.

Under this hierarchy, the strategic thesis explains what EMOPET is testing; the launch gate decides what earns commercial inclusion.

## Consequences if approved

- `MAT_CORE` means the evidence supports MAT as part of the V1 commercial composition.
- `MAT_OPTIONAL` means MAT remains strategically useful but is not mandatory for every V1 Guardian.
- `MAT_POST_V1` means TAG + application may launch first while MAT remains an active later hypothesis.
- `MAT_REDIRECT` means the rest-context concept survives but the current MAT implementation or role changes materially.
- `MAT_KILL` means the project must update downstream strategy, claims, product diagrams, pricing, supplier assumptions, and GTM materials. Historical MAT evidence remains provenance, not current authority.

## Rules while this decision remains OPEN

Until Founder approval and closure of the evidence gate:

- this file does not supersede or amend Founder Strategic Locks;
- do not describe MAT as commercially indispensable;
- do not claim MAT makes EMOPET generically more accurate than wearables;
- do not use the Founder lock to bypass the incremental-value experiment;
- do not use the kill gate to pretend the strategic MAT hypothesis was never part of the project;
- supplier spend, prototype effort, and sunk cost are not evidence of product value;
- the only permitted external framing is that MAT and TAG are **intended complementary observation contexts under evaluation**.

## Required approval record

Do not promote this file to `PROJECT_DECISION` without recording:

- Founder approver;
- approval date;
- exact approved wording;
- whether `FOUNDER_STRATEGIC_LOCKS_2026-09-07.md` must be amended;
- resulting status of `G-MAT-INCREMENTAL-VALUE-01` (normally still `OPEN` until evidence exists).

## Evidence needed to close the launch gate

The decision itself does not close #230. Closure still requires the controlled comparison of `TAG_ONLY`, `MAT_ONLY`, and `MAT_PLUS_TAG`, including qualification rate, missingness, repeatability, provenance quality, publish/degrade/reject impact, household burden, multi-dog failure modes, and commercial comprehension.

**No evidence, no promotion.**
