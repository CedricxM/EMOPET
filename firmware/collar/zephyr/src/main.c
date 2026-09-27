/*
 * EMOPET TAG G1 platform bootstrap.
 *
 * This proves the selected nRF Connect SDK / Zephyr application shape and
 * Bluetooth peripheral stack initialization only.
 *
 * Intentionally absent until later #625 gates:
 * - EMOPET GATT service/characteristics;
 * - feature-summary notifications;
 * - production MS88SF3 board definition;
 * - boot-session/time authority;
 * - Device Trust.
 */

#include <zephyr/bluetooth/bluetooth.h>
#include <zephyr/logging/log.h>

LOG_MODULE_REGISTER(emopet_tag, LOG_LEVEL_INF);

int main(void)
{
    const int err = bt_enable(NULL);

    if (err != 0) {
        LOG_ERR("Bluetooth init failed: %d", err);
        return err;
    }

    LOG_INF("EMOPET TAG G1 Bluetooth platform bootstrap ready");
    return 0;
}
