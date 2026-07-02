/*
 * Single source of truth for MAT and TAG firmware version reported to the
 * backend via BLE protocol and to the mobile app via the devices table.
 *
 * v6.0.0 bumps signal the presence of:
 *   - rr_variability on MAT (PVDF)
 *   - activity_variability on TAG (IMU ODBA)
 *   - tremor_detected on TAG (IMU 8-15 Hz)
 *   - kinematic features required by V11 (lateral_acc_rms, gyro_std)
 *
 * Backend reads firmware_major/minor/patch from the devices table and
 * toggles supports_v6_features accordingly (migration 0004).
 */
#pragma once

#define EMOPET_FIRMWARE_MAJOR 6
#define EMOPET_FIRMWARE_MINOR 0
#define EMOPET_FIRMWARE_PATCH 0
#define EMOPET_FIRMWARE_STRING "6.0.0"
