/*
 * tremor_detector.h — v6 addition for TAG firmware.
 *
 * Detects physiological tremor via 8–15 Hz bandpass RMS on the IMU
 * 3-axis accelerometer (50 Hz sample rate). Flag goes true when RMS
 * exceeds 0.08 g for at least 3 consecutive seconds.
 *
 * Reference: BSAVA Small Animal Neurology Ch.15 — physiological tremor
 * band for canines matches the human 8–15 Hz range.
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

#define TREMOR_RMS_THRESHOLD_G   0.08f
#define TREMOR_MIN_DURATION_S    3
#define TREMOR_BANDPASS_LOW_HZ   8.0f
#define TREMOR_BANDPASS_HIGH_HZ  15.0f
#define TREMOR_SAMPLE_RATE_HZ    50

/** Initialize the bandpass filter state and counters. */
void tremor_detector_init(void);

/**
 * Feed one 3-axis accelerometer sample (g units). Updates the internal
 * bandpass state and the consecutive-seconds counter.
 */
void tremor_detector_push_sample(float ax, float ay, float az);

/** Call once per second to update the "detected" latch. */
void tremor_detector_tick_1hz(void);

/** Returns true if tremor has been sustained for >= TREMOR_MIN_DURATION_S. */
bool tremor_detector_active(void);

#ifdef __cplusplus
}
#endif
