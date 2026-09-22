---
description: Close the TAG Rev-B NTC excitation path with the controlled direct-GPIO Phase-0 candidate
---

# /tag-temp

Execute TAG temperature-path closure under issue #510.

Read first:
1. `AGENTS.md`
2. `CLAUDE.md`
3. issue #510
4. issue #492
5. the coherent TAG source workspace recovered under #499
6. `EMOPET_TAG_AUTHORITATIVE_CAPTURE_PLAN.csv`
7. `EMOPET_TAG_COMPONENT_CAPTURE_MATRIX.csv`

This command closes only the **Rev-B Phase-0 NTC excitation implementation**. It does not validate temperature accuracy, dog-body temperature, enclosure thermal transfer or Product V1 cadence.

## 1. Preconditions

Do not run against the known mixed-version supplier schematic.

Require:
- source recovery complete;
- fresh native ERC for the recovered baseline;
- source-coherence PASS;
- RT1/R10/C16/U1 references present and matching the controlled capture evidence.

If those preconditions are not met, STOP and run `/tag-recover`.

## 2. Controlled Phase-0 topology

The active Rev-B temperature candidate is the RT1 NTC branch. TMP117 remains DNP.

Implement:

```text
MS88SF3 / nRF52840 P0.05  ->  R10  ->  NTC_ADC node  ->  RT1  ->  GND
                                         |
                                        C16
                                         |
                                        GND

NTC_ADC node -> MS88SF3 / nRF52840 P0.04 / AIN2
```

No external MOSFET/transistor is required for this Phase-0 candidate.

Controlled component intent:
- RT1: Vishay Dale `NTCSC0402E3103FLFT`, 10 kΩ NTC;
- R10: 10.0 kΩ, 0.1% fixed resistor candidate;
- C16: 10 nF ADC filter candidate;
- excitation: duty-cycled directly from P0.05.

Do not populate the TMP117 alternative in the same build.

## 3. Electrical sanity checks

At 25 °C, nominal divider current is approximately:

`3.3 V / (10 kΩ + 10 kΩ) = 165 µA`.

That is comfortably below the nRF52840 standard-drive GPIO electrical capability.

At the nominal midpoint, the divider Thevenin resistance is about 5 kΩ. With 10 nF, the RC time constant is about **50 µs**, not milliseconds.

The existing component-matrix phrase “47 ms with 4.7 k source” is dimensionally inconsistent with a 10 nF capacitor and must not be propagated as authority. Record it as a source-note defect.

## 4. Firmware handoff

Record the required firmware behavior beside the schematic change:

1. keep P0.05 low/inactive between samples;
2. drive P0.05 high for a measurement;
3. use a conservative Phase-0 settling delay of at least 1 ms before SAADC sampling;
4. sample P0.04/AIN2;
5. return P0.05 low after the sample.

The 1 ms delay is a bring-up candidate, deliberately much longer than the nominal RC constant. It is not an optimized production cadence.

Verify P0.05 has no conflicting current firmware owner before editing.

## 5. Native verification

After editing:
- save in native KiCad;
- run fresh ERC;
- verify P0.05 -> R10 and NTC_ADC -> P0.04/AIN2 connectivity;
- ensure TMP117 remains DNP/isolated;
- classify any remaining finding rather than suppressing it;
- update the blocker register;
- write `TAG_NTC_EXCITATION_CLOSURE_REPORT.md`.

The report must include:
- source hashes;
- exact RT1/R10/C16 values/MPNs known vs still generic;
- native ERC receipt;
- firmware P0.05/P0.04 handoff;
- the corrected RC arithmetic;
- remaining thermal/calibration/physical-validation boundaries.

## 6. Stop condition

If native KiCad passes and the only remaining dependencies are firmware/bench validation:

`TAG_NTC_EXCITE = ELECTRICAL_CANDIDATE_CLOSED / FIRMWARE+BENCH_VALIDATION_OPEN`

If native KiCad cannot run:

`TAG_NTC_EXCITE = CANDIDATE_PATCH_ONLY / NATIVE_KICAD_REQUIRED`

Never output `TEMPERATURE_VALIDATED` or `FABRICATION_READY`.
