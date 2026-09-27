/*
 * EMOPET TAG GATT peripheral scaffold.
 *
 * Device Trust remains #66. GATT connection and CRC-valid payloads are not
 * physical-device authentication.
 */

#pragma once

#include <stdint.h>

#include "activity_feature_summary.h"

#ifdef __cplusplus
extern "C" {
#endif

int emopet_gatt_init(void);
int emopet_gatt_start_advertising(void);

/**
 * Build the canonical 27-byte activity feature frame from the firmware
 * serializer and notify subscribed central(s).
 *
 * Boot-session/sequence/window-end are device-local transport provenance only,
 * never security identity or UTC authority.
 */
int emopet_gatt_publish_activity_variability(
    activity_variability_snapshot_t snapshot,
    tag_feature_quality_t quality
);

#ifdef __cplusplus
}
#endif
