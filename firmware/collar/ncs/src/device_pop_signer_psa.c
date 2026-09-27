/*
 * device_pop_signer_psa.c — bounded opaque-key PSA signer.
 */

#include "device_pop_signer_psa.h"


static void secure_zero(void *buffer, size_t length)
{
    volatile uint8_t *p = (volatile uint8_t *)buffer;
    while (length-- > 0u) {
        *p++ = 0u;
    }
}

device_pop_sign_result_t device_pop_signer_psa_init(void)
{
    return psa_crypto_init() == PSA_SUCCESS
        ? DEVICE_POP_SIGN_OK
        : DEVICE_POP_SIGN_CRYPTO_INIT_ERROR;
}

static int key_policy_matches(psa_key_id_t key_id)
{
    psa_key_attributes_t attrs = PSA_KEY_ATTRIBUTES_INIT;
    psa_status_t status = psa_get_key_attributes(key_id, &attrs);
    if (status != PSA_SUCCESS) {
        return 0;
    }

    const psa_key_type_t type = psa_get_key_type(&attrs);
    const size_t bits = psa_get_key_bits(&attrs);
    const psa_key_usage_t usage = psa_get_key_usage_flags(&attrs);
    const psa_algorithm_t alg = psa_get_key_algorithm(&attrs);

    const int ok =
        PSA_KEY_TYPE_IS_ECC_KEY_PAIR(type)
        && PSA_KEY_TYPE_ECC_GET_FAMILY(type) == PSA_ECC_FAMILY_SECP_R1
        && bits == 256u
        && (usage & PSA_KEY_USAGE_SIGN_HASH) != 0u
        && alg == PSA_ALG_ECDSA(PSA_ALG_SHA_256);

    psa_reset_key_attributes(&attrs);
    return ok;
}

device_pop_sign_result_t device_pop_sign_challenge_v1(
    psa_key_id_t key_id,
    const device_pop_preimage_input_v1_t *input,
    uint8_t signature[DEVICE_POP_SIGNATURE_V1_SIZE]
)
{
    if (
        key_id == PSA_KEY_ID_NULL
        || input == NULL
        || signature == NULL
    ) {
        return DEVICE_POP_SIGN_INVALID_ARGUMENT;
    }

    if (!key_policy_matches(key_id)) {
        return DEVICE_POP_SIGN_KEY_POLICY_MISMATCH;
    }

    uint8_t preimage[DEVICE_POP_PREIMAGE_V1_SIZE];
    uint8_t digest[DEVICE_POP_SHA256_SIZE];
    size_t digest_len = 0u;
    size_t signature_len = 0u;

    const device_pop_preimage_result_t preimage_result =
        device_pop_build_preimage_v1(
            input,
            preimage,
            sizeof(preimage)
        );

    if (preimage_result != DEVICE_POP_PREIMAGE_OK) {
        secure_zero(preimage, sizeof(preimage));
        return DEVICE_POP_SIGN_PREIMAGE_ERROR;
    }

    const psa_status_t hash_status = psa_hash_compute(
        PSA_ALG_SHA_256,
        preimage,
        sizeof(preimage),
        digest,
        sizeof(digest),
        &digest_len
    );

    secure_zero(preimage, sizeof(preimage));

    if (
        hash_status != PSA_SUCCESS
        || digest_len != DEVICE_POP_SHA256_SIZE
    ) {
        secure_zero(digest, sizeof(digest));
        return DEVICE_POP_SIGN_HASH_ERROR;
    }

    const psa_status_t sign_status = psa_sign_hash(
        key_id,
        PSA_ALG_ECDSA(PSA_ALG_SHA_256),
        digest,
        digest_len,
        signature,
        DEVICE_POP_SIGNATURE_V1_SIZE,
        &signature_len
    );

    secure_zero(digest, sizeof(digest));

    if (sign_status != PSA_SUCCESS) {
        secure_zero(signature, DEVICE_POP_SIGNATURE_V1_SIZE);
        return DEVICE_POP_SIGN_SIGNATURE_ERROR;
    }

    if (signature_len != DEVICE_POP_SIGNATURE_V1_SIZE) {
        secure_zero(signature, DEVICE_POP_SIGNATURE_V1_SIZE);
        return DEVICE_POP_SIGN_SIGNATURE_SIZE_ERROR;
    }

    return DEVICE_POP_SIGN_OK;
}
