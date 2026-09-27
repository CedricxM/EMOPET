import type {
  OwnerDogCanonicalDevice,
  OwnerDogCanonicalDeviceRegistryResponse,
} from '@emopet/shared';
import { OwnerDogCanonicalDeviceRegistryResponseSchema } from '@emopet/shared/validators';

import { apiRequest } from './api';

export type CanonicalTagResolution =
  | {
      status: 'AVAILABLE';
      device: OwnerDogCanonicalDevice;
      physicalDeviceAuthenticationEstablished: false;
    }
  | {
      status: 'NONE_FOUND';
      physicalDeviceAuthenticationEstablished: false;
    }
  | {
      status: 'AMBIGUOUS';
      candidateDeviceIds: string[];
      physicalDeviceAuthenticationEstablished: false;
    };

export async function fetchOwnerDogCanonicalDevices(
  dogId: string,
  token: string,
): Promise<OwnerDogCanonicalDeviceRegistryResponse> {
  const raw = await apiRequest<unknown>(
    `/api/dogs/${encodeURIComponent(dogId)}/devices`,
    { token },
  );

  return OwnerDogCanonicalDeviceRegistryResponseSchema.parse(raw);
}

/**
 * Registry-only resolver for the first TAG forwarding candidate.
 *
 * This deliberately refuses to select a TAG when more than one active TAG row
 * is bound to the dog. A unique backend registry row is still not proof that a
 * currently connected BLE peripheral is physically that device; #66 remains
 * the physical-device authentication authority.
 */
export function resolveCanonicalTagDevice(
  registry: OwnerDogCanonicalDeviceRegistryResponse,
): CanonicalTagResolution {
  const tags = registry.devices.filter(
    (device) => device.type === 'TAG' && device.bindingStatus === 'BOUND',
  );

  if (tags.length === 0) {
    return {
      status: 'NONE_FOUND',
      physicalDeviceAuthenticationEstablished: false,
    };
  }

  if (tags.length > 1) {
    return {
      status: 'AMBIGUOUS',
      candidateDeviceIds: tags.map((device) => device.id),
      physicalDeviceAuthenticationEstablished: false,
    };
  }

  return {
    status: 'AVAILABLE',
    device: tags[0]!,
    physicalDeviceAuthenticationEstablished: false,
  };
}

export async function fetchCanonicalTagForDog(
  dogId: string,
  token: string,
): Promise<CanonicalTagResolution> {
  const registry = await fetchOwnerDogCanonicalDevices(dogId, token);
  return resolveCanonicalTagDevice(registry);
}
