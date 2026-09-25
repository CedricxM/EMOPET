# ELI Guardian proxy evidence map

**Issues:** #87, #88  
**Status:** `CONTROLLED CLAIM-PROVENANCE / NO BLANKET PROXY VALIDATION`  
**Date:** 2026-09-25

## Rule

A paper relevant to a sensor, physiological concept or modelling idea is not automatically a validation source for an EMOPET Guardian-facing proxy.

Every proxy must separately track:

1. measurement source/context;
2. interpretation source/context;
3. explicit EMOPET hypothesis status;
4. EMOPET/canine validation evidence;
5. claim status.

Machine-readable authority:
`config/science/eli-proxy-evidence.json`.

## Guardian presentation

The web UI must not display a bare `Référence : paper` label for unresolved proxies. Context citations must be labelled as context and accompanied by the proxy-specific evidence status.

The scientific footer must explicitly state that the listed publications do not constitute proxy-by-proxy validation.

## activity_variability (#87)

The 1 Hz ODBA / 30-minute CV computation is a deterministic movement feature.

The current positive mapping from that CV to latent arousal, including the 0.4 proportional coefficient in the engine, is an **EMOPET modelling hypothesis**. The current literature cited for ODBA/activity measurement does not establish that affective relationship, functional form or coefficient.

No synthetic/unit test can upgrade that hypothesis to scientific validation.

## Validation boundary

Before an unresolved proxy becomes `SUPPORTED`, evidence must identify the exact population, construct, measurement/algorithm version and claim scope. Canine applicability and EMOPET implementation validity cannot be inferred from a general human/animal conceptual paper.
