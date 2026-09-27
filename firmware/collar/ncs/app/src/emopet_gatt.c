/*
 * EMOPET TAG GATT service — #625 G3 candidate.
 *
 * Scope:
 * - proprietary UUID service authority;
 * - SensorFrame characteristic registration;
 * - feature-summary characteristic registration + notify;
 * - canonical #623 serializer reuse.
 *
 * Out of scope:
 * - Device Trust (#66);
 * - command/claim authorization;
 * - secure boot / signed OTA;
 * - production MS88SF3 board definition;
 * - latent ELI semantics.
 */

#include "emopet_gatt.h"

#include <errno.h>
#include <stddef.h>
#include <stdint.h>

#include <zephyr/bluetooth/gatt.h>
#include <zephyr/logging/log.h>
#include <zephyr/sys/util.h>

LOG_MODULE_REGISTER(emopet_gatt, LOG_LEVEL_INF);

static bool sensor_notifications_enabled;
static bool feature_notifications_enabled;

static void sensor_ccc_changed(
    const struct bt_gatt_attr *attr,
    uint16_t value
)
{
    ARG_UNUSED(attr);
    sensor_notifications_enabled = (value == BT_GATT_CCC_NOTIFY);
    LOG_INF("SensorFrame notifications %s",
            sensor_notifications_enabled ? "enabled" : "disabled");
}

static void feature_ccc_changed(
    const struct bt_gatt_attr *attr,
    uint16_t value
)
{
    ARG_UNUSED(attr);
    feature_notifications_enabled = (value == BT_GATT_CCC_NOTIFY);
    LOG_INF("Feature-summary notifications %s",
            feature_notifications_enabled ? "enabled" : "disabled");
}

BT_GATT_SERVICE_DEFINE(
    emopet_svc,
    BT_GATT_PRIMARY_SERVICE(EMOPET_BT_UUID_SERVICE),

    BT_GATT_CHARACTERISTIC(
        EMOPET_BT_UUID_SENSOR_FRAME,
        BT_GATT_CHRC_NOTIFY,
        BT_GATT_PERM_NONE,
        NULL,
        NULL,
        NULL
    ),
    BT_GATT_CCC(
        sensor_ccc_changed,
        BT_GATT_PERM_READ | BT_GATT_PERM_WRITE
    ),

    BT_GATT_CHARACTERISTIC(
        EMOPET_BT_UUID_FEATURE_SUMMARY,
        BT_GATT_CHRC_NOTIFY,
        BT_GATT_PERM_NONE,
        NULL,
        NULL,
        NULL
    ),
    BT_GATT_CCC(
        feature_ccc_changed,
        BT_GATT_PERM_READ | BT_GATT_PERM_WRITE
    )
);

enum emopet_gatt_attr_index {
    EMOPET_ATTR_SERVICE = 0,
    EMOPET_ATTR_SENSOR_DECL = 1,
    EMOPET_ATTR_SENSOR_VALUE = 2,
    EMOPET_ATTR_SENSOR_CCC = 3,
    EMOPET_ATTR_FEATURE_DECL = 4,
    EMOPET_ATTR_FEATURE_VALUE = 5,
    EMOPET_ATTR_FEATURE_CCC = 6,
};

bool emopet_gatt_feature_notifications_enabled(void)
{
    return feature_notifications_enabled;
}

int emopet_gatt_notify_activity_variability(
    const tag_activity_feature_summary_input_t *input
)
{
    uint8_t frame[TAG_FEATURE_SUMMARY_FRAME_SIZE];

    if (input == NULL) {
        return -EINVAL;
    }
    if (!feature_notifications_enabled) {
        return -EACCES;
    }

    const tag_feature_summary_result_t encoded =
        tag_feature_summary_encode_activity_variability(
            input,
            frame,
            sizeof(frame)
        );

    if (encoded != TAG_FEATURE_SUMMARY_OK) {
        return -EINVAL;
    }

    return bt_gatt_notify(
        NULL,
        &emopet_svc.attrs[EMOPET_ATTR_FEATURE_VALUE],
        frame,
        sizeof(frame)
    );
}
