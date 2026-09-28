/*
 * activity_variability.c — 1-Hz ODBA ring buffer with BODY_SHAKE mask.
 *
 * Not interrupt-safe; call from the IMU feature-extraction task.
 */

#include "activity_variability.h"
#include <string.h>

#define ODBA_CAPACITY 2048  /* >= 30*60 samples, power of two */

typedef struct {
    float    odba;
    uint64_t ts_ms;
    bool     suppressed;
} odba_sample_t;

static odba_sample_t s_buffer[ODBA_CAPACITY];
static uint32_t s_head = 0;
static uint32_t s_count = 0;

#define ACTIVITY_WINDOW_MS ((uint64_t)ACTIVITY_WINDOW_SEC * 1000ULL)

void activity_variability_init(void)
{
    memset(s_buffer, 0, sizeof(s_buffer));
    s_head = 0;
    s_count = 0;
}

void activity_variability_push(float odba_1s, bool suppressed, uint64_t now_ms)
{
    s_buffer[s_head].odba       = odba_1s;
    s_buffer[s_head].ts_ms      = now_ms;
    s_buffer[s_head].suppressed = suppressed;
    s_head = (s_head + 1) & (ODBA_CAPACITY - 1);
    if (s_count < ODBA_CAPACITY) s_count++;
}

activity_variability_snapshot_t activity_variability_snapshot(uint64_t now_ms)
{
    const uint64_t cutoff = (now_ms > ACTIVITY_WINDOW_MS)
                          ? now_ms - ACTIVITY_WINDOW_MS : 0;

    double sum = 0.0;
    double sum_sq = 0.0;
    uint32_t n = 0;

    for (uint32_t i = 0; i < s_count; ++i) {
        const uint32_t idx =
            (s_head + ODBA_CAPACITY - 1 - i) & (ODBA_CAPACITY - 1);

        /*
         * Canonical 30-minute membership is (now-1800s, now].
         * Excluding the exact lower bound prevents 1801 one-Hz samples from
         * leaking into a contract whose valid_seconds maximum is 1800.
         */
        if (s_buffer[idx].ts_ms <= cutoff) break;
        if (s_buffer[idx].suppressed) continue;

        const double v = (double)s_buffer[idx].odba;
        sum += v;
        sum_sq += v * v;
        n++;
    }

    if (n < ACTIVITY_MIN_VALID_COUNT) {
        return (activity_variability_snapshot_t) {
            .status = ACTIVITY_VARIABILITY_NOT_OBSERVED_INSUFFICIENT_COVERAGE,
            .valid_seconds = (uint16_t)n,
            .value = NAN,
        };
    }

    const double mean = sum / (double)n;
    if (mean < 1e-3) {
        return (activity_variability_snapshot_t) {
            .status = ACTIVITY_VARIABILITY_NOT_OBSERVED_MEAN_BELOW_DIVISION_GUARD,
            .valid_seconds = (uint16_t)n,
            .value = NAN,
        };
    }

    double var = (sum_sq - (double)n * mean * mean) / (double)(n - 1);
    if (var < 0) var = 0;

    return (activity_variability_snapshot_t) {
        .status = ACTIVITY_VARIABILITY_OBSERVED,
        .valid_seconds = (uint16_t)n,
        .value = (float)(sqrt(var) / mean),
    };
}

float activity_variability_compute(uint64_t now_ms)
{
    const activity_variability_snapshot_t snapshot =
        activity_variability_snapshot(now_ms);

    return snapshot.status == ACTIVITY_VARIABILITY_OBSERVED
        ? snapshot.value
        : NAN;
}
