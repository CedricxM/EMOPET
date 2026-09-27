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
 * The caller owns boot_session_id, sequence and the real monotonic window end.
 * The GATT layer must not replace measurement time with notification time.
 */
int emopet_gatt_publish_activity_variability(
    const tag_activity_feature_summary_input_t *input
);

#ifdef __cplusplus
}
#endif
