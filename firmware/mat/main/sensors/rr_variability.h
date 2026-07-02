/*
 * rr_variability.h — v6 addition for MAT firmware.
 *
 * Maintains a rolling 5-minute buffer of inter-breath intervals (IBI)
 * produced by the existing RR peak detector on the PVDF signal. Exposes
 * the std of IBI as feature rr_variability. NaN when <30 valid breaths
 * are in the buffer.
 *
 * Reference: Homma & Masaoka (2008) Exp Physiol — expiratory-time
 * variability tracks individual anxiety independently of O2 demand.
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>
#include <math.h>   /* NAN */

#ifdef __cplusplus
extern "C" {
#endif

#define RR_IBI_BUFFER_WINDOW_SEC 300  /* 5 min */
#define RR_IBI_MIN_COUNT         30
#define RR_IBI_MIN_SEC           0.3f
#define RR_IBI_MAX_SEC           10.0f

/** Initialize the IBI buffer. Call once at boot. */
void rr_variability_init(void);

/**
 * Push a new IBI (seconds) after the peak detector confirms a breath.
 * Values outside [RR_IBI_MIN_SEC, RR_IBI_MAX_SEC] are rejected as
 * artifacts and not stored.
 */
void rr_variability_push_ibi(float ibi_sec, uint64_t now_ms);

/**
 * Compute the std of IBI over the 5-minute window ending at now_ms.
 * Returns NAN if fewer than RR_IBI_MIN_COUNT valid samples are in the
 * buffer. This value is placed in FeatureVector.rr_variability.
 */
float rr_variability_compute(uint64_t now_ms);

/** For diagnostics only. */
uint32_t rr_variability_valid_count(uint64_t now_ms);

#ifdef __cplusplus
}
#endif
