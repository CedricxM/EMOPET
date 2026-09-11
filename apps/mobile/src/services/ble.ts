/**
 * BLE service — connects to EMOPET MAT/TAG devices and parses wire frames.
 *
 * Uses react-native-ble-plx for BLE communication.
 * Raw characteristic bytes are parsed at this boundary. Exact TAG GPS
 * coordinates are deliberately removed before a frame can reach application
 * consumers while the Product V1 location authority remains unavailable.
 */

import { BLE_SERVICE_UUID, BLE_CHAR_SENSOR_FRAME } from '@emopet/shared';
import {
  parseSensorFrame,
  isMatFrame,
  isTagFrame,
  type MatFrame,
  type TagFrame,
  type ParsedBleSensorFrame,
} from '@emopet/ble-protocol';

export type MobileTagFrame = Omit<TagFrame, 'payload'> & {
  payload: Omit<TagFrame['payload'], 'latitudeE6' | 'longitudeE6'>;
};
export type MobileBleSensorFrame = MatFrame | MobileTagFrame;
export type FrameCallback = (frame: MobileBleSensorFrame) => void;

/**
 * Product V1 application boundary for parsed BLE frames.
 *
 * The low-level protocol may carry exact GPS coordinates so firmware can
 * support future location/geofence capabilities. Those coordinates are not
 * currently authorized for the mobile product runtime, so they are discarded
 * before any application callback can observe the frame.
 */
export function minimizeLocationForApp(frame: ParsedBleSensorFrame): MobileBleSensorFrame {
  if (!isTagFrame(frame)) return frame;

  const { latitudeE6, longitudeE6, ...payload } = frame.payload;
  void latitudeE6;
  void longitudeE6;

  return {
    header: frame.header,
    payload,
  };
}

/**
 * Start scanning for EMOPET devices.
 * Returns a stop function.
 */
export function startScan(
  _onDeviceFound: (name: string, macAddress: string) => void,
): () => void {
  // TODO: implement with BleManager from react-native-ble-plx
  // manager.startDeviceScan([BLE_SERVICE_UUID], null, (error, device) => { ... })
  console.log('[BLE] Scan started for service', BLE_SERVICE_UUID);
  return () => {
    console.log('[BLE] Scan stopped');
  };
}

/**
 * Connect to a device and subscribe to location-minimized BLE notifications.
 */
export async function connectAndSubscribe(
  _macAddress: string,
  onFrame: FrameCallback,
): Promise<() => void> {
  // TODO: implement with BleManager
  // 1. Connect to device
  // 2. Discover services
  // 3. Subscribe to BLE_CHAR_SENSOR_FRAME characteristic
  // 4. Parse incoming notifications, then remove exact location before publish
  console.log('[BLE] Subscribing to', BLE_CHAR_SENSOR_FRAME);

  // Placeholder: in production, the BLE notification handler must do:
  // device.monitorCharacteristicForService(BLE_SERVICE_UUID, BLE_CHAR_SENSOR_FRAME, (err, char) => {
  //   if (char?.value) {
  //     const raw = base64ToUint8Array(char.value);
  //     const frame = minimizeLocationForApp(parseSensorFrame(raw));
  //     onFrame(frame);
  //   }
  // });

  return () => {
    console.log('[BLE] Disconnected');
  };
}

/** Utility: decode base64 string to BLE wire bytes. */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Do not re-export parseSensorFrame from the mobile boundary: callers should
// only receive location-minimized frames from connectAndSubscribe.
export { isMatFrame, isTagFrame };
