/**
 * Versioned Device Trust proof-of-possession data contract.
 *
 * This file defines transport/data shapes only. It does not issue challenges,
 * sign, verify, consume replay state or authorize telemetry.
 */

export type DevicePopPurposeV1 = 'DEVICE_DATA_TELEMETRY_INGRESS';

export interface DevicePopChallengeV1 {
  schemaVersion: 'device-pop-challenge-v1';
  protocolVersion: 1;
  deviceId: string;
  credentialVersion: number;
  purpose: DevicePopPurposeV1;
  challengeId: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
  signingContract: 'EMOPET_DEVICE_POP_FIXED_BINARY_V1';
}

export interface DevicePopResponseV1 {
  schemaVersion: 'device-pop-response-v1';
  protocolVersion: 1;
  deviceId: string;
  credentialVersion: number;
  purpose: DevicePopPurposeV1;
  challengeId: string;
  signatureFormat: 'ECDSA_P256_SHA256_P1363_64';
  signature: string;
}
