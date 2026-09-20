# EMOPET — Current Repository Hardware / Terminology Drift Audit — 2026-09-07

**Status:** `CONTROLLED MEMORY / IMPLEMENTATION RECONCILIATION REQUIRED`  
**Scope:** current repository wording and software contracts versus current MAT Phase 0 authority.  
**Important:** this audit does not authorise blind renaming of protocol/database fields.

## Purpose

The May–June archaeology established that the MAT sensing path evolved from flat/discrete PVDF concepts to four shielded coaxial piezoelectric cables. A repository search still returns many `PVDF` references.

Those references are **not all stale**.

The current L4 sensing element itself is documented in ClickUp as a **shielded coaxial PVDF piezo cable**. Therefore:

> `PVDF` as a material/modality label may remain technically compatible with current architecture.

The real reconciliation question is whether each occurrence means:

1. current **coaxial PVDF cable modality**;
2. historical **flat film / LDT0-028K architecture**;
3. an obsolete hardware location/topology;
4. a software/protocol alias that is intentionally stable;
5. an unvalidated feature assumption that must not be mistaken for measured capability.

## 1. Current controlling MAT signal architecture

Current Phase 0 authority separates three chains:

### Respiratory sensing

- four shielded coaxial piezoelectric/PVDF cable channels;
- independent analogue front-end per cable;
- synchronous acquisition;
- respiratory periodicity from piezo channel(s) only;
- fusion only among piezo channels.

### Load cells

- four load cells;
- presence, weight, distribution, gross movement, stability, eligibility/gating/suppression;
- not fused into respiratory or cardiac estimation.

### Environmental reference

- one lower/base/chassis vibration-reference candidate;
- contamination/confidence/veto/offline-analysis purpose;
- current candidate comparison includes base MEMS accelerometer versus chassis piezo reference.

Production PCB, final Gerbers, final thresholds/fusion and final stack remain unfrozen until evidence closes the feasibility gate.

Historical June records additionally preserve BME280 ambience and an NTC near the central cable, but later Phase 0 authority governs where the records diverge.

## 2. `PVDF` is not automatically obsolete

ClickUp supplier record `869dw7uf9` explicitly names the current critical L4 candidate as:

`TS-PC2602 câble piézo coaxial PVDF`

and describes four longitudinal shielded coaxial sensing lines.

Therefore a global search-and-replace from `pvdf` to `coaxial` would be unsafe.

### Rule

- `PVDF` may remain as the material/modality name where it means the current coaxial PVDF sensing path;
- references to **six zones**, **LDT0-028K**, **flat film as V1**, or old topology are historical/superseded;
- location/topology wording must match the current MAT, not a chest strap or contact sensor;
- public claims must remain evidence-gated regardless of terminology.

## 3. Confirmed repository drift

### 3.1 `docs/firmware_protocol.md`

The current document says:

> `Source: PVDF piezo chest strap`

under MAT respiratory variability.

This is incompatible with the current product topology. The respiratory source is the instrumented MAT's shielded coaxial PVDF/piezo cable channels, not a chest strap.

It also describes concrete firmware computation as if an existing MAT RR peak detector were already an implemented sensing baseline. Because current hardware remains pre-prototype/feasibility and signal validation is still a gate, this implementation text must not be read as experimental validation of the physical signal chain.

**Status:** `CLEAR TERMINOLOGY / MATURITY DRIFT`.

### 3.2 `AGENTS.md` and `CLAUDE.md`

Both permanent assistant-context files summarize the MAT as containing:

`PVDF, IMU, cellules de charge, BME280`

This summary is too coarse and potentially misleading relative to current Phase 0 authority:

- it does not state the four shielded coaxial cable topology;
- it does not preserve the separation between respiratory piezo, load-cell gating and environmental-reference chains;
- it can imply a generic MAT IMU as a frozen component when the current environmental-reference sensor remains a candidate comparison;
- it does not state that final PCB/fusion/thresholds remain unfrozen.

**Status:** `STALE ASSISTANT CONTEXT / RECONCILIATION REQUIRED`.

### 3.3 BLE protocol field names

`packages/ble-protocol/src/frames/types.ts` contains:

- comments such as `PVDF respiratory rate`;
- `pvdfReliability`.

These names may still be valid if `PVDF` is intentionally defined as the current coaxial-PVDF modality identifier. They are therefore **not marked wrong** by this audit.

However, because protocol names become external/internal contracts, the repository needs an explicit canonical definition:

> `pvdf` = MAT coaxial-PVDF piezo sensing modality, independent of old flat-film/LDT0 topology.

If that alias is retained, document it rather than renaming casually.

**Status:** `TO_CONFIRM SEMANTIC ALIAS / DO NOT BLINDLY RENAME`.

### 3.4 FeatureVector and RSM sensor IDs

`packages/shared/src/types/feature-vector.ts` and ELI/RSM code use `pvdf` as a quality/sensor identifier.

Again, this can remain coherent if `pvdf` is a stable modality alias for the current coaxial-PVDF channel family.

What requires correction is not necessarily the identifier but any surrounding assumption that encodes an old topology or treats unvalidated respiratory features as proven physical capability.

**Status:** `ALIAS MAY BE VALID / MATURITY SEMANTICS REQUIRE REVIEW`.

### 3.5 Firmware comments / feature assumptions

Firmware and protocol documents describe RR variability, peak detection and related outputs as implemented computations. Software implementation can legitimately precede hardware validation, but the distinction must stay explicit:

- code path exists ≠ sensor signal has been demonstrated;
- synthetic test passes ≠ bench feasibility passes;
- feature schema exists ≠ commercial device measures it reliably.

**Status:** `IMPLEMENTATION EXISTS / PHYSICAL VALIDATION NOT ESTABLISHED`.

## 4. Historical architecture markers that must remain historical

The following should not be reintroduced as current MAT architecture merely because they exist in old BOMs/docs:

- six LDT0-028K sensing zones;
- TAL220 5 kg load cells;
- flat PVDF film as the primary V1 sensor;
- six-channel discrete-sensor topology from the May architecture;
- any Made-in-France critical-sensor claim inherited from the Alqio branch without current sourcing evidence.

Historical sequence remains:

`raw-film / Alqio exploration → discrete LDT0-028K → four shielded coaxial PVDF piezo cables`

## 5. Recommended reconciliation order

1. Correct the MAT topology/maturity summary in `AGENTS.md` and `CLAUDE.md`.
2. Correct the explicit `PVDF piezo chest strap` error in `docs/firmware_protocol.md`.
3. Define a canonical sensor-modality glossary stating whether `pvdf` is retained as the stable software/protocol alias for current coaxial PVDF channels.
4. Review protocol comments and feature-vector comments against that glossary.
5. Keep schema/protocol renames gated because they can create migration or compatibility consequences.
6. Mark firmware respiratory feature paths as software/algorithm readiness, not hardware validation.
7. Reconcile only topology-specific stale assumptions; do not erase useful historical or material terminology.

## 6. Suggested canonical terminology

Until a later controlled engineering naming decision changes it:

- **Hardware / technical prose:** `shielded coaxial PVDF piezo cable channel` on first use, then `piezo channel` or `coaxial PVDF channel`;
- **Modality alias in code (if retained):** `pvdf` = current MAT coaxial-PVDF piezo modality, not a topology claim;
- **Historical sensor:** explicitly `flat PVDF film`, `LDT0-028K`, or `six-zone discrete PVDF architecture`;
- **Load cells:** gating/context chain, not respiratory fusion;
- **Reference vibration sensor:** candidate environmental-reference channel until frozen.

## 7. Closure status

The historical sensor lineage is closed. The remaining problem is **repository semantic reconciliation**.

Open implementation gates:

- `OPEN-REPO-HW-001` — update assistant-context MAT topology/maturity;
- `OPEN-REPO-HW-002` — correct chest-strap/topology errors in firmware documentation;
- `OPEN-REPO-HW-003` — decide/document canonical `pvdf` software alias semantics;
- `OPEN-REPO-HW-004` — audit feature/firmware claims for implementation-vs-validation wording.

**A material name is not a topology. A software field is not experimental evidence.**
