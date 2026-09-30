# PRIV-SEC G5 — Phase-0 security-detection runtime slice

**Issue:** #525  
**Parent:** #154  
**Date:** 2026-09-30  
**Status:** `DB SOURCE + ONE-SHOT EXECUTION CANDIDATE / CONTINUOUS MONITORING OPEN`

## 1. Purpose

Connect the merged canonical anomaly detector to the merged durable
`security_audit_events` source without inventing production thresholds,
provider monitoring or alert-delivery authority.

This slice is intentionally a one-shot internal execution boundary.

## 2. Source authority

Source:

`security_audit_events`

The runtime reconstructs the bounded `security-audit-v1` event shape and
re-validates each row through the canonical parser before the event can
contribute to a detection.

It does not consume free-form application logs.

## 3. Explicit runtime request

Every run must supply:

- schema version;
- policy revision;
- explicit UTC window start;
- explicit UTC window end;
- explicit event-count limit;
- complete canonical anomaly-detection policy.

There are **no detector threshold/window defaults** in the runtime.

The repository hard cap of 10,000 rows is a technical resource ceiling only.
It is not a security threshold, production scheduling decision or risk-policy
value.

## 4. Fail-closed states

The runtime distinguishes:

- `INVALID_REQUEST`;
- `INVALID_POLICY`;
- `SOURCE_UNAVAILABLE`;
- `SOURCE_INVALID`;
- `EVENT_LIMIT_EXCEEDED`;
- `EVALUATED`.

Database/source failure never becomes a successful empty evaluation.

A scan that exceeds the explicit event limit fails rather than silently
truncating evidence.

## 5. One-shot worker

Worker:

`backend/api/workers/security-detection-scan.ts`

The worker requires explicit environment inputs for every run.

It emits only:
- status;
- policy revision;
- scan window;
- event count;
- detection count;
- count by canonical detection type.

It does **not** emit actor UUIDs/service keys or target references to stdout.

## 6. What this advances

This slice materially advances:

- RUNTIME-G1 — canonical durable event source;
- an executable internal boundary for RUNTIME-G2;
- deterministic explicit-policy execution for RUNTIME-G3;
- canonical detector coverage for RUNTIME-G4;
- failure visibility for RUNTIME-G6;
- disposable/staging executable evidence for RUNTIME-G7.

## 7. What remains open

This slice does not close #525.

Still OPEN:
- approved production thresholds/windows;
- real continuous scheduler/deployment;
- durable detection-history authority;
- operational coverage statement;
- provider/SIEM monitoring;
- external alert delivery and acknowledgement (#526);
- response SLA;
- staging/production runtime evidence.

No HTTP audit-history or detection route is added.

## 8. Gate

`PRIV-SEC-G5 = CONTRACT COMPLETE / DB SOURCE + ONE-SHOT RUNTIME CANDIDATE / CONTINUOUS OPS OPEN`

`PRODUCTION_SECURITY_MONITORING = NOT_ESTABLISHED`
