/*
 * activity_variability.h — v6 addition for TAG (collar) firmware.
 *
 * Maintains a 30-minute buffer of 1-second ODBA values. Exposes the
 * coefficient of variation (std/mean) as feature activity_variability.
 * NaN when <50% of the window is valid (after BODY_SHAKE suppression).
 *
 * Reference: Robert et al. (2009) Computers and Electronics in
 * Agriculture — ODBA as activity intensity proxy in mammals.
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>
#include <math.h>

#ifdef __cplusplus
extern "C" {
#endif

#define ACTIVITY_WINDOW_SEC      1800   /* 30 min */
#define ACTIVITY_MIN_VALID_COUNT 900    /* 50% of 30*60 */

/** Initialize the 1-Hz ODBA buffer. Call once at boot. */
void activity_variability_init(void);

/**
 * Push one 1-second ODBA value. `suppressed` = true means the sample
 * occurred during a BODY_SHAKE event (V4 veto region); it is stored but
 * excluded from mean/std.
 */
void activity_variability_push(float odba_1s, bool suppressed, uint64_t now_ms);

/**
 * Compute coefficient of variation std/mean on non-suppressed samples
 * in the trailing 30-minute window.
 * Returns NAN when valid count < ACTIVITY_MIN_VALID_COUNT or mean < 1e-3.
 */
float activity_variability_compute(uint64_t now_ms);

#ifdef __cplusplus
}
#endif
