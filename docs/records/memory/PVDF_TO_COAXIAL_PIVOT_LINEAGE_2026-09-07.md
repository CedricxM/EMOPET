# EMOPET — PVDF to Coaxial MAT Pivot Lineage

**Audit date:** 2026-09-07  
**Status:** `RETROSPECTIVE CONTROLLED MEMORY`  
**Scope:** historical lineage only. Current engineering authorities remain controlling.

## Reconstructed chronology

### April / early May 2026
Scientific outreach already described the MAT as a stationary bed using a PVDF piezoelectric array, load cells and environmental sensors. PVDF was therefore a real working architecture, not a later retrospective reconstruction.

### 13 May 2026
The supplier map `EMOPET_Cartographie_Fournisseurs-2.xlsx` still showed an exploratory MAT with LDT0-028K sensors, load cells, BME280, ESP32-S3 and a mixed France/Europe/Asia supplier map.

Source: Gmail message `19e20f5653a6dd47`.

### 25 May 2026
The contemporaneous workbook `EMOPET_Couts.xlsx` records a frozen six-sensor LDT0-028K architecture and explicitly states that the raw Alqio / APT_FC20_MET film route had been rejected because custom cutting was not available and the metallised-film cutting/integration capability was not mastered by the intended assembly route.

The workbook modelled six discrete sensors and a six-channel conditioning/multiplexing chain.

Source: Gmail message `19e888021d3ac2d6`, attachment `EMOPET_Couts.xlsx`.

### 11 June 2026
`EMOPET_Architecture_Hybride.pdf` formalised a two-layer MAT architecture around six discrete LDT0-028K sensors, a washable passive cover and a protected instrumented layer. It explicitly stated that no physical prototype or experimental validation had yet been completed.

Source: Gmail message `19eb68ef7ca41675`.

### 24–26 June 2026
ClickUp closes the missing historical rationale.

Task `869dvj0bn` records the decision that the shielded coaxial piezo cable won over the flat/discrete PVDF route because of:

1. native Faraday shielding and better 50 Hz rejection;
2. greater mechanical robustness;
3. thoracic coverage regardless of the dog's resting orientation.

The task records four longitudinal shielded coaxial cables in L4 and explicitly says signal validation still had to be performed on the bench.

Task `869dvj04r` records the updated V1 architecture with four shielded coaxial cables, four 50 kg load cells, BME280, NTC and continuous coupling-layer candidates. Flat PVDF becomes benchmark-only.

Task `869dw3r4m` records the previous six-zone LDT0-028K architecture, TAL220 5 kg cells and associated six-channel conditioning/multiplexer as removed from V1.

## Decision

`OPEN-MEM-LINEAGE-PVDF-001` is **CLOSED at the historical decision level**.

The pivot rationale is now evidenced by ClickUp rather than reconstructed from memory.

## Important limitation

The architecture decision did **not** prove the physical signal chain. The same decision record states that the signal still required bench validation.

Design selection must therefore never be cited as experimental validation.

## Alqio nuance

Earlier retrospective material preserved an Alqio / Armor Smart Films branch and manufacturing-scenario work. The contemporaneous May workbook shows that by 25 May the project had moved away from raw Alqio film to discrete LDT0-028K for manufacturability/integration reasons, before the later June pivot to coaxial cable.

The historical sequence is therefore:

`raw-film / Alqio exploration → discrete LDT0-028K architecture → four shielded coaxial piezo cables`

not a direct Alqio-to-current jump.
