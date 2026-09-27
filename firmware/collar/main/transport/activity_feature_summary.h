/*
 * activity_feature_summary.h — TAG firmware writer for the canonical
 * activity_variability feature-summary transport frame.
 *
 * This module serializes the device-local physical feature only.
 * It does not own BLE GATT notification, mobile forwarding, wall-clock mapping,
 * physical-device authentication, or latent ELI interpretation.
 */

#pragma once

#include <stddef.h>
#include <stdint.h>

#include "../sensors/activity_variability.h"

#ifdef __cplusplus
extern "C" {
#endif

#define TAG_FEATURE_SUMMARY_FRAME_SIZE 27u

typedef enum {
    TAG_FEATURE_QUALITY_VALID = 0,
    TAG_FEATURE_QUALITY_DEGRADED = 1,
    TAG_FEATURE_QUALITY_SUPPRESSED = 2,
} tag_feature_quality_t;

typedef struct {
    uint16_t sequence;
    uint32_t boot_session_id;
    uint32_t window_end_ms;
    activity_variability_snapshot_t observation;
    tag_feature_quality_t quality;
} tag_activity_feature_summary_input_t;

typedef enum {
    TAG_FEATURE_SUMMARY_OK = 0,
    TAG_FEATURE_SUMMARY_INVALID_ARGUMENT = 1,
    TAG_FEATURE_SUMMARY_INVALID_SEMANTICS = 2,
} tag_feature_summary_result_t;

/**
 * Serialize one activity_variability feature-summary frame.
 *
 * Multi-byte values and float32 are little-endian.
 * CRC is XOR of bytes [0, 26), matching packages/ble-protocol.
 */
tag_feature_summary_result_t tag_feature_summary_encode_activity_variability(
    const tag_activity_feature_summary_input_t *input,
    uint8_t *out,
    size_t out_len
);

#ifdef __cplusplus
}
#endif
