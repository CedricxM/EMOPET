/**
 * BLE command payload definitions.
 *
 * SECURITY BOUNDARY (#66):
 * These helpers build legacy/raw command BYTES only. They do not authenticate
 * the caller, bind a command to a canonical device principal, provide freshness,
 * anti-replay, authorization, signature verification, or an OTA/device-trust
 * receipt. Raw builders MUST NOT be treated as Product command authority.
 *
 * A future trusted command path must wrap/replace these payloads under the
 * controlled Device Trust contract before any protected command reaches
 * firmware.
 */
 
export const RAW_BLE_COMMAND_AUTHORITY = 'UNAUTHENTICATED_PAYLOAD_ONLY' as const;

// ── Command IDs ─────────────────────────────────────────────────

export const CMD_SET_NOTIFICATION_INTERVAL = 0x10;
export const CMD_REQUEST_CALIBRATION = 0x11;
export const CMD_SET_GPS_MODE = 0x12;
export const CMD_SET_GEOFENCE = 0x13;
export const CMD_FACTORY_RESET = 0xfe;

export type CommandId =
  | typeof CMD_SET_NOTIFICATION_INTERVAL
  | typeof CMD_REQUEST_CALIBRATION
  | typeof CMD_SET_GPS_MODE
  | typeof CMD_SET_GEOFENCE
  | typeof CMD_FACTORY_RESET;

// ── GPS Modes ───────────────────────────────────────────────────

export const GPS_MODE_OFF = 0x00;
export const GPS_MODE_TRACKING = 0x01;
export const GPS_MODE_GEOFENCE = 0x02;

export type GpsMode =
  | typeof GPS_MODE_OFF
  | typeof GPS_MODE_TRACKING
  | typeof GPS_MODE_GEOFENCE;

// ── Command Builders ────────────────────────────────────────────

/**
 * Build a command to change the BLE notification interval.
 * @param intervalMs Interval in milliseconds (uint16, 1000–60000).
 */
export function buildSetNotificationInterval(intervalMs: number): Uint8Array {
  const buf = new Uint8Array(3);
  const view = new DataView(buf.buffer);
  view.setUint8(0, CMD_SET_NOTIFICATION_INTERVAL);
  view.setUint16(1, Math.min(60000, Math.max(1000, intervalMs)), true);
  return buf;
}

/**
 * Request a sensor calibration cycle (tare load cells, reset baselines).
 */
export function buildRequestCalibration(): Uint8Array {
  return new Uint8Array([CMD_REQUEST_CALIBRATION]);
}

/**
 * Set GPS operating mode.
 */
export function buildSetGpsMode(mode: GpsMode): Uint8Array {
  return new Uint8Array([CMD_SET_GPS_MODE, mode]);
}

/**
 * Set geofence parameters.
 * @param latE6 Center latitude × 1e6.
 * @param lonE6 Center longitude × 1e6.
 * @param radiusM Radius in meters (uint16).
 */
export function buildSetGeofence(latE6: number, lonE6: number, radiusM: number): Uint8Array {
  const buf = new Uint8Array(11);
  const view = new DataView(buf.buffer);
  view.setUint8(0, CMD_SET_GEOFENCE);
  view.setInt32(1, latE6, true);
  view.setInt32(5, lonE6, true);
  view.setUint16(9, Math.min(65535, Math.max(0, radiusM)), true);
  return buf;
}

/**
 * Legacy factory-reset payload.
 *
 * 0xDE 0xAD is only a payload confirmation marker. It is NOT authentication,
 * authorization, proof of possession, anti-replay, or recovery authority.
 * Product use remains blocked by Device Trust #66.
 */
export function buildFactoryReset(): Uint8Array {
  return new Uint8Array([CMD_FACTORY_RESET, 0xde, 0xad]);
}
