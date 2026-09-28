/*
 * activity_feature_summary.c — canonical TAG feature-summary serializer.
 */

#include "activity_feature_summary.h"

#include <math.h>
#include <string.h>

#define FEATURE_SUMMARY_HEADER 0xEBu
#define FEATURE_SUMMARY_TRANSPORT_VERSION 0x01u
#define SOURCE_TAG 0x02u
#define FEATURE_ACTIVITY_VARIABILITY 0x01u
#define FEATURE_ACTIVITY_VARIABILITY_CONTRACT_VERSION 0x01u

#define OBSERVED 0x00u
#define NOT_OBSERVED 0x01u

#define NULL_NONE 0x00u
#define NULL_INSUFFICIENT_COVERAGE 0x01u
#define NULL_MEAN_BELOW_DIVISION_GUARD 0x02u

#define HEADER_OFFSET 0u
#define VERSION_OFFSET 1u
#define SOURCE_OFFSET 2u
#define FEATURE_ID_OFFSET 3u
#define CONTRACT_VERSION_OFFSET 4u
#define SEQUENCE_OFFSET 5u
#define BOOT_SESSION_OFFSET 7u
#define WINDOW_END_OFFSET 11u
#define WINDOW_SECONDS_OFFSET 15u
#define VALID_SECONDS_OFFSET 17u
#define STATUS_OFFSET 19u
#define NULL_REASON_OFFSET 20u
#define QUALITY_OFFSET 21u
#define VALUE_OFFSET 22u
#define CRC_OFFSET 26u

static void write_u16_le(uint8_t *out, size_t offset, uint16_t value)
{
    out[offset] = (uint8_t)(value & 0xFFu);
    out[offset + 1u] = (uint8_t)((value >> 8u) & 0xFFu);
}

static void write_u32_le(uint8_t *out, size_t offset, uint32_t value)
{
    out[offset] = (uint8_t)(value & 0xFFu);
    out[offset + 1u] = (uint8_t)((value >> 8u) & 0xFFu);
    out[offset + 2u] = (uint8_t)((value >> 16u) & 0xFFu);
    out[offset + 3u] = (uint8_t)((value >> 24u) & 0xFFu);
}

static void write_f32_le(uint8_t *out, size_t offset, float value)
{
    uint32_t bits = 0;
    _Static_assert(sizeof(float) == sizeof(uint32_t), "feature transport requires float32");
    memcpy(&bits, &value, sizeof(bits));
    write_u32_le(out, offset, bits);
}

static uint8_t xor_crc(const uint8_t *data, size_t length)
{
    uint8_t crc = 0;
    for (size_t i = 0; i < length; ++i) crc ^= data[i];
    return crc;
}

static int valid_quality(tag_feature_quality_t quality)
{
    return quality == TAG_FEATURE_QUALITY_VALID
        || quality == TAG_FEATURE_QUALITY_DEGRADED
        || quality == TAG_FEATURE_QUALITY_SUPPRESSED;
}

tag_feature_summary_result_t tag_feature_summary_encode_activity_variability(
    const tag_activity_feature_summary_input_t *input,
    uint8_t *out,
    size_t out_len
)
{
    if (input == NULL || out == NULL || out_len != TAG_FEATURE_SUMMARY_FRAME_SIZE) {
        return TAG_FEATURE_SUMMARY_INVALID_ARGUMENT;
    }
    if (!valid_quality(input->quality)) {
        return TAG_FEATURE_SUMMARY_INVALID_SEMANTICS;
    }
    if (input->observation.valid_seconds > ACTIVITY_WINDOW_SEC) {
        return TAG_FEATURE_SUMMARY_INVALID_SEMANTICS;
    }

    uint8_t status = NOT_OBSERVED;
    uint8_t null_reason = NULL_NONE;
    float value = 0.0f;

    switch (input->observation.status) {
        case ACTIVITY_VARIABILITY_OBSERVED:
            if (input->observation.valid_seconds < ACTIVITY_MIN_VALID_COUNT
                || !isfinite(input->observation.value)
                || input->observation.value < 0.0f
                || input->quality == TAG_FEATURE_QUALITY_SUPPRESSED) {
                return TAG_FEATURE_SUMMARY_INVALID_SEMANTICS;
            }
            status = OBSERVED;
            value = input->observation.value;
            break;

        case ACTIVITY_VARIABILITY_NOT_OBSERVED_INSUFFICIENT_COVERAGE:
            if (input->observation.valid_seconds >= ACTIVITY_MIN_VALID_COUNT) {
                return TAG_FEATURE_SUMMARY_INVALID_SEMANTICS;
            }
            null_reason = NULL_INSUFFICIENT_COVERAGE;
            break;

        case ACTIVITY_VARIABILITY_NOT_OBSERVED_MEAN_BELOW_DIVISION_GUARD:
            if (input->observation.valid_seconds < ACTIVITY_MIN_VALID_COUNT) {
                return TAG_FEATURE_SUMMARY_INVALID_SEMANTICS;
            }
            null_reason = NULL_MEAN_BELOW_DIVISION_GUARD;
            break;

        default:
            return TAG_FEATURE_SUMMARY_INVALID_SEMANTICS;
    }

    memset(out, 0, out_len);
    out[HEADER_OFFSET] = FEATURE_SUMMARY_HEADER;
    out[VERSION_OFFSET] = FEATURE_SUMMARY_TRANSPORT_VERSION;
    out[SOURCE_OFFSET] = SOURCE_TAG;
    out[FEATURE_ID_OFFSET] = FEATURE_ACTIVITY_VARIABILITY;
    out[CONTRACT_VERSION_OFFSET] = FEATURE_ACTIVITY_VARIABILITY_CONTRACT_VERSION;
    write_u16_le(out, SEQUENCE_OFFSET, input->sequence);
    write_u32_le(out, BOOT_SESSION_OFFSET, input->boot_session_id);
    write_u32_le(out, WINDOW_END_OFFSET, input->window_end_ms);
    write_u16_le(out, WINDOW_SECONDS_OFFSET, ACTIVITY_WINDOW_SEC);
    write_u16_le(out, VALID_SECONDS_OFFSET, input->observation.valid_seconds);
    out[STATUS_OFFSET] = status;
    out[NULL_REASON_OFFSET] = null_reason;
    out[QUALITY_OFFSET] = (uint8_t)input->quality;
    write_f32_le(out, VALUE_OFFSET, value);
    out[CRC_OFFSET] = xor_crc(out, CRC_OFFSET);

    return TAG_FEATURE_SUMMARY_OK;
}
