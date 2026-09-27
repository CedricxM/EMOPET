/*
 * device_identity_key_provisioner_psa.c — source-only provisioning primitive.
 */

#include "device_identity_key_provisioner_psa.h"

static void secure_zero(void *buffer, size_t length)
{
    volatile uint8_t *p = (volatile uint8_t *)buffer;
    while (length-- > 0u) {
        *p++ = 0u;
    }
}

static device_identity_key_provision_result_t
rollback_generated_key(psa_key_id_t key_id)
{
    return psa_destroy_key(key_id) == PSA_SUCCESS
        ? DEVICE_IDENTITY_KEY_PROVISION_PUBLIC_EXPORT_ERROR
        : DEVICE_IDENTITY_KEY_PROVISION_ROLLBACK_ERROR;
}

device_identity_key_provision_result_t
device_identity_key_provision_p256_v1(
    psa_key_id_t key_id,
    uint32_t credential_version,
    device_identity_key_provision_receipt_t *receipt
)
{
    if (
        key_id == PSA_KEY_ID_NULL
        || credential_version == 0u
        || receipt == NULL
    ) {
        return DEVICE_IDENTITY_KEY_PROVISION_INVALID_ARGUMENT;
    }

    secure_zero(receipt, sizeof(*receipt));

    psa_key_attributes_t existing = PSA_KEY_ATTRIBUTES_INIT;
    const psa_status_t lookup_status =
        psa_get_key_attributes(key_id, &existing);

    if (lookup_status == PSA_SUCCESS) {
        psa_reset_key_attributes(&existing);
        return DEVICE_IDENTITY_KEY_PROVISION_ALREADY_EXISTS;
    }
    psa_reset_key_attributes(&existing);

    if (lookup_status != PSA_ERROR_DOES_NOT_EXIST) {
        return DEVICE_IDENTITY_KEY_PROVISION_LOOKUP_ERROR;
    }

    psa_key_attributes_t attrs = PSA_KEY_ATTRIBUTES_INIT;
    psa_set_key_type(
        &attrs,
        PSA_KEY_TYPE_ECC_KEY_PAIR(PSA_ECC_FAMILY_SECP_R1)
    );
    psa_set_key_bits(&attrs, 256u);
    psa_set_key_usage_flags(&attrs, PSA_KEY_USAGE_SIGN_HASH);
    psa_set_key_algorithm(
        &attrs,
        PSA_ALG_ECDSA(PSA_ALG_SHA_256)
    );
    psa_set_key_lifetime(&attrs, PSA_KEY_LIFETIME_PERSISTENT);
    psa_set_key_id(&attrs, key_id);

    psa_key_id_t generated_id = PSA_KEY_ID_NULL;
    const psa_status_t generate_status =
        psa_generate_key(&attrs, &generated_id);

    psa_reset_key_attributes(&attrs);

    if (generate_status != PSA_SUCCESS) {
        return DEVICE_IDENTITY_KEY_PROVISION_GENERATE_ERROR;
    }

    if (generated_id != key_id) {
        if (generated_id != PSA_KEY_ID_NULL) {
            (void)psa_destroy_key(generated_id);
        }
        return DEVICE_IDENTITY_KEY_PROVISION_KEY_ID_MISMATCH;
    }

    size_t public_key_length = 0u;
    const psa_status_t export_status = psa_export_public_key(
        key_id,
        receipt->public_key_sec1,
        sizeof(receipt->public_key_sec1),
        &public_key_length
    );

    if (export_status != PSA_SUCCESS) {
        secure_zero(receipt, sizeof(*receipt));
        return rollback_generated_key(key_id);
    }

    if (
        public_key_length != DEVICE_IDENTITY_P256_PUBLIC_KEY_SIZE
        || receipt->public_key_sec1[0] != 0x04u
    ) {
        secure_zero(receipt, sizeof(*receipt));
        const device_identity_key_provision_result_t rollback =
            rollback_generated_key(key_id);
        return rollback == DEVICE_IDENTITY_KEY_PROVISION_ROLLBACK_ERROR
            ? rollback
            : DEVICE_IDENTITY_KEY_PROVISION_PUBLIC_KEY_FORMAT_ERROR;
    }

    receipt->key_id = key_id;
    receipt->credential_version = credential_version;
    return DEVICE_IDENTITY_KEY_PROVISION_OK;
}
