/*
 * device_identity_key_slots.h — EMOPET PSA application key-id namespace.
 *
 * Key ids are storage addresses, not credential identities.
 * Credential versions must never be derived from slot parity or vice versa.
 */

#pragma once

#include <stdbool.h>

#include <psa/crypto.h>

#ifdef __cplusplus
extern "C" {
#endif

#define EMOPET_DEVICE_TRUST_KEY_BLOCK_MIN ((psa_key_id_t)0x00010000u)
#define EMOPET_DEVICE_TRUST_KEY_BLOCK_MAX ((psa_key_id_t)0x0001000fu)

#define EMOPET_DEVICE_IDENTITY_KEY_SLOT_A ((psa_key_id_t)0x00010000u)
#define EMOPET_DEVICE_IDENTITY_KEY_SLOT_B ((psa_key_id_t)0x00010001u)

typedef enum {
    DEVICE_IDENTITY_KEY_SLOT_INVALID = 0,
    DEVICE_IDENTITY_KEY_SLOT_A = 1,
    DEVICE_IDENTITY_KEY_SLOT_B = 2,
} device_identity_key_slot_t;

static inline bool device_identity_key_id_is_reserved_slot(psa_key_id_t key_id)
{
    return key_id == EMOPET_DEVICE_IDENTITY_KEY_SLOT_A
        || key_id == EMOPET_DEVICE_IDENTITY_KEY_SLOT_B;
}

static inline device_identity_key_slot_t
device_identity_key_slot_from_id(psa_key_id_t key_id)
{
    if (key_id == EMOPET_DEVICE_IDENTITY_KEY_SLOT_A) {
        return DEVICE_IDENTITY_KEY_SLOT_A;
    }
    if (key_id == EMOPET_DEVICE_IDENTITY_KEY_SLOT_B) {
        return DEVICE_IDENTITY_KEY_SLOT_B;
    }
    return DEVICE_IDENTITY_KEY_SLOT_INVALID;
}

#ifdef __cplusplus
}
#endif
