/*
 * EMOPET TAG GATT peripheral scaffold for nRF Connect SDK / Zephyr.
 *
 * This source establishes protocol wiring only. The MS88SF3 production board
 * definition, target flashing, physical-device authentication and real radio
 * evidence remain open under #625/#66.
 */

#include "emopet_gatt.h"
#include "emopet_ble_ids.h"
#include "clock_anchor_transport.h"

#include <errno.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#include <zephyr/bluetooth/bluetooth.h>
#include <zephyr/bluetooth/gatt.h>
#include <zephyr/kernel.h>
#include <zephyr/random/random.h>
#include <zephyr/sys/util.h>

static struct bt_uuid_128 emopet_service_uuid =
    BT_UUID_INIT_128(BT_UUID_EMOPET_SERVICE_VAL);
static struct bt_uuid_128 emopet_sensor_frame_uuid =
    BT_UUID_INIT_128(BT_UUID_EMOPET_SENSOR_FRAME_VAL);
static struct bt_uuid_128 emopet_feature_summary_uuid =
    BT_UUID_INIT_128(BT_UUID_EMOPET_FEATURE_SUMMARY_VAL);
static struct bt_uuid_128 emopet_config_uuid =
    BT_UUID_INIT_128(BT_UUID_EMOPET_CONFIG_VAL);

static bool feature_notify_enabled;
static bool config_notify_enabled;
static uint32_t boot_session_id;
static uint16_t feature_sequence;

static void feature_ccc_changed(
    const struct bt_gatt_attr *attr,
    uint16_t value
)
{
    ARG_UNUSED(attr);
    feature_notify_enabled = (value == BT_GATT_CCC_NOTIFY);
}

static void config_ccc_changed(
    const struct bt_gatt_attr *attr,
    uint16_t value
)
{
    ARG_UNUSED(attr);
    config_notify_enabled = (value == BT_GATT_CCC_NOTIFY);
}

static ssize_t config_write(
    struct bt_conn *conn,
    const struct bt_gatt_attr *attr,
    const void *buf,
    uint16_t len,
    uint16_t offset,
    uint8_t flags
)
{
    ARG_UNUSED(conn);
    ARG_UNUSED(attr);
    ARG_UNUSED(flags);

    if (offset != 0u) {
        return BT_GATT_ERR(BT_ATT_ERR_INVALID_OFFSET);
    }
    if (len != TAG_CLOCK_ANCHOR_REQUEST_SIZE) {
        return BT_GATT_ERR(BT_ATT_ERR_INVALID_ATTRIBUTE_LEN);
    }
    if (!config_notify_enabled) {
        return BT_GATT_ERR(BT_ATT_ERR_WRITE_NOT_PERMITTED);
    }

    uint32_t request_nonce = 0u;
    const tag_clock_anchor_result_t parsed = tag_clock_anchor_parse_request(
        (const uint8_t *)buf,
        len,
        &request_nonce
    );
    if (parsed != TAG_CLOCK_ANCHOR_OK) {
        return BT_GATT_ERR(BT_ATT_ERR_VALUE_NOT_ALLOWED);
    }

    uint8_t response[TAG_CLOCK_ANCHOR_RESPONSE_SIZE];
    const uint32_t device_ms = k_uptime_get_32();
    const tag_clock_anchor_result_t encoded = tag_clock_anchor_encode_response(
        request_nonce,
        boot_session_id,
        device_ms,
        response,
        sizeof(response)
    );
    if (encoded != TAG_CLOCK_ANCHOR_OK) {
        return BT_GATT_ERR(BT_ATT_ERR_UNLIKELY);
    }

    const int notify_err = bt_gatt_notify_uuid(
        NULL,
        &emopet_config_uuid.uuid,
        &emopet_svc.attrs[0],
        response,
        sizeof(response)
    );
    if (notify_err != 0) {
        return BT_GATT_ERR(BT_ATT_ERR_UNLIKELY);
    }

    return (ssize_t)len;
}

/*
 * SensorFrame remains registered for protocol continuity, but this scaffold
 * deliberately does not invent a new TAG SensorFrame serializer.
 */
BT_GATT_SERVICE_DEFINE(
    emopet_svc,
    BT_GATT_PRIMARY_SERVICE(&emopet_service_uuid.uuid),

    BT_GATT_CHARACTERISTIC(
        &emopet_sensor_frame_uuid.uuid,
        BT_GATT_CHRC_NOTIFY,
        BT_GATT_PERM_NONE,
        NULL,
        NULL,
        NULL
    ),
    BT_GATT_CCC(NULL, BT_GATT_PERM_READ | BT_GATT_PERM_WRITE),

    BT_GATT_CHARACTERISTIC(
        &emopet_feature_summary_uuid.uuid,
        BT_GATT_CHRC_NOTIFY,
        BT_GATT_PERM_NONE,
        NULL,
        NULL,
        NULL
    ),
    BT_GATT_CCC(
        feature_ccc_changed,
        BT_GATT_PERM_READ | BT_GATT_PERM_WRITE
    ),

    BT_GATT_CHARACTERISTIC(
        &emopet_config_uuid.uuid,
        BT_GATT_CHRC_WRITE | BT_GATT_CHRC_NOTIFY,
        BT_GATT_PERM_WRITE,
        NULL,
        config_write,
        NULL
    ),
    BT_GATT_CCC(
        config_ccc_changed,
        BT_GATT_PERM_READ | BT_GATT_PERM_WRITE
    )
);

static const struct bt_data adv_data[] = {
    BT_DATA_BYTES(
        BT_DATA_FLAGS,
        BT_LE_AD_GENERAL | BT_LE_AD_NO_BREDR
    ),
    BT_DATA_BYTES(
        BT_DATA_UUID128_ALL,
        BT_UUID_EMOPET_SERVICE_VAL
    ),
};

static const struct bt_data scan_response[] = {
    BT_DATA(
        BT_DATA_NAME_COMPLETE,
        CONFIG_BT_DEVICE_NAME,
        sizeof(CONFIG_BT_DEVICE_NAME) - 1
    ),
};

int emopet_gatt_init(void)
{
    int err = bt_enable(NULL);
    if (err != 0) {
        return err;
    }

    /*
     * Replay/session discriminator only.
     * This is intentionally non-cryptographic and must never be used as
     * Device Trust, key material, nonce authority or proof of possession.
     */
    boot_session_id = sys_rand32_get();
    feature_sequence = 0;
    feature_notify_enabled = false;
    config_notify_enabled = false;

    return 0;
}

int emopet_gatt_start_advertising(void)
{
    return bt_le_adv_start(
        BT_LE_ADV_CONN_FAST_1,
        adv_data,
        ARRAY_SIZE(adv_data),
        scan_response,
        ARRAY_SIZE(scan_response)
    );
}

int emopet_gatt_publish_activity_variability(
    activity_variability_snapshot_t snapshot,
    tag_feature_quality_t quality,
    uint32_t window_end_ms
)
{
    uint8_t frame[TAG_FEATURE_SUMMARY_FRAME_SIZE];

    if (!feature_notify_enabled) {
        return -EAGAIN;
    }

    const tag_activity_feature_summary_input_t input = {
        .sequence = feature_sequence,
        .boot_session_id = boot_session_id,
        .window_end_ms = window_end_ms,
        .observation = snapshot,
        .quality = quality,
    };

    const tag_feature_summary_result_t encoded =
        tag_feature_summary_encode_activity_variability(
            &input,
            frame,
            sizeof(frame)
        );

    if (encoded != TAG_FEATURE_SUMMARY_OK) {
        return -EINVAL;
    }

    const int err = bt_gatt_notify_uuid(
        NULL,
        &emopet_feature_summary_uuid.uuid,
        &emopet_svc.attrs[0],
        frame,
        sizeof(frame)
    );

    if (err == 0) {
        feature_sequence++;
    }

    return err;
}
