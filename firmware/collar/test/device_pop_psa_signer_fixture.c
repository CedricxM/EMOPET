#include <assert.h>
#include <stddef.h>
#include <stdint.h>
#include <string.h>

#include "../main/security/device_pop_preimage.h"
#include "../ncs/src/device_pop_signer_psa.h"

enum {
    TEST_KEY_ID = 7u,
};

static psa_status_t init_status = PSA_SUCCESS;
static psa_status_t attributes_status = PSA_SUCCESS;
static psa_status_t hash_status = PSA_SUCCESS;
static psa_status_t sign_status = PSA_SUCCESS;
static size_t forced_signature_length = DEVICE_POP_SIGNATURE_V1_SIZE;
static psa_key_attributes_t active_attributes;

static int hash_calls;
static int sign_calls;
static psa_algorithm_t last_hash_alg;
static psa_algorithm_t last_sign_alg;
static psa_key_id_t last_sign_key;
static size_t last_hash_input_length;
static size_t last_sign_hash_length;

static void reset_fixture(void)
{
    init_status = PSA_SUCCESS;
    attributes_status = PSA_SUCCESS;
    hash_status = PSA_SUCCESS;
    sign_status = PSA_SUCCESS;
    forced_signature_length = DEVICE_POP_SIGNATURE_V1_SIZE;

    active_attributes = (psa_key_attributes_t) {
        .type = PSA_KEY_TYPE_ECC_KEY_PAIR(PSA_ECC_FAMILY_SECP_R1),
        .bits = 256u,
        .usage = PSA_KEY_USAGE_SIGN_HASH,
        .alg = PSA_ALG_ECDSA(PSA_ALG_SHA_256),
    };

    hash_calls = 0;
    sign_calls = 0;
    last_hash_alg = 0u;
    last_sign_alg = 0u;
    last_sign_key = 0u;
    last_hash_input_length = 0u;
    last_sign_hash_length = 0u;
}

psa_status_t psa_crypto_init(void)
{
    return init_status;
}

psa_status_t psa_get_key_attributes(
    psa_key_id_t key_id,
    psa_key_attributes_t *attributes
)
{
    if (attributes_status != PSA_SUCCESS) {
        return attributes_status;
    }
    if (key_id != TEST_KEY_ID || attributes == NULL) {
        return (psa_status_t)-1;
    }
    *attributes = active_attributes;
    return PSA_SUCCESS;
}

psa_key_type_t psa_get_key_type(const psa_key_attributes_t *attributes)
{
    return attributes->type;
}

size_t psa_get_key_bits(const psa_key_attributes_t *attributes)
{
    return attributes->bits;
}

psa_key_usage_t psa_get_key_usage_flags(
    const psa_key_attributes_t *attributes
)
{
    return attributes->usage;
}

psa_algorithm_t psa_get_key_algorithm(
    const psa_key_attributes_t *attributes
)
{
    return attributes->alg;
}

void psa_reset_key_attributes(psa_key_attributes_t *attributes)
{
    memset(attributes, 0, sizeof(*attributes));
}

psa_status_t psa_hash_compute(
    psa_algorithm_t alg,
    const uint8_t *input,
    size_t input_length,
    uint8_t *hash,
    size_t hash_size,
    size_t *hash_length
)
{
    hash_calls++;
    last_hash_alg = alg;
    last_hash_input_length = input_length;

    if (hash_status != PSA_SUCCESS) {
        return hash_status;
    }
    if (
        input == NULL
        || hash == NULL
        || hash_length == NULL
        || hash_size < DEVICE_POP_SHA256_SIZE
    ) {
        return (psa_status_t)-2;
    }

    for (size_t i = 0; i < DEVICE_POP_SHA256_SIZE; ++i) {
        hash[i] = (uint8_t)(0x20u + i);
    }
    *hash_length = DEVICE_POP_SHA256_SIZE;
    return PSA_SUCCESS;
}

psa_status_t psa_sign_hash(
    psa_key_id_t key,
    psa_algorithm_t alg,
    const uint8_t *hash,
    size_t hash_length,
    uint8_t *signature,
    size_t signature_size,
    size_t *signature_length
)
{
    sign_calls++;
    last_sign_key = key;
    last_sign_alg = alg;
    last_sign_hash_length = hash_length;

    if (sign_status != PSA_SUCCESS) {
        return sign_status;
    }
    if (
        hash == NULL
        || signature == NULL
        || signature_length == NULL
        || signature_size < DEVICE_POP_SIGNATURE_V1_SIZE
    ) {
        return (psa_status_t)-3;
    }

    for (size_t i = 0; i < DEVICE_POP_SIGNATURE_V1_SIZE; ++i) {
        signature[i] = (uint8_t)(0xa0u + (i & 0x1fu));
    }
    *signature_length = forced_signature_length;
    return PSA_SUCCESS;
}

static device_pop_preimage_input_v1_t valid_input(void)
{
    device_pop_preimage_input_v1_t input;
    memset(&input, 0, sizeof(input));
    input.purpose = DEVICE_POP_PURPOSE_TELEMETRY_INGRESS_V1;

    for (size_t i = 0; i < DEVICE_POP_UUID_BYTES; ++i) {
        input.device_id[i] = (uint8_t)(0x10u + i);
        input.challenge_id[i] = (uint8_t)(0x40u + i);
    }
    memset(input.nonce, 0x5a, sizeof(input.nonce));
    input.credential_version = 3u;
    input.issued_at_unix_ms = UINT64_C(1790533740000);
    input.expires_at_unix_ms = UINT64_C(1790533860000);
    return input;
}

int main(void)
{
    reset_fixture();

    assert(device_pop_signer_psa_init() == DEVICE_POP_SIGN_OK);
    init_status = (psa_status_t)-100;
    assert(
        device_pop_signer_psa_init()
        == DEVICE_POP_SIGN_CRYPTO_INIT_ERROR
    );
    init_status = PSA_SUCCESS;

    device_pop_preimage_input_v1_t input = valid_input();
    uint8_t signature[DEVICE_POP_SIGNATURE_V1_SIZE];
    memset(signature, 0, sizeof(signature));

    assert(
        device_pop_sign_challenge_v1(
            TEST_KEY_ID,
            &input,
            signature
        ) == DEVICE_POP_SIGN_OK
    );
    assert(hash_calls == 1);
    assert(sign_calls == 1);
    assert(last_hash_alg == PSA_ALG_SHA_256);
    assert(last_hash_input_length == DEVICE_POP_PREIMAGE_V1_SIZE);
    assert(last_sign_key == TEST_KEY_ID);
    assert(last_sign_alg == PSA_ALG_ECDSA(PSA_ALG_SHA_256));
    assert(last_sign_hash_length == DEVICE_POP_SHA256_SIZE);
    for (size_t i = 0; i < sizeof(signature); ++i) {
        assert(signature[i] == (uint8_t)(0xa0u + (i & 0x1fu)));
    }

    reset_fixture();
    active_attributes.bits = 384u;
    assert(
        device_pop_sign_challenge_v1(
            TEST_KEY_ID,
            &input,
            signature
        ) == DEVICE_POP_SIGN_KEY_POLICY_MISMATCH
    );
    assert(hash_calls == 0);
    assert(sign_calls == 0);

    reset_fixture();
    active_attributes.usage = 0u;
    assert(
        device_pop_sign_challenge_v1(
            TEST_KEY_ID,
            &input,
            signature
        ) == DEVICE_POP_SIGN_KEY_POLICY_MISMATCH
    );

    reset_fixture();
    input.credential_version = 0u;
    assert(
        device_pop_sign_challenge_v1(
            TEST_KEY_ID,
            &input,
            signature
        ) == DEVICE_POP_SIGN_PREIMAGE_ERROR
    );

    input = valid_input();
    reset_fixture();
    hash_status = (psa_status_t)-200;
    assert(
        device_pop_sign_challenge_v1(
            TEST_KEY_ID,
            &input,
            signature
        ) == DEVICE_POP_SIGN_HASH_ERROR
    );
    assert(sign_calls == 0);

    reset_fixture();
    sign_status = (psa_status_t)-300;
    memset(signature, 0x7f, sizeof(signature));
    assert(
        device_pop_sign_challenge_v1(
            TEST_KEY_ID,
            &input,
            signature
        ) == DEVICE_POP_SIGN_SIGNATURE_ERROR
    );
    for (size_t i = 0; i < sizeof(signature); ++i) {
        assert(signature[i] == 0u);
    }

    reset_fixture();
    forced_signature_length = DEVICE_POP_SIGNATURE_V1_SIZE - 1u;
    memset(signature, 0x7f, sizeof(signature));
    assert(
        device_pop_sign_challenge_v1(
            TEST_KEY_ID,
            &input,
            signature
        ) == DEVICE_POP_SIGN_SIGNATURE_SIZE_ERROR
    );
    for (size_t i = 0; i < sizeof(signature); ++i) {
        assert(signature[i] == 0u);
    }

    reset_fixture();
    assert(
        device_pop_sign_challenge_v1(
            PSA_KEY_ID_NULL,
            &input,
            signature
        ) == DEVICE_POP_SIGN_INVALID_ARGUMENT
    );
    assert(hash_calls == 0);
    assert(sign_calls == 0);

    return 0;
}
