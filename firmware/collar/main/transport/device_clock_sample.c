/*
 * device_clock_sample.c — canonical BOOT_ANCHOR_V1 TAG clock-sample serializer.
 */

#include "device_clock_sample.h"

#include <string.h>

#define DEVICE_CLOCK_SAMPLE_HEADER 0xECu
#define DEVICE_CLOCK_SAMPLE_VERSION 0x01u

#define HEADER_OFFSET 0u
#define VERSION_OFFSET 1u
#define BOOT_SESSION_OFFSET 2u
#define DEVICE_MS_OFFSET 6u
#define CRC_OFFSET 10u

static void write_u32_le(uint8_t *out, size_t offset, uint32_t value)
{
    out[offset] = (uint8_t)(value & 0xFFu);
    out[offset + 1u] = (uint8_t)((value >> 8u) & 0xFFu);
    out[offset + 2u] = (uint8_t)((value >> 16u) & 0xFFu);
    out[offset + 3u] = (uint8_t)((value >> 24u) & 0xFFu);
}

static uint8_t xor_crc(const uint8_t *data, size_t length)
{
    uint8_t crc = 0;
    for (size_t i = 0; i < length; ++i) crc ^= data[i];
    return crc;
}

tag_device_clock_sample_result_t tag_device_clock_sample_encode(
    uint32_t boot_session_id,
    uint32_t device_ms,
    uint8_t *out,
    size_t out_len
)
{
    if (out == NULL || out_len != TAG_DEVICE_CLOCK_SAMPLE_FRAME_SIZE) {
        return TAG_DEVICE_CLOCK_SAMPLE_INVALID_ARGUMENT;
    }

    memset(out, 0, out_len);
    out[HEADER_OFFSET] = DEVICE_CLOCK_SAMPLE_HEADER;
    out[VERSION_OFFSET] = DEVICE_CLOCK_SAMPLE_VERSION;
    write_u32_le(out, BOOT_SESSION_OFFSET, boot_session_id);
    write_u32_le(out, DEVICE_MS_OFFSET, device_ms);
    out[CRC_OFFSET] = xor_crc(out, CRC_OFFSET);

    return TAG_DEVICE_CLOCK_SAMPLE_OK;
}
