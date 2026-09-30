#include <assert.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>

#include "../main/security/device_pop_preimage.h"

static void print_hex(const uint8_t *bytes, size_t length)
{
    for (size_t i = 0; i < length; ++i) {
        printf("%02x", bytes[i]);
    }
    printf("\n");
}

int main(void)
{
    const device_pop_preimage_input_v1_t input = {
        .purpose_code = DEVICE_POP_PURPOSE_TELEMETRY_V1,
        .device_id = {
            0x11, 0x11, 0x11, 0x11,
            0x11, 0x11,
            0x41, 0x11,
            0x81, 0x11,
            0x11, 0x11, 0x11, 0x11, 0x11, 0x11,
        },
        .credential_version = 3u,
        .challenge_id = {
            0x22, 0x22, 0x22, 0x22,
            0x22, 0x22,
            0x42, 0x22,
            0x82, 0x22,
            0x22, 0x22, 0x22, 0x22, 0x22, 0x22,
        },
        .nonce = {
            0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a,
            0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a,
            0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a,
            0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a,
        },
        .issued_at_unix_ms = UINT64_C(1790533740000),
        .expires_at_unix_ms = UINT64_C(1790533860000),
    };

    uint8_t out[DEVICE_POP_PREIMAGE_V1_SIZE];

    assert(
        device_pop_build_preimage_v1(&input, out, sizeof(out))
        == DEVICE_POP_PREIMAGE_OK
    );
    print_hex(out, sizeof(out));

    device_pop_preimage_input_v1_t activation = input;
    activation.purpose_code =
        DEVICE_POP_PURPOSE_CREDENTIAL_ACTIVATION_V1;
    assert(
        device_pop_build_preimage_v1(&activation, out, sizeof(out))
        == DEVICE_POP_PREIMAGE_OK
    );
    print_hex(out, sizeof(out));

    device_pop_preimage_input_v1_t invalid = input;
    invalid.purpose_code = 0x03u;
    assert(
        device_pop_build_preimage_v1(&invalid, out, sizeof(out))
        == DEVICE_POP_PREIMAGE_INVALID_SEMANTICS
    );

    invalid = input;
    invalid.credential_version = 0u;
    assert(
        device_pop_build_preimage_v1(&invalid, out, sizeof(out))
        == DEVICE_POP_PREIMAGE_INVALID_SEMANTICS
    );

    invalid = input;
    invalid.expires_at_unix_ms = invalid.issued_at_unix_ms;
    assert(
        device_pop_build_preimage_v1(&invalid, out, sizeof(out))
        == DEVICE_POP_PREIMAGE_INVALID_SEMANTICS
    );

    assert(
        device_pop_build_preimage_v1(
            &input,
            out,
            DEVICE_POP_PREIMAGE_V1_SIZE - 1u
        ) == DEVICE_POP_PREIMAGE_INVALID_ARGUMENT
    );

    return 0;
}
