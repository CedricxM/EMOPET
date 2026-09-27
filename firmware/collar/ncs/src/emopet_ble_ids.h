/*
 * Controlled EMOPET proprietary 128-bit GATT UUIDs.
 *
 * Authority: config/ble/uuid-authority-v1.json
 * Do not replace with Bluetooth Base UUID aliases.
 */

#pragma once

#include <zephyr/bluetooth/uuid.h>

#define BT_UUID_EMOPET_SERVICE_VAL \
    BT_UUID_128_ENCODE(0xe4e2e9a3, 0x39c8, 0x4140, 0xaba9, 0xc4e37713f59a)

#define BT_UUID_EMOPET_SENSOR_FRAME_VAL \
    BT_UUID_128_ENCODE(0x66ae0c98, 0xa8ce, 0x4319, 0xb47d, 0xf09fa88d4d83)

#define BT_UUID_EMOPET_FEATURE_SUMMARY_VAL \
    BT_UUID_128_ENCODE(0x01141d55, 0xa776, 0x4091, 0xb068, 0x83f0804d8781)
