/*
 * clock_anchor_transport.h — bounded Config-characteristic clock probe.
 *
 * Wire contract:
 * request  = [0x14, request_nonce u32 LE]
 * response = [0xEC, v1, type=1, request_nonce u32 LE,
 *             boot_session_id u32 LE, device_ms u32 LE, xor_crc]
 *
 * This is transport/time provenance only. It is not authentication,
 * authorization, key material or proof of possession.
 */

#pragma once

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

#define TAG_CLOCK_ANCHOR_COMMAND_ID 0x14u
#define TAG_CLOCK_ANCHOR_REQUEST_SIZE 5u
#define TAG_CLOCK_ANCHOR_RESPONSE_SIZE 16u
#define TAG_CLOCK_ANCHOR_RESPONSE_HEADER 0xECu
#define TAG_CLOCK_ANCHOR_RESPONSE_VERSION 0x01u
#define TAG_CLOCK_ANCHOR_RESPONSE_TYPE 0x01u

typedef enum {
    TAG_CLOCK_ANCHOR_OK = 0,
    TAG_CLOCK_ANCHOR_INVALID_ARGUMENT = 1,
    TAG_CLOCK_ANCHOR_INVALID_REQUEST = 2,
} tag_clock_anchor_result_t;

tag_clock_anchor_result_t tag_clock_anchor_parse_request(
    const uint8_t *request,
    size_t request_len,
    uint32_t *request_nonce
);

tag_clock_anchor_result_t tag_clock_anchor_encode_response(
    uint32_t request_nonce,
    uint32_t boot_session_id,
    uint32_t device_ms,
    uint8_t *out,
    size_t out_len
);

#ifdef __cplusplus
}
#endif
