export type ProtectedDeviceCommandKind =
  | 'SET_NOTIFICATION_INTERVAL'
  | 'REQUEST_CALIBRATION'
  | 'SET_GPS_MODE'
  | 'SET_GEOFENCE'
  | 'FACTORY_RESET'
  | 'REBIND'
  | 'CREDENTIAL_ROTATION'
  | 'OTA_INSTALL';

export interface UnsignedDeviceCommandDraft {
  schemaVersion: 'emopet-device-command-draft-v1';
  commandKind: ProtectedDeviceCommandKind;
  devicePrincipalId: string;
  dogId: string;
  guardianId: string;
  commandSequence: number;
  nonce: string;
  issuedAt: Date;
  expiresAt: Date;
  keyVersion: string;
  payload: Uint8Array;
}

/**
 * Deliberately non-executable production boundary.
 *
 * This object may be used to carry a command toward a future signer/authorizer,
 * but its presence is NOT command authority and it MUST NOT be sent directly to
 * firmware as a trusted Product command.
 */
export interface AuthorizedDeviceCommandReceipt {
  schemaVersion: 'emopet-device-command-authority-v1';
  commandId: string;
  devicePrincipalId: string;
  commandSequence: number;
  nonce: string;
  keyVersion: string;
  authorizedAt: Date;
  expiresAt: Date;
  authorizationPolicyVersion: string;
  signatureAlgorithm: string;
  signature: Uint8Array;
}

export const DEVICE_COMMAND_RUNTIME_STATUS =
  'GATED_DEVICE_TRUST_NOT_IMPLEMENTED' as const;

/**
 * Fails closed until #66 selects and implements the actual cryptographic
 * command-authority verifier.
 */
export function assertTrustedDeviceCommandRuntimeAvailable(): never {
  throw new Error('DEVICE_COMMAND_TRUST_RUNTIME_NOT_IMPLEMENTED');
}
