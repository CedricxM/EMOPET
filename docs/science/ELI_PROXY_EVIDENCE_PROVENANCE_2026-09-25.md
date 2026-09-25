# ELI Guardian-facing proxy evidence map

**Issue:** #88  
**Status:** `CONTROLLED PROVENANCE CLASSIFICATION / NOT SCIENTIFIC VALIDATION`  
**Date:** 2026-09-25

Machine-readable authority:

`apps/web/lib/eli/eli-proxy-evidence.json`

## Presentation rule

A paper named next to an EMOPET proxy is not automatically a validation citation.

Guardian-facing presentation must distinguish:

- `MEASUREMENT_CONTEXT` — relevant sensing/measurement context only;
- `CONCEPTUAL_CONTEXT` — motivates a concept but not the exact operational proxy;
- `NOT_ESTABLISHED_BY_CITED_SOURCE` — the currently cited source does not establish the exact proxy claim;
- `SEPARATE_GATE` — a dedicated scientific/semantic issue owns the unresolved evidence.

Until a later controlled record promotes a proxy to stronger evidence status, the UI must use **source de contexte** language rather than a bare `Référence` label that can imply direct validation.

## Source-scope boundaries

- Russell (1980): human affective circumplex / conceptual context, not direct validation of canine routine/activity proxies.
- McEwen (1998): allostasis/allostatic-load conceptual framework, not EMOPET thresholds or canine recovery equations.
- Homma & Masaoka (2008): respiration/emotion review, not EMOPET sleep scoring or exact rr_variability semantics.
- Brugarolas et al. identifiable canine wearable work: sensing feasibility/context, not automatic validation of each activity/posture/acoustic proxy.
- Foster et al. (2021): resting/sleeping canine IMU physiological reconstruction context, not automatic validation of every rest/social proxy.

## Regression rule

The control test must fail if:

- a Guardian proxy has no evidence entry;
- an unrecognized evidence status appears;
- G02 loses its #86 gate;
- a checked-in status silently becomes `SUPPORTED` or `VALIDATED` without an explicit controlled change.

This record does not invalidate a proxy. It prevents contextual literature from being presented as stronger evidence than it is.
