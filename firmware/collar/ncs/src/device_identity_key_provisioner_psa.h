/*
 * device_identity_key_provisioner_psa.h — bounded on-device identity-key
 * provisioning primitive for #657.
 *
 * This source owns creation of a new persistent PSA P-256 key only when the
 * application explicitly enables CONFIG_EMOPET_DEVICE_KEY_PROVISIONING.
 *
 * It does NOT own:
 * - HUK/KDR provisioning;
 * - NSIB configuration;
 * - Secure Storage target proof;
 * - credential activation;
 * - backend enrollment;
 * - rotation/revocation/RMA orchestration;
 * - Device Data Trust success.
 */

#pragma once

#include <stddef.h>
#include <stdint.h>

#include <psa/crypto.h>

#ifdef __cplusplus
extern "C" {
#endif

#define DEVICE_IDENTITY_P256_PUBLIC_KEY_SIZE 65u

typedef enum {
    DEVICE_IDENTITY_KEY_PROVISION_OK = 0,
    DEVICE_IDENTITY_KEY_PROVISION_INVALID_ARGUMENT = 1,
    DEVICE_IDENTITY_KEY_PROVISION_ALREADY_EXISTS = 2,
    DEVICE_IDENTITY_KEY_PROVISION_LOOKUP_ERROR = 3,
    DEVICE_IDENTITY_KEY_PROVISION_GENERATE_ERROR = 4,
    DEVICE_IDENTITY_KEY_PROVISION_KEY_ID_MISMATCH = 5,
    DEVICE_IDENTITY_KEY_PROVISION_PUBLIC_EXPORT_ERROR = 6,
    DEVICE_IDENTITY_KEY_PROVISION_PUBLIC_KEY_FORMAT_ERROR = 7,
    DEVICE_IDENTITY_KEY_PROVISION_ROLLBACK_ERROR = 8,
} device_identity_key_provision_result_t;

typedef struct {
    psa_key_id_t key_id;
    uint32_t credential_version;
    uint8_t public_key_sec1[DEVICE_IDENTITY_P256_PUBLIC_KEY_SIZE];
} device_identity_key_provision_receipt_t;

/**
 * Create a new persistent ECDSA P-256 signing key under an explicit PSA key id.
 *
 * Preconditions:
 * - PSA Crypto has already been initialized;
 * - the selected target provides the approved Secure Storage + HUK/KDR path;
 * - key_id and credential_version are supplied by provisioning authority.
 *
 * Refuses to overwrite an existing key id.
 * Exports only the SEC1 uncompressed public key.
 *
 * On a failure after key creation, the newly-created key is destroyed as
 * rollback. This is not a general runtime key-destruction API.
 */
device_identity_key_provision_result_t
device_identity_key_provision_p256_v1(
    psa_key_id_t key_id,
    uint32_t credential_version,
    device_identity_key_provision_receipt_t *receipt
);

#ifdef __cplusplus
}
#endif
