#include <assert.h>
#include <stdint.h>
#include <stdio.h>

#include "../main/transport/clock_anchor_transport.h"

static void print_hex(const uint8_t *bytes, size_t length)
{
    for (size_t i = 0; i < length; ++i) printf("%02x", bytes[i]);
    printf("\n");
}

int main(void)
{
    const uint8_t request[TAG_CLOCK_ANCHOR_REQUEST_SIZE] = {
        TAG_CLOCK_ANCHOR_COMMAND_ID,
        0x78, 0x56, 0x34, 0x12
    };
    uint32_t nonce = 0u;
    assert(tag_clock_anchor_parse_request(
        request,
        sizeof(request),
        &nonce
    ) == TAG_CLOCK_ANCHOR_OK);
    assert(nonce == 0x12345678u);

    uint8_t response[TAG_CLOCK_ANCHOR_RESPONSE_SIZE];
    assert(tag_clock_anchor_encode_response(
        nonce,
        0x10203040u,
        0x55667788u,
        response,
        sizeof(response)
    ) == TAG_CLOCK_ANCHOR_OK);

    print_hex(response, sizeof(response));
    return 0;
}
