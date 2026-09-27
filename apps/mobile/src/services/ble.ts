/**
 * BLE central runtime for EMOPET MAT/TAG devices.
 *
 * Transport guarantees in this module are deliberately narrow:
 * - native BLE permission / adapter readiness;
 * - EMOPET service scan;
 * - connection + service discovery;
 * - notification subscription;
 * - canonical SensorFrame / feature-summary parsing and CRC checks.
 *
 * A successfully parsed frame is NOT proof of physical-device identity,
 * credential trust, dog binding, wall-clock correctness or scientific validity.
 * Device Trust remains governed by #66.
 */

import { PermissionsAndroid, Platform } from 'react-native';
import {
  BleManager,
  State,
  type Device,
  type Subscription,
} from 'react-native-ble-plx';

import {
  BLE_CHAR_CONFIG,
  BLE_CHAR_FEATURE_SUMMARY,
  BLE_CHAR_SENSOR_FRAME,
  BLE_SERVICE_UUID,
} from '@emopet/shared';
import {
  buildRequestClockAnchor,
  isMatFrame,
  isTagFrame,
  parseActivityVariabilityFeatureFrame,
  parseClockAnchorResponse,
  parseSensorFrame,
  type ActivityVariabilityFeatureTransportFrame,
  type ClockAnchorResponseFrame,
  type SensorFrame,
} from '@emopet/ble-protocol';

import {
  BootAnchorCaptureError,
  buildBootAnchorV1,
  type CapturedBootAnchorV1,
} from './ble-clock-anchor';

export type FrameCallback = (frame: SensorFrame) => void;
export type FeatureFrameCallback = (
  frame: ActivityVariabilityFeatureTransportFrame,
) => void;

export type BleRuntimeErrorCode =
  | 'PERMISSION_DENIED'
  | 'BLUETOOTH_NOT_POWERED_ON'
  | 'SCAN_FAILED'
  | 'CONNECT_FAILED'
  | 'SUBSCRIBE_FAILED'
  | 'NOTIFICATION_FAILED'
  | 'EMPTY_NOTIFICATION'
  | 'INVALID_SENSOR_FRAME'
  | 'INVALID_FEATURE_FRAME'
  | 'CLOCK_ANCHOR_MONOTONIC_UNAVAILABLE'
  | 'CLOCK_ANCHOR_WRITE_FAILED'
  | 'CLOCK_ANCHOR_NOTIFICATION_FAILED'
  | 'CLOCK_ANCHOR_RESPONSE_INVALID'
  | 'CLOCK_ANCHOR_TIMEOUT'
  | 'INVALID_CAPTURE_TIME'
  | 'INVALID_WALL_CLOCK_UNCERTAINTY'
  | 'CLOCK_SAMPLE_RTT_TOO_HIGH'
  | 'WALL_CLOCK_DISCONTINUITY'
  | 'CLOCK_ANCHOR_NONCE_MISMATCH'
  | 'CLOCK_SAMPLE_BOOT_MISMATCH';

export class BleRuntimeError extends Error {
  constructor(
    public readonly code: BleRuntimeErrorCode,
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = 'BleRuntimeError';
  }
}

export interface BleSubscriptionHandlers {
  onSensorFrame?: FrameCallback;
  onFeatureFrame?: FeatureFrameCallback;
  clockAnchor?: {
    canonicalDeviceId: string;
    localWallClockUncertaintyMs: number;
    expectedBootSessionId?: number;
    onAnchor: (anchor: CapturedBootAnchorV1) => void;
  };
  onError?: (error: BleRuntimeError) => void;
}

let manager: BleManager | null = null;

function getBleManager(): BleManager {
  manager ??= new BleManager();
  return manager;
}

function report(
  handler: BleSubscriptionHandlers['onError'],
  code: BleRuntimeErrorCode,
  message: string,
  originalError?: unknown,
): void {
  handler?.(new BleRuntimeError(code, message, originalError));
}

function androidApiLevel(): number {
  if (typeof Platform.Version === 'number') return Platform.Version;
  const parsed = Number.parseInt(String(Platform.Version), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Request only the platform permissions required by the current foreground BLE
 * central flow. EMOPET does use location elsewhere, so the Expo BLE plugin is
 * intentionally NOT configured with neverForLocation=true.
 */
export async function requestBlePermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  if (androidApiLevel() >= 31) {
    const scan = PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN!;
    const connect = PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT!;
    const result = await PermissionsAndroid.requestMultiple([scan, connect]);
    return result[scan] === PermissionsAndroid.RESULTS.GRANTED
      && result[connect] === PermissionsAndroid.RESULTS.GRANTED;
  }

  const fineLocation = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION!;
  return await PermissionsAndroid.request(fineLocation)
    === PermissionsAndroid.RESULTS.GRANTED;
}

async function requireBleReady(): Promise<BleManager> {
  if (!await requestBlePermissions()) {
    throw new BleRuntimeError(
      'PERMISSION_DENIED',
      'Bluetooth permission is required to connect to EMOPET sensors.',
    );
  }

  const ble = getBleManager();
  const state = await ble.state();
  if (state !== State.PoweredOn) {
    throw new BleRuntimeError(
      'BLUETOOTH_NOT_POWERED_ON',
      `Bluetooth adapter is not ready (state: ${state}).`,
    );
  }

  return ble;
}

/**
 * Start a foreground scan for peripherals advertising the EMOPET service.
 *
 * `deviceId` is the react-native-ble-plx identifier. On Android it may look
 * like a MAC address; on iOS it is not a MAC address and must not be treated as
 * a physical-device trust identifier.
 */
export async function startScan(
  onDeviceFound: (name: string, deviceId: string) => void,
  onError?: (error: BleRuntimeError) => void,
): Promise<() => Promise<void>> {
  const ble = await requireBleReady();
  const seen = new Set<string>();
  let active = true;

  try {
    await ble.startDeviceScan(
      [BLE_SERVICE_UUID],
      { allowDuplicates: false },
      (error, device) => {
        if (error) {
          active = false;
          report(onError, 'SCAN_FAILED', 'BLE scan failed.', error);
          return;
        }
        if (!device || seen.has(device.id)) return;
        seen.add(device.id);
        onDeviceFound(device.name ?? device.localName ?? 'EMOPET sensor', device.id);
      },
    );
  } catch (error) {
    active = false;
    throw new BleRuntimeError('SCAN_FAILED', 'Unable to start BLE scan.', error);
  }

  return async () => {
    if (!active) return;
    active = false;
    try {
      await ble.stopDeviceScan();
    } catch (error) {
      report(onError, 'SCAN_FAILED', 'Unable to stop BLE scan cleanly.', error);
    }
  };
}

function monitorSensorFrames(
  device: Device,
  onFrame: FrameCallback,
  onError?: BleSubscriptionHandlers['onError'],
): Subscription {
  return device.monitorCharacteristicForService(
    BLE_SERVICE_UUID,
    BLE_CHAR_SENSOR_FRAME,
    (error, characteristic) => {
      if (error) {
        report(onError, 'NOTIFICATION_FAILED', 'SensorFrame notification failed.', error);
        return;
      }
      if (!characteristic?.value) {
        report(onError, 'EMPTY_NOTIFICATION', 'SensorFrame notification had no value.');
        return;
      }

      try {
        onFrame(parseSensorFrame(base64ToUint8Array(characteristic.value)));
      } catch (parseError) {
        report(onError, 'INVALID_SENSOR_FRAME', 'SensorFrame failed canonical parsing.', parseError);
      }
    },
  );
}

function monitorFeatureFrames(
  device: Device,
  onFrame: FeatureFrameCallback,
  onError?: BleSubscriptionHandlers['onError'],
): Subscription {
  return device.monitorCharacteristicForService(
    BLE_SERVICE_UUID,
    BLE_CHAR_FEATURE_SUMMARY,
    (error, characteristic) => {
      if (error) {
        report(onError, 'NOTIFICATION_FAILED', 'Feature-summary notification failed.', error);
        return;
      }
      if (!characteristic?.value) {
        report(onError, 'EMPTY_NOTIFICATION', 'Feature-summary notification had no value.');
        return;
      }

      try {
        onFrame(parseActivityVariabilityFeatureFrame(
          base64ToUint8Array(characteristic.value),
        ));
      } catch (parseError) {
        report(
          onError,
          'INVALID_FEATURE_FRAME',
          'Feature-summary frame failed canonical parsing.',
          parseError,
        );
      }
    },
  );
}


let nextClockAnchorNonce = Date.now() >>> 0;

function allocateClockAnchorNonce(): number {
  nextClockAnchorNonce = (nextClockAnchorNonce + 1) >>> 0;
  return nextClockAnchorNonce;
}

function monotonicNowMs(): number {
  const candidate = (
    globalThis as typeof globalThis & {
      performance?: { now?: () => number };
    }
  ).performance?.now?.();

  if (candidate == null || !Number.isFinite(candidate) || candidate < 0) {
    throw new BleRuntimeError(
      'CLOCK_ANCHOR_MONOTONIC_UNAVAILABLE',
      'A monotonic clock is required for BOOT_ANCHOR_V1 RTT measurement.',
    );
  }

  return candidate;
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export async function captureDeviceBootClockAnchor(
  device: Device,
  input: {
    canonicalDeviceId: string;
    localWallClockUncertaintyMs: number;
    expectedBootSessionId?: number;
    timeoutMs?: number;
  },
): Promise<CapturedBootAnchorV1> {
  const requestNonce = allocateClockAnchorNonce();
  const timeoutMs = input.timeoutMs ?? 2000;
  const request = buildRequestClockAnchor(requestNonce);

  let subscription: Subscription | null = null;
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  let settled = false;
  let armed = false;
  let wallBeforeUtcMs = 0;
  let monotonicBeforeMs = 0;

  const cleanup = () => {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    timeoutHandle = null;
    subscription?.remove();
    subscription = null;
  };

  return new Promise<CapturedBootAnchorV1>((resolve, reject) => {
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    const succeed = (anchor: CapturedBootAnchorV1) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(anchor);
    };

    subscription = device.monitorCharacteristicForService(
      BLE_SERVICE_UUID,
      BLE_CHAR_CONFIG,
      (error, characteristic) => {
        if (error) {
          fail(new BleRuntimeError(
            'CLOCK_ANCHOR_NOTIFICATION_FAILED',
            'Clock-anchor Config notification failed.',
            error,
          ));
          return;
        }
        if (!characteristic?.value) return;

        let response: ClockAnchorResponseFrame;
        try {
          response = parseClockAnchorResponse(
            base64ToUint8Array(characteristic.value),
          );
        } catch (parseError) {
          fail(new BleRuntimeError(
            'CLOCK_ANCHOR_RESPONSE_INVALID',
            'Clock-anchor response failed canonical parsing.',
            parseError,
          ));
          return;
        }

        // A Config notification from another outstanding/stale request is not
        // evidence for this capture. Ignore it and keep waiting for our nonce.
        if (response.requestNonce !== requestNonce || !armed) return;

        let monotonicAfterMs: number;
        try {
          monotonicAfterMs = monotonicNowMs();
        } catch (clockError) {
          fail(clockError);
          return;
        }
        const wallAfterUtcMs = Date.now();

        try {
          succeed(buildBootAnchorV1({
            canonicalDeviceId: input.canonicalDeviceId,
            bleDeviceId: device.id,
            wallBeforeUtcMs,
            wallAfterUtcMs,
            monotonicBeforeMs,
            monotonicAfterMs,
            localWallClockUncertaintyMs: input.localWallClockUncertaintyMs,
            requestNonce,
            response,
            expectedBootSessionId: input.expectedBootSessionId,
          }));
        } catch (anchorError) {
          if (anchorError instanceof BootAnchorCaptureError) {
            fail(new BleRuntimeError(
              anchorError.code,
              anchorError.message,
              anchorError,
            ));
          } else {
            fail(anchorError);
          }
        }
      },
    );

    wallBeforeUtcMs = Date.now();
    try {
      monotonicBeforeMs = monotonicNowMs();
    } catch (clockError) {
      fail(clockError);
      return;
    }

    armed = true;

    timeoutHandle = setTimeout(() => {
      fail(new BleRuntimeError(
        'CLOCK_ANCHOR_TIMEOUT',
        `Clock-anchor response did not arrive within ${timeoutMs}ms.`,
      ));
    }, timeoutMs);

    void device.writeCharacteristicWithResponseForService(
      BLE_SERVICE_UUID,
      BLE_CHAR_CONFIG,
      uint8ArrayToBase64(request),
    ).catch((error: unknown) => {
      fail(new BleRuntimeError(
        'CLOCK_ANCHOR_WRITE_FAILED',
        'Unable to write the bounded clock-anchor probe.',
        error,
      ));
    });
  });
}

/**
 * Connect to one EMOPET device, discover GATT services and subscribe only to
 * the notification surfaces requested by the caller.
 *
 * For compatibility with the historical placeholder API, a bare FrameCallback
 * is accepted and subscribes only to SensorFrame notifications.
 */
export async function connectAndSubscribe(
  deviceId: string,
  handlersOrFrameCallback: BleSubscriptionHandlers | FrameCallback,
): Promise<() => Promise<void>> {
  const handlers: BleSubscriptionHandlers =
    typeof handlersOrFrameCallback === 'function'
      ? { onSensorFrame: handlersOrFrameCallback }
      : handlersOrFrameCallback;

  if (!handlers.onSensorFrame && !handlers.onFeatureFrame && !handlers.clockAnchor) {
    throw new BleRuntimeError(
      'SUBSCRIBE_FAILED',
      'At least one BLE notification handler is required.',
    );
  }

  const ble = await requireBleReady();
  let device: Device;

  try {
    device = await ble.connectToDevice(deviceId);
    await device.discoverAllServicesAndCharacteristics();
  } catch (error) {
    throw new BleRuntimeError(
      'CONNECT_FAILED',
      `Unable to connect to or discover EMOPET device ${deviceId}.`,
      error,
    );
  }

  if (handlers.clockAnchor) {
    try {
      const anchor = await captureDeviceBootClockAnchor(device, {
        canonicalDeviceId: handlers.clockAnchor.canonicalDeviceId,
        localWallClockUncertaintyMs:
          handlers.clockAnchor.localWallClockUncertaintyMs,
        expectedBootSessionId: handlers.clockAnchor.expectedBootSessionId,
      });
      handlers.clockAnchor.onAnchor(anchor);
    } catch (error) {
      try {
        await ble.cancelDeviceConnection(device.id);
      } catch {
        // Preserve the clock-anchor failure as the primary error.
      }
      throw error;
    }
  }

  const subscriptions: Subscription[] = [];

  try {
    if (handlers.onSensorFrame) {
      subscriptions.push(
        monitorSensorFrames(device, handlers.onSensorFrame, handlers.onError),
      );
    }
    if (handlers.onFeatureFrame) {
      subscriptions.push(
        monitorFeatureFrames(device, handlers.onFeatureFrame, handlers.onError),
      );
    }
  } catch (error) {
    for (const subscription of subscriptions) subscription.remove();
    try {
      await ble.cancelDeviceConnection(device.id);
    } catch {
      // Preserve the subscription failure as the primary error.
    }
    throw new BleRuntimeError(
      'SUBSCRIBE_FAILED',
      'Unable to subscribe to the requested EMOPET BLE characteristic.',
      error,
    );
  }

  let stopped = false;
  return async () => {
    if (stopped) return;
    stopped = true;

    for (const subscription of subscriptions) subscription.remove();

    try {
      if (await ble.isDeviceConnected(device.id)) {
        await ble.cancelDeviceConnection(device.id);
      }
    } catch (error) {
      report(
        handlers.onError,
        'CONNECT_FAILED',
        'BLE disconnect did not complete cleanly.',
        error,
      );
    }
  };
}

/**
 * Decode a react-native-ble-plx base64 characteristic value.
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export {
  parseActivityVariabilityFeatureFrame,
  parseSensorFrame,
  isMatFrame,
  isTagFrame,
};
