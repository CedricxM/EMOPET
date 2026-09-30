/**
 * Versioned Device Trust proof-of-possession data contract.
 *
 * This file defines transport/data shapes only. It does not issue challenges,
 * sign, verify, consume replay state or authorize telemetry.
 */

export type DevicePopPurposeV1 =
  | 'DEVICE_DATA_TELEMETRY_INGRESS'
  | 'DEVICE_CREDENTIAL_ACTIVATION';

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


export type DeviceIdentityKeySlotV1 = 'A' | 'B';

export type DeviceIdentityKeySlotStateV1 =
  | 'EMPTY'
  | 'PENDING_PROOF'
  | 'ACTIVE'
  | 'REVOKED_PENDING_ERASE';

/**
 * Public-only manufacturing/enrollment handoff.
 *
 * The receipt is not proof of canonical device identity by itself. The backend
 * must bind it to the canonical device principal through manufacturing/
 * enrollment authority and then require proof of possession before ACTIVE.
 */
export interface DeviceIdentityEnrollmentReceiptV1 {
  schemaVersion: 'device-identity-enrollment-receipt-v1';
  protocolVersion: 1;
  credentialVersion: number;
  keySlot: DeviceIdentityKeySlotV1;
  psaKeyId: number;
  algorithm: 'ECDSA_P256_SHA256';
  publicKeyFormat: 'SEC1_UNCOMPRESSED_P256_65';
  publicKey: string;
  firmwareVersion: string;
  hardwareRevision: string;
  bootstrapRevision: string;
  state: 'PENDING_PROOF';
  privateKeyExported: false;
  devicePrincipalBinding: 'BACKEND_MANUFACTURING_AUTHORITY_REQUIRED';
}
