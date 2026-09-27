/*
 * EMOPET TAG GATT peripheral boundary — #625.
 *
 * UUID values are controlled by config/ble/uuid-authority-v1.json.
 * A connected/CRC-valid BLE peer is NOT physical-device trust; #66 remains
 * authoritative for credentials, proof-of-possession and command trust.
 */

#pragma once

#include <stdbool.h>

#include <zephyr/bluetooth/uuid.h>

#include "activity_feature_summary.h"

#ifdef __cplusplus
extern "C" {
#endif

#define EMOPET_BT_UUID_SERVICE_VAL \
    BT_UUID_128_ENCODE(0xe4e2e9a3, 0x39c8, 0x4140, 0xaba9, 0xc4e37713f59a)
#define EMOPET_BT_UUID_SENSOR_FRAME_VAL \
    BT_UUID_128_ENCODE(0x66ae0c98, 0xa8ce, 0x4319, 0xb47d, 0xf09fa88d4d83)
#define EMOPET_BT_UUID_FEATURE_SUMMARY_VAL \
    BT_UUID_128_ENCODE(0x01141d55, 0xa776, 0x4091, 0xb068, 0x83f0804d8781)

#define EMOPET_BT_UUID_SERVICE \
    BT_UUID_DECLARE_128(EMOPET_BT_UUID_SERVICE_VAL)
#define EMOPET_BT_UUID_SENSOR_FRAME \
    BT_UUID_DECLARE_128(EMOPET_BT_UUID_SENSOR_FRAME_VAL)
#define EMOPET_BT_UUID_FEATURE_SUMMARY \
    BT_UUID_DECLARE_128(EMOPET_BT_UUID_FEATURE_SUMMARY_VAL)

/**
 * True when at least one central has enabled notifications for the bounded
 * feature-summary characteristic.
 *
 * P0 supports one connection only. Multi-peer CCC authority is deferred.
 */
bool emopet_gatt_feature_notifications_enabled(void);

/**
 * Encode through the canonical #623 C serializer and notify the controlled
 * feature-summary characteristic.
 *
 * The caller owns boot_session_id, sequence and monotonic window_end_ms.
 * This function does not invent those authorities.
 */
int emopet_gatt_notify_activity_variability(
    const tag_activity_feature_summary_input_t *input
);

#ifdef __cplusplus
}
#endif
