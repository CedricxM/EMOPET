/*
 * tremor_detector.c — IIR bandpass (8–15 Hz) + 1-sec RMS + 3s latch.
 *
 * This file contains filter coefficients and DSP wiring. Coefficients
 * assume sample rate 50 Hz; regenerate if sample rate changes.
 *
 * IIR coefficients computed via scipy.signal.butter(2, [8, 15], btype='bandpass', fs=50).
 * (Kept as a second-order section for stability.)
 */

#include "tremor_detector.h"
#include <math.h>
#include <string.h>

/* Butterworth band-pass 8–15 Hz @ 50 Hz, 2nd-order SOS. */
static const float BANDPASS_B[3] = { 0.06873887f, 0.0f, -0.06873887f };
static const float BANDPASS_A[3] = { 1.0f,       -1.6305f,  0.8625f };

typedef struct {
    /* Per-axis delay-line for the 2nd-order IIR. */
    float x1, x2;
    float y1, y2;
} iir2_state_t;

static iir2_state_t s_iir[3];
static float        s_sum_sq;
static uint32_t     s_sample_count_this_sec;
static uint32_t     s_consecutive_seconds;
static bool         s_latched;

static float iir_step(iir2_state_t *st, float x)
{
    float y = BANDPASS_B[0] * x + BANDPASS_B[1] * st->x1 + BANDPASS_B[2] * st->x2
            - BANDPASS_A[1] * st->y1 - BANDPASS_A[2] * st->y2;
    st->x2 = st->x1;
    st->x1 = x;
    st->y2 = st->y1;
    st->y1 = y;
    return y;
}

void tremor_detector_init(void)
{
    memset(s_iir, 0, sizeof(s_iir));
    s_sum_sq = 0.0f;
    s_sample_count_this_sec = 0;
    s_consecutive_seconds = 0;
    s_latched = false;
}

void tremor_detector_push_sample(float ax, float ay, float az)
{
    float bx = iir_step(&s_iir[0], ax);
    float by = iir_step(&s_iir[1], ay);
    float bz = iir_step(&s_iir[2], az);
    s_sum_sq += (bx * bx) + (by * by) + (bz * bz);
    s_sample_count_this_sec++;
}

void tremor_detector_tick_1hz(void)
{
    if (s_sample_count_this_sec == 0) {
        s_consecutive_seconds = 0;
        s_latched = false;
        return;
    }
    float rms = sqrtf(s_sum_sq / (float)s_sample_count_this_sec);
    if (rms > TREMOR_RMS_THRESHOLD_G) {
        s_consecutive_seconds++;
    } else {
        s_consecutive_seconds = 0;
    }
    s_latched = (s_consecutive_seconds >= TREMOR_MIN_DURATION_S);
    s_sum_sq = 0.0f;
    s_sample_count_this_sec = 0;
}

bool tremor_detector_active(void)
{
    return s_latched;
}
