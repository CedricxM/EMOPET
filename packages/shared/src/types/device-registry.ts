/**
 * Owner-scoped canonical backend device registry projection.
 *
 * These identifiers come from backend `devices.id` rows. They are registry
 * identity only and must not be treated as proof that a currently connected
 * BLE peripheral is physically that device. Device Trust remains #66.
 */
export type CanonicalRegistryDeviceType = 'MAT' | 'TAG';

export interface OwnerDogCanonicalDevice {
  id: string;
  dogId: string;
  type: CanonicalRegistryDeviceType;
  firmwareVersion: string | null;
  supportsV6Features: boolean;
  bindingStatus: 'BOUND';
  physicalDeviceAuthentication: 'NOT_ESTABLISHED';
}

export interface OwnerDogCanonicalDeviceRegistryResponse {
  schemaVersion: 'owner-dog-device-registry-v1';
  dogId: string;
  devices: OwnerDogCanonicalDevice[];
  identityAuthority: 'BACKEND_REGISTRY_ONLY';
  bleTransportIdentifierIsCanonicalIdentity: false;
  physicalDeviceAuthenticationEstablished: false;
}
