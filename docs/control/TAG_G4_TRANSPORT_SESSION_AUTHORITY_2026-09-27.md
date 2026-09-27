# TAG G4 transport-session authority

**Issue:** #625  
**Date:** 2026-09-27  
**Status:** `G4 CANDIDATE / LIVE NO-BUFFER PATH ONLY / PRODUCTION COLLISION POLICY OPEN`

## Purpose

The feature-summary frame already carries:

- `boot_session_id: uint32`;
- `sequence: uint16`;
- monotonic measurement-window end.

The host/backend already uses the transport tuple:

`deviceId + featureKey + bootSessionId + sequence`

as replay evidence.

This document makes the **current firmware behavior explicit without promoting
it to production-grade uniqueness**.

## Current boot-session behavior

The canonical NCS GATT scaffold currently creates one non-security
`boot_session_id` during application Bluetooth initialization using
`sys_rand32_get()`.

Properties:

- 32-bit;
- generated once per application boot;
- not persisted across reset;
- a warm/software reset produces a new candidate session;
- a power cycle produces a new candidate session;
- not a credential;
- not a proof-of-possession value;
- not a cryptographic nonce authority;
- not guaranteed globally unique.

A 32-bit random discriminator has a non-zero collision probability across a long
device history. The backend replay key means a repeated boot-session value plus
a repeated sequence can collide with historical replay identity.

Therefore this source is **acceptable only as the current pre-production
live-path candidate**, not as closed production collision policy.

## Current sequence behavior

The current GATT path:

1. starts sequence at `0` for each boot session;
2. serializes the current sequence into the feature frame;
3. sends a live BLE notification;
4. increments the uint16 sequence only after a successful notify return;
5. reuses the same sequence if the notify attempt fails before acceptance.

Unsigned uint16 wrap is canonical modulo 65536.

The host classifier already treats:
- same session + same sequence = duplicate;
- +1 including 65535→0 = contiguous;
- bounded forward delta = forward gap;
- large reverse delta = out of order;
- different boot session = new session.

## Important buffering boundary

There is currently **no durable offline/backfill queue**.

The existing "increment after successful notify" rule is a live no-buffer rule.
It must not silently become the policy for a future queue.

Before reconnect/backfill storage exists, EMOPET must decide whether sequence is
allocated at:
- measurement completion;
- enqueue time;
- or another explicit producer-owned event.

For buffered data, allocating sequence at eventual send time would make
transport ordering describe delivery order rather than measurement/enqueue
order.

This gate therefore requires a future buffering design before offline delivery
can be claimed.

## Time boundary

#633 already moved `window_end_ms` out of notification-time ownership.

The feature producer owns the real monotonic measurement-window end.

GATT may not substitute send time.

UTC remains outside the TAG. `BOOT_ANCHOR_V1` creation and uncertainty remain
G5/open authority.

## Device Trust boundary

Neither boot-session random value nor sequence is security identity.

They must not be used as:
- device credential;
- key material;
- authentication nonce authority;
- claim/bind proof;
- secure-command anti-replay authority.

Device Trust remains #66.

## Current decision

Keep the current source behavior visible for the live no-buffer scaffold, but:

`DO_NOT_CLAIM_PRODUCTION_SESSION_UNIQUENESS`

Production closure requires an explicit collision/reboot/persistence policy and
must remain compatible with the backend replay tuple.
