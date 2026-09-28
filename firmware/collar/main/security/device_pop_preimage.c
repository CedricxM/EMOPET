/*
 * device_pop_preimage.c — fixed binary PoP signing preimage.
 */

#include "device_pop_preimage.h"

#include <string.h>

static const uint8_t DOMAIN_SEPARATOR[] = "EMOPET_DEVICE_POP_V1";

enum {
    PROTOCOL_VERSION = 1u,
    PURPOSE_DEVICE_DATA_TELEMETRY_INGRESS = 1u,
};

_Static_assert(sizeof(DOMAIN_SEPARATOR) - 1u == 20u, "domain separator drift");
_Static_assert(
    20u + 1u + 1u + 16u + 4u + 16u + 32u + 8u + 8u
        == DEVICE_POP_PREIMAGE_V1_SIZE,
    "PoP preimage size drift"
);

static void write_u32_be(uint8_t *out, uint32_t value)
{
    out[0] = (uint8_t)((value >> 24u) & 0xffu);
    out[1] = (uint8_t)((value >> 16u) & 0xffu);
    out[2] = (uint8_t)((value >> 8u) & 0xffu);
    out[3] = (uint8_t)(value & 0xffu);
}

static void write_u64_be(uint8_t *out, uint64_t value)
{
    out[0] = (uint8_t)((value >> 56u) & 0xffu);
    out[1] = (uint8_t)((value >> 48u) & 0xffu);
    out[2] = (uint8_t)((value >> 40u) & 0xffu);
    out[3] = (uint8_t)((value >> 32u) & 0xffu);
    out[4] = (uint8_t)((value >> 24u) & 0xffu);
    out[5] = (uint8_t)((value >> 16u) & 0xffu);
    out[6] = (uint8_t)((value >> 8u) & 0xffu);
    out[7] = (uint8_t)(value & 0xffu);
}

device_pop_preimage_result_t device_pop_build_preimage_v1(
    const device_pop_preimage_input_v1_t *input,
    uint8_t *out,
    size_t out_len
)
{
    if (
        input == NULL
        || out == NULL
        || out_len != DEVICE_POP_PREIMAGE_V1_SIZE
    ) {
        return DEVICE_POP_PREIMAGE_INVALID_ARGUMENT;
    }

    if (
        input->credential_version == 0u
        || input->expires_at_unix_ms <= input->issued_at_unix_ms
    ) {
        return DEVICE_POP_PREIMAGE_INVALID_SEMANTICS;
    }

    size_t offset = 0u;

    memcpy(
        &out[offset],
        DOMAIN_SEPARATOR,
        sizeof(DOMAIN_SEPARATOR) - 1u
    );
    offset += sizeof(DOMAIN_SEPARATOR) - 1u;

    out[offset++] = PROTOCOL_VERSION;
    out[offset++] = PURPOSE_DEVICE_DATA_TELEMETRY_INGRESS;

    memcpy(&out[offset], input->device_id, DEVICE_POP_UUID_BYTES);
    offset += DEVICE_POP_UUID_BYTES;

    write_u32_be(&out[offset], input->credential_version);
    offset += 4u;

    memcpy(&out[offset], input->challenge_id, DEVICE_POP_UUID_BYTES);
    offset += DEVICE_POP_UUID_BYTES;

    memcpy(&out[offset], input->nonce, DEVICE_POP_NONCE_BYTES);
    offset += DEVICE_POP_NONCE_BYTES;

    write_u64_be(&out[offset], input->issued_at_unix_ms);
    offset += 8u;

    write_u64_be(&out[offset], input->expires_at_unix_ms);
    offset += 8u;

    return offset == DEVICE_POP_PREIMAGE_V1_SIZE
        ? DEVICE_POP_PREIMAGE_OK
        : DEVICE_POP_PREIMAGE_INVALID_SEMANTICS;
}
