# Firmware Protocol — v6

Firmware version: **6.0.0** (`firmware/FIRMWARE_VERSION.h`).

> **Maturity note — 2026-09-07:** this document describes software/firmware feature contracts and implementation intent. It does **not** establish physical MAT signal feasibility, validated IBI extraction, or scientific/product validation. The current MAT Phase 0 hardware remains evidence-gated.

v6 adds sensor-side computations and corresponding fields to the canonical
`FeatureVector` contract.

> **Transport correction — #122 / 2026-09-25:** the current BLE V1 frame
> (`packages/ble-protocol/src/frames/types.ts`) does **not** serialize
> `activity_variability`, `rr_variability`, `tremor_detected`,
> `lateral_acc_rms` or `gyro_std_deg_s`. Those fields exist in the shared
> feature contract and some have firmware implementations, but the current
> parsed MAT/TAG payload does not carry them. Therefore “field exists in
> FeatureVector” must not be read as “field is currently uplinked end-to-end”.
> A versioned feature transport remains open under #122.

## Sensor-modality naming

Within software/protocol fields, `PVDF` / `pvdf` refers to the **current MAT shielded coaxial PVDF piezo sensing modality**, not to the superseded flat-film/LDT0-028K topology.

Do not infer a hardware geometry from the software alias alone. Protocol/schema renames require an explicit compatibility decision.

## FeatureVector additions (v6)

| Field | Type | Source | Null meaning |
|---|---|---|---|
| `rr_variability` | `number \| null` | MAT — coaxial PVDF/piezo IBI CV over 60 s **(contested — see #86)** | <30 valid IBIs |
| `activity_variability` | `number \| null` | TAG — ODBA CV over 30 min | <50% valid seconds |
| `tremor_detected` | `boolean` | TAG — 8–15 Hz bandpass | false when below threshold |
| `lateral_acc_rms` | `number \| null` | TAG — lateral RMS over 1 s | TAG not reporting |
| `gyro_std_deg_s` | `number \| null` | TAG — gyro std over 1 s | TAG not reporting |

`null` means "no valid observation"; firmware never substitutes zero.

## MAT — rr_variability

- Intended source: instrumented MAT shielded coaxial PVDF/piezo cable channel(s)
- Current Phase 0 topology: four shielded coaxial piezo/PVDF channels with independent analogue front ends and synchronous acquisition
- IBI buffer: 60 s rolling ring
- Reject IBI outside `[0.3, 10.0] s`
- Return `NAN` if fewer than 30 valid IBIs in the window
- Output: `std(ibi) / mean(ibi)`

Module: `firmware/mat/main/sensors/rr_variability.{h,c}`.

> **CONTESTED DEFINITION — do not build on either side until #86 closes (recorded 2026-09-22).** This section and `docs/eli_model.md` both describe a **coefficient of variation over 60 s** (`std(ibi) / mean(ibi)`, dimensionless). The firmware in `rr_variability.{h,c}` computes a **standard deviation over 300 s** (`RR_IBI_BUFFER_WINDOW_SEC 300`, `return (float)sqrt(var)` — seconds, no division by the mean). Unit *and* window differ, so a consumer calibrated on one produces a dimensionally wrong result on the other. Neither is authority yet. Both documents cite Homma & Masaoka (2008) for a definition the firmware does not compute. The choice propagates into `baseline.rrVariabilityMean` / `rrVariabilityStd`, veto thresholds and the published observation semantics, so no canine validation protocol should be executed against this feature until the definition is fixed. Gate: #86 (FW-SCI-01).
>
> **Citation provenance, checked 2026-09-22.** Homma & Masaoka (2008) and the
> Masaoka & Homma line of work report that anticipatory anxiety **increases
> respiratory rate** and **shortens** inspiratory and expiratory time,
> independently of metabolic demand — a *level* effect on rate and timing. They
> are not a source for "inter-breath-interval *variability* tracks anxiety".
> The separate respiratory-variability literature quantifies total variability
> by **either CV or SD**, so it does not settle the statistic either, and
> reports trait anxiety covarying with **lower** variability. The firmware
> header's claim about expiratory-time variability therefore attaches to a
> finding the cited work makes about rate, not variability. Owner: #88.
>
> **Why the implementation must not simply be aligned to either document.** Per
> the glossary's change-control rule, a contract change needs a producer /
> consumer inventory first. Taken 2026-09-22, the unit-sensitive consumers are:
> `packages/shared/src/types/feature-vector.ts`,
> `packages/shared/src/types/sub-baseline.ts` (`rrVariabilityMean`,
> `rrVariabilityStd`), `packages/eli-engine/src/ekf/observation-model.ts`,
> `packages/eli-engine/src/vetoes/index.ts`, `backend/db/schema/eli-v5.ts` and
> `backend/db/migrations/0004_v6_additions.sql`. Changing the statistic changes
> the unit, which **silently invalidates every stored baseline and every
> threshold derived from it** — a rename would fail loudly, a unit change will
> not. No migration or versioning decision exists, so implementation must not
> move first. `rr_variability` also has **no entry** in
> `SENSOR_MODALITY_GLOSSARY_2026-09-07.md`, the authority `CLAUDE.md` names for
> sensor changes.

> **Validation boundary:** the existence of this code path or feature schema does not prove that the current MAT hardware can yet extract reliable IBIs or `rr_variability` in bench or animal conditions. Publication/use remains subject to the current feasibility, signal-quality and product-authority gates.

> **Resolved 2026-09-22**: the earlier fix-up note asked for `#define RR_IBI_WINDOW_MS` to be moved above its first use. It already is — declared at `rr_variability.c:14`, first used at `:45` inside `collect_window()`. The instruction is removed rather than left to be re-executed.

## TAG — activity_variability

- Source: IMU ODBA at 1 Hz
- Ring buffer: 1800 samples (30 min)
- Mask out seconds flagged by `BODY_SHAKE` detector (V4 cross-module hook)
- Output: `std(odba) / mean(odba)` or `NAN` if <50% of seconds are valid

Module: `firmware/collar/main/sensors/activity_variability.{h,c}`.

## TAG — tremor_detected

- 2nd-order IIR Butterworth bandpass 8–15 Hz @ 50 Hz IMU sample rate
- Hard-coded biquad coefficients (no runtime design)
- 1-second RMS window on the filtered signal
- Boolean latches `true` only after the RMS exceeds threshold for **3
  consecutive seconds** (debounce)

Module: `firmware/collar/main/sensors/tremor_detector.{h,c}`.

As with MAT features, implemented computation and synthetic/software testing are not equivalent to physical or scientific validation of the published observable.

## Backend detection of v6 capability

`devices` table carries `firmware_major / minor / patch` plus
`supports_v6_features` (boolean, derived at registration). Backend must not
request v6 observables from devices reporting `firmware_major < 6`.

## Versioning policy

- Additive fields → minor version bump
- Field semantics change → major version bump
- v6.x.x requires backend migration `0004_v6_additions.sql`
