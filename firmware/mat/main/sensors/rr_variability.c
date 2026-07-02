/*
 * rr_variability.c — ring buffer of IBI values, std computation.
 *
 * Not interrupt-safe; call from the RR detector task only.
 */

#include "rr_variability.h"
#include <string.h>

/* 300s at ~60 breaths/min ceiling = 300 samples worst case.
 * Allocate 512 for headroom and power-of-two wrap. */
#define RR_IBI_CAPACITY 512

#define RR_IBI_WINDOW_MS ((uint64_t)(RR_IBI_BUFFER_WINDOW_SEC) * 1000ULL)

typedef struct {
    float    ibi;
    uint64_t ts_ms;
} rr_ibi_sample_t;

static rr_ibi_sample_t s_buffer[RR_IBI_CAPACITY];
static uint32_t s_head = 0;
static uint32_t s_count = 0;

void rr_variability_init(void)
{
    memset(s_buffer, 0, sizeof(s_buffer));
    s_head = 0;
    s_count = 0;
}

void rr_variability_push_ibi(float ibi_sec, uint64_t now_ms)
{
    if (ibi_sec < RR_IBI_MIN_SEC || ibi_sec > RR_IBI_MAX_SEC) {
        return;  /* reject artifact */
    }
    s_buffer[s_head].ibi   = ibi_sec;
    s_buffer[s_head].ts_ms = now_ms;
    s_head = (s_head + 1) & (RR_IBI_CAPACITY - 1);
    if (s_count < RR_IBI_CAPACITY) s_count++;
}

static uint32_t collect_window(uint64_t now_ms, float *out, uint32_t out_cap)
{
    const uint64_t cutoff = (now_ms > (uint64_t)RR_IBI_WINDOW_MS)
                          ? now_ms - (uint64_t)RR_IBI_WINDOW_MS : 0;
    uint32_t n = 0;
    for (uint32_t i = 0; i < s_count && n < out_cap; ++i) {
        uint32_t idx = (s_head + RR_IBI_CAPACITY - 1 - i) & (RR_IBI_CAPACITY - 1);
        if (s_buffer[idx].ts_ms < cutoff) break;
        out[n++] = s_buffer[idx].ibi;
    }
    return n;
}

uint32_t rr_variability_valid_count(uint64_t now_ms)
{
    float tmp[RR_IBI_CAPACITY];
    return collect_window(now_ms, tmp, RR_IBI_CAPACITY);
}

float rr_variability_compute(uint64_t now_ms)
{
    float samples[RR_IBI_CAPACITY];
    uint32_t n = collect_window(now_ms, samples, RR_IBI_CAPACITY);
    if (n < RR_IBI_MIN_COUNT) return NAN;

    double sum = 0.0;
    for (uint32_t i = 0; i < n; ++i) sum += samples[i];
    double mean = sum / (double)n;

    double var = 0.0;
    for (uint32_t i = 0; i < n; ++i) {
        double d = (double)samples[i] - mean;
        var += d * d;
    }
    var /= (double)(n - 1);
    return (float)sqrt(var);
}
