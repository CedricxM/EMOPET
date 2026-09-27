import type { ActivityVariabilityFeatureTransportFrame } from './sensor.js';

export interface ActivityFeatureForwardingClockAnchorV1 {
  strategy: 'BOOT_ANCHOR_V1';
  bootSessionId: number;
  anchorDeviceMs: number;
  anchorUtc: string;
  uncertaintyMs: number;
}

/**
 * Network candidate for #122.
 *
 * `deviceId` is a canonical backend-registry UUID supplied by an external
 * binding authority. A react-native-ble-plx device identifier is deliberately
 * absent from this contract.
 */
export interface ActivityFeatureForwardingCandidateV1 {
  schemaVersion: 'activity-feature-forwarding-v1';
  dogId: string;
  deviceId: string;
  frame: ActivityVariabilityFeatureTransportFrame;
  clockAnchor: ActivityFeatureForwardingClockAnchorV1;
}
