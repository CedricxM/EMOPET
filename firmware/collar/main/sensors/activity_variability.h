/*
 * activity_variability.h — v6 addition for TAG (collar) firmware.
 *
 * Maintains a 30-minute buffer of 1-second ODBA values. Exposes the
 * coefficient of variation (std/mean) as feature activity_variability.
 *
 * The structured snapshot API preserves the exact null reason and valid-second
 * count required by the versioned feature-summary transport contract.
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

typedef enum {
    ACTIVITY_VARIABILITY_OBSERVED = 0,
    ACTIVITY_VARIABILITY_NOT_OBSERVED_INSUFFICIENT_COVERAGE = 1,
    ACTIVITY_VARIABILITY_NOT_OBSERVED_MEAN_BELOW_DIVISION_GUARD = 2,
} activity_variability_status_t;

typedef struct {
    activity_variability_status_t status;
    uint16_t valid_seconds;
    float value;
} activity_variability_snapshot_t;

/** Initialize the 1-Hz ODBA buffer. Call once at boot. */
void activity_variability_init(void);

/**
 * Push one 1-second ODBA value. `suppressed` = true means the sample
 * occurred during a BODY_SHAKE event (V4 veto region); it is stored but
 * excluded from mean/std.
 */
void activity_variability_push(float odba_1s, bool suppressed, uint64_t now_ms);

/**
 * Produce the transport-ready physical observation for the trailing 30-minute
 * window. The lower time bound is exclusive and the upper bound inclusive,
 * yielding at most exactly 1800 one-Hz samples.
 *
 * When status != OBSERVED, value is NAN and the status carries the canonical
 * null reason.
 */
activity_variability_snapshot_t activity_variability_snapshot(uint64_t now_ms);

/**
 * Compatibility helper returning only the numeric feature.
 * Returns NAN whenever the structured snapshot is not OBSERVED.
 */
float activity_variability_compute(uint64_t now_ms);

#ifdef __cplusplus
}
#endif
