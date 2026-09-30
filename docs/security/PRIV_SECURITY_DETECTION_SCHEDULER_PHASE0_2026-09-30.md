# PRIV-SEC G5 — restart-safe detection scheduler tick

**Issue:** #769  
**Parent:** #525  
**Date:** 2026-09-30  
**Status:** `REPOSITORY CANDIDATE / CURSOR+SERIALIZATION / CONTINUOUS DEPLOYMENT OPEN`

## 1. Delivered repository boundary

This slice adds a bounded scheduler **tick**, not an internal infinite loop and not a production monitoring claim.

Each invocation:
1. requires the complete detector policy and policy revision;
2. acquires one PostgreSQL transaction-scoped advisory lock for the canonical `security-audit-v1` stream;
3. reads the durable last-successful window cursor;
4. requires an explicit initial start if no cursor exists;
5. uses PostgreSQL `CURRENT_TIMESTAMP` as the invocation's end boundary;
6. runs the existing canonical detector over the half-open interval `[start, end)`;
7. advances the cursor only when the detector returns `EVALUATED`;
8. leaves the cursor unchanged on invalid policy/request, source failure, source corruption or event-limit overflow.

A concurrent tick that cannot acquire the lock returns `BUSY`; it does not execute a duplicate window.

## 2. Durable state

Table:

`security_detection_scheduler_state`

Columns only:
- `stream_id`;
- `last_successful_window_end`;
- `updated_at`.

It contains no actor/subject, target reference, email, token, policy JSON, detection body or alert history.

## 3. Why no `setInterval()`

Cadence is an operations/deployment decision.

Embedding a process-local timer would:
- couple monitoring availability to one API process;
- create multi-instance duplicate-execution risk;
- lose schedule continuity on restart;
- imply a production cadence that has not been approved.

The repository therefore exposes a deterministic worker command that an external scheduler may invoke later.

## 4. Policy boundary

No production detector thresholds/windows are selected here.

Every tick still requires:
- `SECURITY_DETECTION_POLICY_JSON`;
- `SECURITY_DETECTION_POLICY_REVISION`;
- `SECURITY_DETECTION_MAX_EVENTS`.

The technical 10,000-row hard ceiling remains a resource guard, not a risk threshold.

## 5. Late-arrival boundary

The durable cursor proves **scheduler-window continuity**. It does not prove that an audit event can never be committed late with an `occurred_at` timestamp that falls before an already-completed cursor boundary.

Current audit storage preserves the canonical event occurrence time and does not expose a commit-order watermark contract. Therefore:

`ZERO_LOSS_FOR_UNBOUNDED_LATE_OCCURRED_AT_EVENTS = NOT_CLAIMED`

Before any zero-loss monitoring claim, choose and prove one explicit authority such as:
- a bounded allowed-ingestion-lateness rule plus overlap/deduplication; or
- a commit/watermark ordering contract suitable for the durable audit source.

Do not silently infer that authority from this cursor.

## 6. Still open under #525 / #526

- approved production detector policy;
- actual recurring scheduler/deployment;
- late-event/watermark authority;
- durable detection history, if selected;
- provider/SIEM monitoring;
- alert delivery/acknowledgement/escalation;
- response SLA;
- staging/production exercise.

## 7. Non-effects

This slice creates:
- no HTTP route;
- no audit-history read route;
- no alert transport;
- no detection-history table;
- no new personal-data collection;
- no production monitoring certification.

## 8. Gate

`DETECTION_SCHEDULER_CURSOR = CANDIDATE`

`CONTINUOUS_DEPLOYMENT = OPEN`

`PRODUCTION_POLICY = OPEN`

`LATE_EVENT_ZERO_LOSS = OPEN`

`ALERT_DELIVERY = OPEN_UNDER_#526`
