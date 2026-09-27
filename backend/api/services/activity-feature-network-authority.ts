import { and, eq } from 'drizzle-orm';
import type { ActivityFeatureForwardingCandidateV1 } from '@emopet/shared';

import { db } from '../../db/index.js';
import { devices, dogs } from '../../db/schema/index.js';
import {
  currentDeviceDataTrustVerifier,
  type DeviceDataTrustVerifier,
} from '../security/device-data-trust.js';

export type ActivityFeatureNetworkAuthorityFailure =
  | { ok: false; error: 'OWNER_OR_DOG_NOT_FOUND' }
  | { ok: false; error: 'DEVICE_BINDING_INVALID' }
  | { ok: false; error: 'DEVICE_DATA_TRUST_RUNTIME_NOT_IMPLEMENTED' }
  | { ok: false; error: 'DATABASE_UNAVAILABLE'; retryable: true };

export type ActivityFeatureNetworkAuthorityResult =
  | {
      ok: true;
      canonicalDeviceId: string;
      trustEvidenceVersion: string;
    }
  | ActivityFeatureNetworkAuthorityFailure;

/**
 * Server-side pre-persistence authority for #122.
 *
 * This function proves only:
 * 1. the authenticated Owner owns the dog;
 * 2. the supplied canonical UUID is a TAG registry row bound to that dog;
 * 3. a Device Trust verifier approves the physical principal.
 *
 * The default verifier intentionally fails under #66.
 *
 * Even an ok result is not persistence authority by itself. The HTTP route
 * remains separately non-activating until a later explicit network-ingestion
 * promotion.
 */
export async function authorizeActivityFeatureNetworkIngress(
  ownerId: string,
  candidate: ActivityFeatureForwardingCandidateV1,
  verifier: DeviceDataTrustVerifier = currentDeviceDataTrustVerifier,
): Promise<ActivityFeatureNetworkAuthorityResult> {
  try {
    const [dog] = await db
      .select({ ownerId: dogs.ownerId })
      .from(dogs)
      .where(eq(dogs.id, candidate.dogId))
      .limit(1);

    if (!dog || dog.ownerId !== ownerId) {
      return { ok: false, error: 'OWNER_OR_DOG_NOT_FOUND' };
    }

    const [device] = await db
      .select({ id: devices.id })
      .from(devices)
      .where(and(
        eq(devices.id, candidate.deviceId),
        eq(devices.dogId, candidate.dogId),
        eq(devices.type, 'TAG'),
      ))
      .limit(1);

    if (!device) {
      return { ok: false, error: 'DEVICE_BINDING_INVALID' };
    }

    const trust = await verifier.verify({
      ownerId,
      dogId: candidate.dogId,
      deviceId: device.id,
      transport: {
        bootSessionId: candidate.frame.bootSessionId,
        sequence: candidate.frame.sequence,
      },
    });

    if (!trust.ok) {
      return { ok: false, error: trust.error };
    }

    if (trust.principalId !== device.id) {
      return { ok: false, error: 'DEVICE_BINDING_INVALID' };
    }

    return {
      ok: true,
      canonicalDeviceId: device.id,
      trustEvidenceVersion: trust.evidenceVersion,
    };
  } catch {
    return {
      ok: false,
      error: 'DATABASE_UNAVAILABLE',
      retryable: true,
    };
  }
}
