/*
 * EMOPET TAG P0 NCS/Zephyr entry point — #625.
 *
 * Current target is a compile harness only. Do not treat
 * nrf52840dk/nrf52840 as the production MS88SF3 board definition.
 */

#include <zephyr/bluetooth/bluetooth.h>
#include <zephyr/kernel.h>
#include <zephyr/logging/log.h>
#include <zephyr/sys/util.h>

#include "emopet_gatt.h"

LOG_MODULE_REGISTER(emopet_tag, LOG_LEVEL_INF);

static const struct bt_data advertising_data[] = {
    BT_DATA_BYTES(
        BT_DATA_FLAGS,
        BT_LE_AD_GENERAL | BT_LE_AD_NO_BREDR
    ),
    BT_DATA_BYTES(
        BT_DATA_UUID128_ALL,
        EMOPET_BT_UUID_SERVICE_VAL
    ),
};

int main(void)
{
    int err = bt_enable(NULL);
    if (err != 0) {
        LOG_ERR("Bluetooth enable failed: %d", err);
        return err;
    }

    err = bt_le_adv_start(
        BT_LE_ADV_CONN_FAST_1,
        advertising_data,
        ARRAY_SIZE(advertising_data),
        NULL,
        0
    );
    if (err != 0) {
        LOG_ERR("Advertising start failed: %d", err);
        return err;
    }

    LOG_INF("EMOPET TAG P0 BLE peripheral started");

    for (;;) {
        k_sleep(K_SECONDS(60));
    }

    return 0;
}
