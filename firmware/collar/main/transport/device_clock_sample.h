/*
 * device_clock_sample.h — canonical TAG boot-session + monotonic clock sample.
 *
 * Wire contract for BOOT_ANCHOR_V1 capture. The frame contains no UTC.
 */

#pragma once

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

#define TAG_DEVICE_CLOCK_SAMPLE_FRAME_SIZE 11u

typedef enum {
    TAG_DEVICE_CLOCK_SAMPLE_OK = 0,
    TAG_DEVICE_CLOCK_SAMPLE_INVALID_ARGUMENT = 1,
} tag_device_clock_sample_result_t;

tag_device_clock_sample_result_t tag_device_clock_sample_encode(
    uint32_t boot_session_id,
    uint32_t device_ms,
    uint8_t *out,
    size_t out_len
);

#ifdef __cplusplus
}
#endif
