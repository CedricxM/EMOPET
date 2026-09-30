# AUTH-RATE-LIMIT-01 — shared auth abuse-control slice

**Issue:** #767  
**Parent:** #214  
**Date:** 2026-09-30  
**Status:** `SHARED POSTGRES AUTH LIMIT CANDIDATE / PRODUCTION EDGE EVIDENCE OPEN`

## Purpose

The existing backend quota for `/api/auth/*` is 20 requests per 60 seconds,
but its in-memory Map is process-local. Multiple API instances can therefore
multiply the effective allowance.

This slice keeps the existing quota unchanged and moves **auth only** to a
PostgreSQL-backed fixed-window counter.

## Shared state

Table:

`auth_rate_limit_windows`

The table stores:
- HMAC-SHA256 bucket hash;
- bounded counter;
- window start;
- reset timestamp;
- last update timestamp.

It does not store:
- raw client IP;
- forwarding-header values;
- email;
- account/user id;
- access/refresh token;
- request body.

The HMAC key is supplied by the dedicated server secret
`AUTH_RATE_LIMIT_HMAC_SECRET`, which must remain distinct from `JWT_SECRET`.

The bucket hash is **pseudonymous**, not anonymous.

## Proxy trust

The existing authority remains unchanged:

`EMOPET_TRUST_PROXY_HEADERS=true`

is required before the backend will use `cf-connecting-ip`, `x-real-ip` or
the first `x-forwarded-for` value.

This repository slice does not prove that a production proxy is correctly
configured or that those headers are sanitized by the edge.

## Atomicity

Every request uses one PostgreSQL `INSERT ... ON CONFLICT DO UPDATE` against
the bucket hash.

The database clock controls the fixed-window boundary.

Concurrent requests share one counter. The stored counter saturates at
`limit + 1` so blocked traffic does not grow it without bound.

## Failure semantics

If the shared store or HMAC configuration is unavailable, auth fails closed
with `503 rate_limit_unavailable`.

The middleware does **not** silently fall back to the older process-local Map.

A normal exceeded budget still returns the existing `429 rate_limited`
contract and rate-limit headers.

## Retention

Expired rows are removed using the indexed `reset_at` field on subsequent auth
checks. A dedicated cleanup primitive is also exposed for a future scheduler.

This is an opportunistic repository cleanup path, **not** evidence of a
production retention SLA. A scheduled cleanup policy remains open if the
deployment needs one.

## Out of scope

The general backend `/api/*` limiter remains process-local in this slice.

No Redis/vendor is selected. No CAPTCHA is added. No auth quota changes. No
claim is made that fixed-window limiting alone prevents credential stuffing.

## Gate

`AUTH_RATE_LIMIT_SHARED_STATE = POSTGRES_CANDIDATE`

`AUTH_RATE_LIMIT_POLICY = 20_PER_60_SECONDS_UNCHANGED`

`RAW_IP_PERSISTENCE = NONE`

`PRODUCTION_PROXY_EDGE_EVIDENCE = OPEN`

`GENERAL_API_DISTRIBUTED_LIMITING = OUT_OF_SCOPE`
