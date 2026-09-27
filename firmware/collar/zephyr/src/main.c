/*
 * EMOPET TAG nRF Connect SDK / Zephyr peripheral scaffold.
 *
 * Platform authority: config/firmware/tag-platform-authority-v1.json
 * Compile harness: nRF52840 DK only.
 * Production MS88SF3 board authority remains OPEN under #625.
 */

#include "emopet_gatt.h"

#include <zephyr/kernel.h>
#include <zephyr/logging/log.h>

#include "activity_variability.h"

LOG_MODULE_REGISTER(emopet_tag, LOG_LEVEL_INF);

int main(void)
{
    int err;

    activity_variability_init();

    err = emopet_gatt_init();
    if (err != 0) {
        LOG_ERR("Bluetooth init failed: %d", err);
        return err;
    }

    err = emopet_gatt_start_advertising();
    if (err != 0) {
        LOG_ERR("Advertising start failed: %d", err);
        return err;
    }

    LOG_INF("EMOPET TAG BLE peripheral scaffold ready");

    /*
     * No synthetic feature emission here.
     *
     * A future real IMU feature task may call
     * emopet_gatt_publish_activity_variability() only after it owns a real
     * activity_variability_snapshot_t and quality state.
     */
    while (true) {
        k_sleep(K_SECONDS(60));
    }

    return 0;
}
