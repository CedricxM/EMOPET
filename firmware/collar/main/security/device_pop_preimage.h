/*
 * device_pop_preimage.h — portable DEVICE_POP_CHALLENGE_V1 preimage builder.
 *
 * This module owns binary serialization only.
 * It does NOT own private-key storage, PSA Crypto, challenge transport,
 * authentication success, Device Data Trust or telemetry persistence.
 */

#pragma once

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

#define DEVICE_POP_PREIMAGE_V1_SIZE 106u
#define DEVICE_POP_UUID_BYTES 16u
#define DEVICE_POP_NONCE_BYTES 32u

typedef enum {
    DEVICE_POP_PURPOSE_TELEMETRY_INGRESS_V1 = 1u,
    DEVICE_POP_PURPOSE_CREDENTIAL_ACTIVATION_V1 = 2u,
} device_pop_purpose_v1_t;

typedef struct {
    device_pop_purpose_v1_t purpose;
    uint8_t device_id[DEVICE_POP_UUID_BYTES];
    uint32_t credential_version;
    uint8_t challenge_id[DEVICE_POP_UUID_BYTES];
    uint8_t nonce[DEVICE_POP_NONCE_BYTES];
    uint64_t issued_at_unix_ms;
    uint64_t expires_at_unix_ms;
} device_pop_preimage_input_v1_t;

typedef enum {
    DEVICE_POP_PREIMAGE_OK = 0,
    DEVICE_POP_PREIMAGE_INVALID_ARGUMENT = 1,
    DEVICE_POP_PREIMAGE_INVALID_SEMANTICS = 2,
} device_pop_preimage_result_t;

/**
 * Build EMOPET_DEVICE_POP_FIXED_BINARY_V1 exactly:
 *
 * DOMAIN || protocol(1) || purpose(1) || device UUID(16) ||
 * credential version u32 BE || challenge UUID(16) || nonce(32) ||
 * issued-at u64 BE || expires-at u64 BE.
 *
 * UUID byte arrays MUST already be RFC4122/network-order raw bytes.
 */
device_pop_preimage_result_t device_pop_build_preimage_v1(
    const device_pop_preimage_input_v1_t *input,
    uint8_t *out,
    size_t out_len
);

#ifdef __cplusplus
}
#endif
