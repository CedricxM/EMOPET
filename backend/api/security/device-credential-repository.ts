import { and, eq } from 'drizzle-orm';

import {
  DeviceIdentityEnrollmentReceiptV1Schema,
  type DeviceIdentityEnrollmentReceiptV1,
} from '@emopet/shared';

import { db } from '../../db/index.js';
import {
  deviceIdentityCredentials,
  devices,
} from '../../db/schema/index.js';

export type DeviceCredentialEnrollmentError =
  | 'INVALID_DEVICE_ID'
  | 'INVALID_ENROLLMENT_RECEIPT'
  | 'INVALID_PUBLIC_KEY'
  | 'DEVICE_NOT_FOUND_OR_NOT_TAG'
  | 'CREDENTIAL_VERSION_EXISTS'
  | 'KEY_SLOT_OCCUPIED'
  | 'PENDING_CREDENTIAL_EXISTS'
  | 'DATABASE_UNAVAILABLE';

export type DeviceCredentialEnrollmentResult =
  | {
      ok: true;
      credential: typeof deviceIdentityCredentials.$inferSelect;
    }
  | {
      ok: false;
      error: DeviceCredentialEnrollmentError;
      retryable?: boolean;
      issues?: string[];
    };

export interface DurableDevicePopCredential {
  deviceId: string;
  credentialVersion: number;
  state: 'ACTIVE';
  publicKeySec1: Uint8Array;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function decodeCanonicalSec1PublicKey(value: string): Uint8Array | null {
  try {
    const bytes = Buffer.from(value, 'base64url');
    if (
      bytes.length !== 65
      || bytes[0] !== 0x04
      || bytes.toString('base64url') !== value
    ) {
      return null;
    }
    return new Uint8Array(bytes);
  } catch {
    return null;
  }
}

function receiptFingerprint(receipt: DeviceIdentityEnrollmentReceiptV1): string {
  return JSON.stringify({
    credentialVersion: receipt.credentialVersion,
    keySlot: receipt.keySlot,
    psaKeyId: receipt.psaKeyId,
    algorithm: receipt.algorithm,
    publicKeyFormat: receipt.publicKeyFormat,
    publicKey: receipt.publicKey,
    firmwareVersion: receipt.firmwareVersion,
    hardwareRevision: receipt.hardwareRevision,
    bootstrapRevision: receipt.bootstrapRevision,
    state: receipt.state,
    privateKeyExported: receipt.privateKeyExported,
    devicePrincipalBinding: receipt.devicePrincipalBinding,
  });
}

/**
 * Durable backend enrollment boundary for #661.
 *
 * The caller must provide the canonical backend devices.id explicitly. This
 * primitive does not accept BLE ids, MAC addresses, FICR identifiers or any
 * transport identifier as a substitute for the canonical principal.
 *
 * Enrollment writes PENDING_PROOF only. There is intentionally no ACTIVE
 * transition in this module.
 */
export async function enrollPendingDeviceIdentityCredential(
  deviceId: string,
  rawReceipt: unknown,
): Promise<DeviceCredentialEnrollmentResult> {
  if (!UUID_RE.test(deviceId)) {
    return { ok: false, error: 'INVALID_DEVICE_ID' };
  }

  const parsed = DeviceIdentityEnrollmentReceiptV1Schema.safeParse(rawReceipt);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'INVALID_ENROLLMENT_RECEIPT',
      issues: parsed.error.issues.map((issue) =>
        `${issue.path.join('.') || '<root>'}: ${issue.message}`
      ),
    };
  }
  const receipt = parsed.data;

  if (decodeCanonicalSec1PublicKey(receipt.publicKey) == null) {
    return { ok: false, error: 'INVALID_PUBLIC_KEY' };
  }

  try {
    return await db.transaction(async (tx) => {
      const [device] = await tx
        .select({ id: devices.id, type: devices.type })
        .from(devices)
        .where(eq(devices.id, deviceId))
        .for('update')
        .limit(1);

      if (!device || device.type !== 'TAG') {
        return {
          ok: false,
          error: 'DEVICE_NOT_FOUND_OR_NOT_TAG',
        } as const;
      }

      const existing = await tx
        .select()
        .from(deviceIdentityCredentials)
        .where(eq(deviceIdentityCredentials.deviceId, deviceId));

      if (
        existing.some(
          (row) => row.credentialVersion === receipt.credentialVersion,
        )
      ) {
        return {
          ok: false,
          error: 'CREDENTIAL_VERSION_EXISTS',
        } as const;
      }

      if (existing.some((row) => row.keySlot === receipt.keySlot)) {
        return {
          ok: false,
          error: 'KEY_SLOT_OCCUPIED',
        } as const;
      }

      if (existing.some((row) => row.state === 'PENDING_PROOF')) {
        return {
          ok: false,
          error: 'PENDING_CREDENTIAL_EXISTS',
        } as const;
      }

      const [created] = await tx
        .insert(deviceIdentityCredentials)
        .values({
          deviceId,
          credentialVersion: receipt.credentialVersion,
          state: 'PENDING_PROOF',
          keySlot: receipt.keySlot,
          psaKeyId: receipt.psaKeyId,
          algorithm: receipt.algorithm,
          publicKeyFormat: receipt.publicKeyFormat,
          publicKeyBase64Url: receipt.publicKey,
          firmwareVersion: receipt.firmwareVersion,
          hardwareRevision: receipt.hardwareRevision,
          bootstrapRevision: receipt.bootstrapRevision,
          privateKeyExported: receipt.privateKeyExported,
          devicePrincipalBinding: receipt.devicePrincipalBinding,
          activatedAt: null,
          revokedAt: null,
        })
        .returning();

      if (!created) {
        return {
          ok: false,
          error: 'DATABASE_UNAVAILABLE',
          retryable: true,
        } as const;
      }

      return {
        ok: true,
        credential: created,
      } as const;
    });
  } catch {
    return {
      ok: false,
      error: 'DATABASE_UNAVAILABLE',
      retryable: true,
    };
  }
}

/**
 * Read-only durable credential resolver compatible with the #653/#654
 * interfaces.
 *
 * Enrollment in this module cannot create ACTIVE rows, so this returns null
 * until a separately-authorized proof-driven activation path exists.
 */
export const durableDevicePopCredentialRepository = {
  async resolveActiveCredential(
    deviceId: string,
    credentialVersion?: number,
  ): Promise<DurableDevicePopCredential | null> {
    if (!UUID_RE.test(deviceId)) return null;

    const predicates = [
      eq(deviceIdentityCredentials.deviceId, deviceId),
      eq(deviceIdentityCredentials.state, 'ACTIVE'),
    ];
    if (credentialVersion !== undefined) {
      if (
        !Number.isSafeInteger(credentialVersion)
        || credentialVersion <= 0
        || credentialVersion > 0xffffffff
      ) {
        return null;
      }
      predicates.push(
        eq(deviceIdentityCredentials.credentialVersion, credentialVersion),
      );
    }

    try {
      const [row] = await db
        .select({
          deviceId: deviceIdentityCredentials.deviceId,
          credentialVersion: deviceIdentityCredentials.credentialVersion,
          state: deviceIdentityCredentials.state,
          publicKeyBase64Url: deviceIdentityCredentials.publicKeyBase64Url,
        })
        .from(deviceIdentityCredentials)
        .where(and(...predicates))
        .limit(1);

      if (!row || row.state !== 'ACTIVE') return null;
      const publicKeySec1 = decodeCanonicalSec1PublicKey(
        row.publicKeyBase64Url,
      );
      if (publicKeySec1 == null) return null;

      return {
        deviceId: row.deviceId,
        credentialVersion: row.credentialVersion,
        state: 'ACTIVE',
        publicKeySec1,
      };
    } catch {
      return null;
    }
  },
};

export function enrollmentReceiptFingerprintForTest(
  receipt: DeviceIdentityEnrollmentReceiptV1,
): string {
  return receiptFingerprint(receipt);
}
