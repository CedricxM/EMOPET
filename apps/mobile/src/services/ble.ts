/**
 * BLE service — connects to EMOPET MAT/TAG devices and parses SensorFrames.
 *
 * Uses react-native-ble-plx for BLE communication.
 * Frames are parsed using @emopet/ble-protocol.
 */

import { BLE_SERVICE_UUID, BLE_CHAR_SENSOR_FRAME } from '@emopet/shared';
import { parseSensorFrame, isMatFrame, isTagFrame, type SensorFrame } from '@emopet/ble-protocol';

export type FrameCallback = (frame: SensorFrame) => void;

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
 * Connect to a device and subscribe to SensorFrame notifications.
 */
export async function connectAndSubscribe(
  _macAddress: string,
  onFrame: FrameCallback,
): Promise<() => void> {
  // TODO: implement with BleManager
  // 1. Connect to device
  // 2. Discover services
  // 3. Subscribe to BLE_CHAR_SENSOR_FRAME characteristic
  // 4. Parse incoming notifications with parseSensorFrame
  console.log('[BLE] Subscribing to', BLE_CHAR_SENSOR_FRAME);

  // Placeholder: in production, the BLE notification handler would do:
  // device.monitorCharacteristicForService(BLE_SERVICE_UUID, BLE_CHAR_SENSOR_FRAME, (err, char) => {
  //   if (char?.value) {
  //     const raw = base64ToUint8Array(char.value);
  //     const frame = parseSensorFrame(raw);
  //     onFrame(frame);
  //   }
  // });

  return () => {
    console.log('[BLE] Disconnected');
  };
}

/**
 * Utility: decode base64 string to Uint8Array.
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export { parseSensorFrame, isMatFrame, isTagFrame };
