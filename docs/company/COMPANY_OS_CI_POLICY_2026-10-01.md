# EMOPET — Company OS CI invariants

**Date:** 2026-10-01  
**Status:** `CONTROLLED MECHANICAL GUARD / DOES NOT CREATE DOMAIN AUTHORITY`

## Purpose

The Company OS is useful only if it fails closed when its projection overstates reality.

The guard at `scripts/control/company-os-state.test.mjs` therefore protects a small set of mechanical invariants. It does not decide product, science, legal, finance, hardware or fundraising questions.

## Enforced invariants

1. Machine-readable Company OS files must parse.
2. Stable object IDs must remain unique.
3. Repository `path` references must resolve; issue/PR/commit reference shapes must remain explicit.
4. Strong evidence states such as `PASSED`, `VALIDATED`, `SIGNED`, `AWARDED`, `COMMITTED` or `REVIEWED_GO` require evidence references.
5. A milestone cannot become `PASSED` while a required gate remains open or lacks evidence.
6. An experiment cannot acquire a non-null decision without evidence.
7. Finance preserves `UNKNOWN != 0`.
8. Research-derived fundraising numbers must remain labelled as planning assumptions and not approvals or commitments.
9. Public Markdown views must disclose that they are projections/indexes rather than their domain authority.
10. The guard itself must run in the every-PR security workflow.
11. A metric value requires evidence; a filled metric target cannot remain `TBD_BEFORE_RUN` or `NOT_DEFINED`.
12. A numerical risk probability requires evidence, and a `CLOSED` risk requires evidence.
13. A `RESOLVED` critical unknown requires evidence; null cost/time-to-reduce values must remain explicitly `UNKNOWN`.
14. Proof Velocity remains a transparent count of evidence-backed uncertainty transitions, not an opaque score or a proxy for PR/commit/feature volume.

## Deliberately not enforced yet

This first guard does not:

- decide evidence freshness from wall-clock time;
- contact Gmail, suppliers, banks or investor systems;
- verify that an external counterparty accepted a communication;
- validate accounting actuals;
- validate laboratory results;
- infer legal rights;
- generate Markdown views from JSON;
- establish fundraising readiness.

Those require later bounded controls.

## Certainty rule

The intended invariant remains:

```text
MERGED_CODE != PHYSICAL_VALIDATION
SENT_EMAIL != RECEIVED_ACCEPTANCE
MEETING != PARTNERSHIP
QUOTE != ACTUAL_COGS
PILOT != PRODUCT_MARKET_FIT
INTEREST != INVESTMENT_COMMITMENT
TERM_SHEET != CASH_IN_BANK
```

A green Company OS guard proves only that these repository-level structural boundaries still hold.
