# EMOPET — Regional Pack scoped-source readiness

**Date:** 2026-10-01  
**Status:** `IMPLEMENTED READINESS MODEL / NO SOURCE PROMOTION`

## Problem

The Regional Pack originally evaluated every source at one top-level source-registry scope.

That is correct for sources such as DATAtourisme, where the product can reason about one source-level rights/evidence state.

It is incomplete for catalogue-style sources such as Région Bretagne Open Data.

The parent registry entry intentionally carries:

- `license: null`;
- catalogue-level identity;
- a recheck rule;
- no blanket dataset rights.

Individual datasets carry their own:

- licence;
- approved fields;
- schema evidence;
- rights receipt;
- source version.

If the Regional Pack only evaluated the parent source, `region-bretagne-open-data` would remain permanently blocked by `NO_LICENCE_RECEIPT` even after one exact allow-listed dataset became legitimately release-ready.

That would make the dataset-level gates technically correct but impossible to use.

## Change

Regional source bindings now support an explicit readiness scope.

Default:

`SOURCE`

Catalogue-style Bretagne open-data binding:

`BRETAGNE_OPEN_DATA_DATASETS`

with an explicit list of dataset IDs.

The Bretagne Regional Pack currently binds:

`reserves-naturelles-regionales-de-bretagne`

to the `territorial_context` domain.

## Effective readiness

For ordinary sources:

`source registry rights + source release receipt -> source readiness`

For the Région Bretagne catalogue:

`parent source identity/recheck + exact dataset allow-list + dataset schema + dataset rights -> binding readiness`

At least one exact scoped dataset must be release-ready for the binding to satisfy its Regional Pack domain.

The parent portal's `license: null` remains visible as a diagnostic source-level blocker, but it is **not** treated as the effective dataset blocker.

This distinction prevents both failure modes:

1. assigning one blanket licence to the whole portal;
2. making all dataset-level evidence useless because the parent catalogue can never pass a source-level licence gate.

## Current Bretagne result

The territorial-context binding is **still blocked**.

The first dataset remains blocked by its current exact state, including:

- dataset not `RELEASE_READY`;
- no approved record fields;
- no release-ready schema evidence;
- no release-ready dataset rights evidence.

Therefore this change does not unlock ingestion or Regional Pack release.

It only makes the future promotion path architecturally reachable.

## Evidence report

The Regional Pack evidence report now exposes both levels:

- parent source rights blockers;
- effective readiness kind;
- scoped resource IDs;
- scoped resources that are release-ready;
- effective blockers.

This lets an admin/debug surface say:

> catalogue source exists, parent has no blanket licence, exact dataset X is still blocked for reasons Y/Z

instead of collapsing everything into:

> source has no licence.

## Fail-closed boundaries

Dataset scope rejects:

- unknown source;
- wrong source used with the Bretagne dataset scope;
- empty dataset list;
- unknown dataset IDs;
- every dataset-level blocker returned by the controlled dataset rights gate.

Ordinary sources continue to use the existing generic source-level release gate.

## Non-goals

This change does not:

- set any dataset to `RELEASE_READY`;
- approve record fields;
- create a rights receipt;
- resolve the RNR licence-version clarification;
- enable runtime ingestion;
- infer dog access, dog-friendliness or local rules;
- create a partnership claim.

Related:

- merged Regional Pack evidence report;
- #836 — Région Bretagne dataset allow-list;
- #942 — primary schema proof hardening;
- #953 — RNR licence clarification;
- #116 — third-party data/service rights.
