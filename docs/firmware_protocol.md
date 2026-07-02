# Firmware Protocol — v6

Firmware version: **6.0.0** (`firmware/FIRMWARE_VERSION.h`).

v6 adds three sensor-side computations and three new fields in the uplink
`FeatureVector`. No wire-format breaking changes beyond the additive fields.

## FeatureVector additions (v6)

| Field | Type | Source | Null meaning |
|---|---|---|---|
| `rr_variability` | `number \| null` | MAT — PVDF IBI CV over 60 s | <30 valid IBIs |
| `activity_variability` | `number \| null` | TAG — ODBA CV over 30 min | <50% valid seconds |
| `tremor_detected` | `boolean` | TAG — 8–15 Hz bandpass | false when below threshold |
| `lateral_acc_rms` | `number \| null` | TAG — lateral RMS over 1 s | TAG not reporting |
| `gyro_std_deg_s` | `number \| null` | TAG — gyro std over 1 s | TAG not reporting |

`null` means "no valid observation"; firmware never substitutes zero.

## MAT — rr_variability

- Source: PVDF piezo chest strap
- IBI buffer: 60 s rolling ring
- Reject IBI outside `[0.3, 10.0] s`
- Return `NAN` if fewer than 30 valid IBIs in the window
- Output: `std(ibi) / mean(ibi)`

Module: `firmware/mat/main/sensors/rr_variability.{h,c}`.

> **Known fix-up**: `#define RR_IBI_WINDOW_MS` should sit at the top of
> `rr_variability.c` (or move to the header) — it is currently declared below
> its first use inside `collect_window()`. Move it before the first reference.

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

## Backend detection of v6 capability

`devices` table carries `firmware_major / minor / patch` plus
`supports_v6_features` (boolean, derived at registration). Backend must not
request v6 observables from devices reporting `firmware_major < 6`.

## Versioning policy

- Additive fields → minor version bump
- Field semantics change → major version bump
- v6.x.x requires backend migration `0004_v6_additions.sql`
