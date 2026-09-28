# ELI public API projection contract

**Issue:** #124  
**Parents:** #118, #122  
**Date:** 2026-09-25  
**Status:** `CONTRACT CANDIDATE / ENDPOINT NOT ACTIVATED / NO PUBLIC OBSERVATION AUTHORIZED`

## 1. Why this contract exists

The repository already has an internal `ELIState`, a single cross-surface `InferenceResult`, truthful backend 501 responses while no canonical producer exists, and a mobile hook explicitly marked `UNWIRED`.

What did not exist was a narrow public contract preventing a future API from simply serializing the internal state.

## 2. Availability state machine

### NOT_IMPLEMENTED
No canonical runtime/producer exists. This is the current repository state.

### UNAVAILABLE
A canonical producer exists, but an authoritative dependency cannot currently be read or evaluated. This is not equivalent to no observation.

### NONE_FOUND
The authoritative query succeeded and there is no publishable observation. This is epistemic silence, not an error and not a zero.

### AVAILABLE
An authoritative publishable observation exists. This state is structurally reserved but cannot currently be instantiated because the semantic public observation subtype is intentionally `never`.

## 3. Internal/public firewall

The public API must not expose by convenience:
- `valence`;
- cumulative `load`;
- raw per-sensor reliability internals;
- private veto chains;
- generic wellbeing/global ELI scores;
- internal model state merely because it exists in `InferenceResult`.

The existing `ELIDisplay` helper is retained for compatibility but is explicitly historical/internal, not a future API contract.

## 4. Required evidence envelope

Before any concrete semantic subtype is authorized, every future AVAILABLE observation must carry or be traceable to:
- observation and dog identity;
- event/window timestamps;
- publication state and confidence;
- context and individual/contextual reference;
- bounded source summary;
- explicit limits;
- engine/model/config versions;
- feature-contract version;
- baseline version/receipt;
- source-device firmware provenance.

No naked number.

## 5. Why AVAILABLE is blocked today

The first architecture slice under #479 uses TAG `activity_variability`. Its measurement contract is coherent, but the mapping `activity_variability -> latent arousal` remains an unvalidated EMOPET hypothesis under #87.

#122 also records that current BLE V1 does not transport `activity_variability` end-to-end.

Therefore this contract does not add a public arousal subtype, does not select a mobile endpoint, does not activate persistence, and leaves the existing 501 untouched.

## 6. Endpoint naming

This change does not decide whether the final route is `/api/sensors/eli/:dogId`, `/api/eli/:dogId`, or another bounded Care observation endpoint. Final route naming follows producer/projection authority, not placeholder inertia.

## 7. Client rule

Web/mobile must preserve availability states, consume the authoritative backend projection, never recompute canonical ELI locally as fallback, never substitute mock values, and never coerce unavailable evidence into zero.

## 8. Activation checklist

Before AVAILABLE becomes inhabitable and a live endpoint replaces 501:
1. canonical producer/orchestrator exists;
2. #122 feature transport/ingestion is controlled;
3. concrete public semantics are Science/Product authorized;
4. persistence/read provenance exists;
5. baseline identity/version is reproducible;
6. field-level privacy/export review is complete;
7. one owner-scoped endpoint is selected;
8. clients consume it without fallback/recompute;
9. exact-head conformance/security evidence is green.

## 9. Current disposition

`ELI_API_AVAILABILITY_CONTRACT = CANDIDATE DEFINED`

`ELI_API_AVAILABLE_SEMANTIC_PAYLOAD = BLOCKED`

`ELI_API_ENDPOINT = NOT SELECTED`

`ELI_API_CURRENT_RUNTIME = 501 NOT_IMPLEMENTED`

`VALENCE_PUBLICATION = FORBIDDEN`

`LOAD/GLOBAL_ELI_PUBLICATION = NOT AUTHORIZED`
