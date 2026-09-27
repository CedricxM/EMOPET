export const DEVICE_DATA_TRUST_RUNTIME_NOT_IMPLEMENTED =
  'DEVICE_DATA_TRUST_RUNTIME_NOT_IMPLEMENTED' as const;

export interface DeviceDataTrustEvidenceRequest {
  ownerId: string;
  dogId: string;
  deviceId: string;
  transport: {
    bootSessionId: number;
    sequence: number;
  };
}

export type DeviceDataTrustVerification =
  | {
      ok: true;
      principalId: string;
      evidenceVersion: string;
    }
  | {
      ok: false;
      error: typeof DEVICE_DATA_TRUST_RUNTIME_NOT_IMPLEMENTED;
    };

export interface DeviceDataTrustVerifier {
  verify(
    request: DeviceDataTrustEvidenceRequest,
  ): Promise<DeviceDataTrustVerification>;
}

/**
 * Current #66 authority.
 *
 * Registry binding and transport replay provenance are not physical-device
 * authentication. Until the manufacturing identity / proof-of-possession
 * architecture exists, network telemetry must fail closed before persistence.
 */
export const currentDeviceDataTrustVerifier: DeviceDataTrustVerifier = {
  async verify() {
    return {
      ok: false,
      error: DEVICE_DATA_TRUST_RUNTIME_NOT_IMPLEMENTED,
    };
  },
};
