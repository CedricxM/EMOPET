# ELI Owner-facing proxy evidence map

**Issues:** #87, #88  
**Status:** `CONTROLLED CLAIM-PROVENANCE / NO BLANKET PROXY VALIDATION`  
**Date:** 2026-09-25

## Rule

A paper relevant to a sensor, physiological concept or modelling idea is not automatically a validation source for an EMOPET Owner-facing proxy.

Every proxy must separately track:

1. measurement source/context;
2. interpretation source/context;
3. explicit EMOPET hypothesis status;
4. EMOPET/canine validation evidence;
5. claim status.

Machine-readable authority:
`config/science/eli-proxy-evidence.json`.


### Machine-readable field separation

The controlled JSON now records the evidence dimensions independently:

- `measurementSources`: bibliography ids relevant only to sensing/measurement context;
- `interpretationSources`: bibliography ids relevant only to conceptual/interpretation context;
- `contextSources`: citations retained for traceability when they do **not** establish the proxy-specific claim, or when a separate scientific gate owns the semantics;
- `emopetHypothesisStatus`: explicit hypothesis-assessment state;
- `validationEvidence`: exact reviewed EMOPET/canine validation pointer, or `null` when none is established;
- `separateGate`: dedicated gate pointer when `claimStatus = SEPARATE_GATE`.

`NOT_ASSESSED` for `emopetHypothesisStatus` is intentionally fail-closed. It means the proxy has not yet received a separate Science disposition on whether its transform/relationship is an EMOPET hypothesis. It must not be read as `NOT_APPLICABLE`, literature support, or validation.

The evidence vocabulary is itself enforced: every proxy `claimStatus` must belong to the declared `allowedStatuses`, every source id must resolve to the controlled bibliography, and unresolved citations cannot silently populate measurement or interpretation evidence fields.

## Owner presentation

The web UI must not display a bare `Référence : paper` label for unresolved proxies. Context citations must be labelled as context and accompanied by the proxy-specific evidence status.

The scientific footer must explicitly state that the listed publications do not constitute proxy-by-proxy validation.

## activity_variability (#87)

The 1 Hz ODBA / 30-minute CV computation is a deterministic movement feature.

The current positive mapping from that CV to latent arousal, including the 0.4 proportional coefficient in the engine, is an **EMOPET modelling hypothesis**. The current literature cited for ODBA/activity measurement does not establish that affective relationship, functional form or coefficient.

No synthetic/unit test can upgrade that hypothesis to scientific validation.

## Validation boundary

Before an unresolved proxy becomes `SUPPORTED`, evidence must identify the exact population, construct, measurement/algorithm version and claim scope. Canine applicability and EMOPET implementation validity cannot be inferred from a general human/animal conceptual paper.
