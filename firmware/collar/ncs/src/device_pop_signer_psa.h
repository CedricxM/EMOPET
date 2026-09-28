/*
 * device_pop_signer_psa.h — bounded PSA ECDSA P-256 signer primitive.
 *
 * This module signs only the canonical DEVICE_POP_CHALLENGE_V1 preimage.
 * It does NOT generate/import/export/destroy keys and does not own storage.
 */

#pragma once

#include <stddef.h>
#include <stdint.h>
#include <psa/crypto.h>

#include "device_pop_preimage.h"

#ifdef __cplusplus
extern "C" {
#endif

#define DEVICE_POP_SIGNATURE_V1_SIZE 64u
#define DEVICE_POP_SHA256_SIZE 32u

typedef enum {
    DEVICE_POP_SIGN_OK = 0,
    DEVICE_POP_SIGN_INVALID_ARGUMENT = 1,
    DEVICE_POP_SIGN_KEY_POLICY_MISMATCH = 2,
    DEVICE_POP_SIGN_PREIMAGE_ERROR = 3,
    DEVICE_POP_SIGN_HASH_ERROR = 4,
    DEVICE_POP_SIGN_SIGNATURE_ERROR = 5,
    DEVICE_POP_SIGN_SIGNATURE_SIZE_ERROR = 6,
    DEVICE_POP_SIGN_CRYPTO_INIT_ERROR = 7,
} device_pop_sign_result_t;

/**
 * Initialize the PSA Crypto subsystem before signing.
 *
 * This does not generate/open/import any device credential. Key lifecycle and
 * persistent storage remain a separate authority.
 */
device_pop_sign_result_t device_pop_signer_psa_init(void);

/**
 * Sign DEVICE_POP_CHALLENGE_V1 using an already-provisioned opaque PSA key id.
 *
 * Required key policy:
 * - ECC key pair;
 * - secp256r1 / P-256;
 * - 256 bits;
 * - SIGN_HASH usage;
 * - PSA_ALG_ECDSA(PSA_ALG_SHA_256).
 *
 * Output is PSA ECDSA raw R||S (32 bytes each).
 */
device_pop_sign_result_t device_pop_sign_challenge_v1(
    psa_key_id_t key_id,
    const device_pop_preimage_input_v1_t *input,
    uint8_t signature[DEVICE_POP_SIGNATURE_V1_SIZE]
);

#ifdef __cplusplus
}
#endif
