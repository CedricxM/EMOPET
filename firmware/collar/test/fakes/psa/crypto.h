/*
 * Host-test-only PSA Crypto shim for the bounded Device Trust signer.
 * NEVER include this directory in target firmware builds.
 */
#pragma once

#include <stddef.h>
#include <stdint.h>

typedef int32_t psa_status_t;
typedef uint32_t psa_key_id_t;
typedef uint32_t psa_key_type_t;
typedef uint32_t psa_key_usage_t;
typedef uint32_t psa_algorithm_t;

typedef struct {
    psa_key_type_t type;
    size_t bits;
    psa_key_usage_t usage;
    psa_algorithm_t alg;
} psa_key_attributes_t;

#define PSA_SUCCESS ((psa_status_t)0)
#define PSA_KEY_ID_NULL ((psa_key_id_t)0)
#define PSA_ECC_FAMILY_SECP_R1 ((uint32_t)0x12u)
#define PSA_KEY_USAGE_SIGN_HASH ((psa_key_usage_t)0x0400u)
#define PSA_ALG_SHA_256 ((psa_algorithm_t)0x02000009u)
#define PSA_ALG_ECDSA(hash_alg) ((psa_algorithm_t)(0x06000600u | ((hash_alg) & 0xffu)))
#define PSA_KEY_ATTRIBUTES_INIT { 0u, 0u, 0u, 0u }
#define PSA_KEY_TYPE_ECC_KEY_PAIR(family) ((psa_key_type_t)(0x7000u | (family)))
#define PSA_KEY_TYPE_IS_ECC_KEY_PAIR(type) (((type) & 0x7000u) == 0x7000u)
#define PSA_KEY_TYPE_ECC_GET_FAMILY(type) ((uint32_t)((type) & 0xffu))

psa_status_t psa_crypto_init(void);
psa_status_t psa_get_key_attributes(
    psa_key_id_t key_id,
    psa_key_attributes_t *attributes
);
psa_key_type_t psa_get_key_type(const psa_key_attributes_t *attributes);
size_t psa_get_key_bits(const psa_key_attributes_t *attributes);
psa_key_usage_t psa_get_key_usage_flags(
    const psa_key_attributes_t *attributes
);
psa_algorithm_t psa_get_key_algorithm(
    const psa_key_attributes_t *attributes
);
void psa_reset_key_attributes(psa_key_attributes_t *attributes);

psa_status_t psa_hash_compute(
    psa_algorithm_t alg,
    const uint8_t *input,
    size_t input_length,
    uint8_t *hash,
    size_t hash_size,
    size_t *hash_length
);

psa_status_t psa_sign_hash(
    psa_key_id_t key,
    psa_algorithm_t alg,
    const uint8_t *hash,
    size_t hash_length,
    uint8_t *signature,
    size_t signature_size,
    size_t *signature_length
);
