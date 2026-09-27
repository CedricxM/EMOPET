/*
 * EMOPET TAG GATT peripheral scaffold for nRF Connect SDK / Zephyr.
 *
 * This source establishes protocol wiring only. The MS88SF3 production board
 * definition, target flashing, physical-device authentication and real radio
 * evidence remain open under #625/#66.
 */

#include "emopet_gatt.h"
#include "emopet_ble_ids.h"
#include "device_clock_sample.h"

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
static struct bt_uuid_128 emopet_clock_sample_uuid =
    BT_UUID_INIT_128(BT_UUID_EMOPET_CLOCK_SAMPLE_VAL);

static bool feature_notify_enabled;
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

static ssize_t read_clock_sample(
    struct bt_conn *conn,
    const struct bt_gatt_attr *attr,
    void *buf,
    uint16_t len,
    uint16_t offset
)
{
    uint8_t frame[TAG_DEVICE_CLOCK_SAMPLE_FRAME_SIZE];

    if (tag_device_clock_sample_encode(
            boot_session_id,
            k_uptime_get_32(),
            frame,
            sizeof(frame)
        ) != TAG_DEVICE_CLOCK_SAMPLE_OK) {
        return BT_GATT_ERR(BT_ATT_ERR_UNLIKELY);
    }

    return bt_gatt_attr_read(
        conn,
        attr,
        buf,
        len,
        offset,
        frame,
        sizeof(frame)
    );
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
        &emopet_clock_sample_uuid.uuid,
        BT_GATT_CHRC_READ,
        BT_GATT_PERM_READ,
        read_clock_sample,
        NULL,
        NULL
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
