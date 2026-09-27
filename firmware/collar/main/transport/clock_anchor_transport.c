/*
 * clock_anchor_transport.c — C side of the bounded clock-anchor wire contract.
 */

#include "clock_anchor_transport.h"

#define REQUEST_NONCE_OFFSET 1u

#define RESPONSE_NONCE_OFFSET 3u
#define RESPONSE_BOOT_SESSION_OFFSET 7u
#define RESPONSE_DEVICE_MS_OFFSET 11u
#define RESPONSE_CRC_OFFSET 15u

static uint32_t read_u32_le(const uint8_t *data, size_t offset)
{
    return ((uint32_t)data[offset])
         | ((uint32_t)data[offset + 1u] << 8u)
         | ((uint32_t)data[offset + 2u] << 16u)
         | ((uint32_t)data[offset + 3u] << 24u);
}

static void write_u32_le(uint8_t *out, size_t offset, uint32_t value)
{
    out[offset] = (uint8_t)(value & 0xFFu);
    out[offset + 1u] = (uint8_t)((value >> 8u) & 0xFFu);
    out[offset + 2u] = (uint8_t)((value >> 16u) & 0xFFu);
    out[offset + 3u] = (uint8_t)((value >> 24u) & 0xFFu);
}

static uint8_t xor_crc(const uint8_t *data, size_t length)
{
    uint8_t crc = 0u;
    for (size_t i = 0; i < length; ++i) crc ^= data[i];
    return crc;
}

tag_clock_anchor_result_t tag_clock_anchor_parse_request(
    const uint8_t *request,
    size_t request_len,
    uint32_t *request_nonce
)
{
    if (request == NULL || request_nonce == NULL) {
        return TAG_CLOCK_ANCHOR_INVALID_ARGUMENT;
    }
    if (
        request_len != TAG_CLOCK_ANCHOR_REQUEST_SIZE
        || request[0] != TAG_CLOCK_ANCHOR_COMMAND_ID
    ) {
        return TAG_CLOCK_ANCHOR_INVALID_REQUEST;
    }

    *request_nonce = read_u32_le(request, REQUEST_NONCE_OFFSET);
    return TAG_CLOCK_ANCHOR_OK;
}

tag_clock_anchor_result_t tag_clock_anchor_encode_response(
    uint32_t request_nonce,
    uint32_t boot_session_id,
    uint32_t device_ms,
    uint8_t *out,
    size_t out_len
)
{
    if (out == NULL || out_len != TAG_CLOCK_ANCHOR_RESPONSE_SIZE) {
        return TAG_CLOCK_ANCHOR_INVALID_ARGUMENT;
    }

    out[0] = TAG_CLOCK_ANCHOR_RESPONSE_HEADER;
    out[1] = TAG_CLOCK_ANCHOR_RESPONSE_VERSION;
    out[2] = TAG_CLOCK_ANCHOR_RESPONSE_TYPE;
    write_u32_le(out, RESPONSE_NONCE_OFFSET, request_nonce);
    write_u32_le(out, RESPONSE_BOOT_SESSION_OFFSET, boot_session_id);
    write_u32_le(out, RESPONSE_DEVICE_MS_OFFSET, device_ms);
    out[RESPONSE_CRC_OFFSET] = xor_crc(out, RESPONSE_CRC_OFFSET);

    return TAG_CLOCK_ANCHOR_OK;
}
