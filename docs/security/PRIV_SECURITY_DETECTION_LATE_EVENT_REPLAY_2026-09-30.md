# PRIV-SEC-DETECT-WATERMARK-01 — late-commit replay authority

**Issue:** #776  
**Parent:** #525 / #769  
**Date:** 2026-09-30  
**Status:** `REPOSITORY CANDIDATE / LATE-EVENT RECEIPT REPLAY / PRODUCTION DEPLOYMENT OPEN`

## 1. Problem

The #769 scheduler advances a durable half-open event-time cursor over
`security_audit_events.occurred_at`.

That is correct for normal scheduler progression, but it does not by itself
prove that every durable audit row will eventually be evaluated.

A transaction may commit after the scheduler has already advanced beyond the
row's `occurred_at`. An event-time-only cursor would then never select that row
again.

## 2. Rejected shortcuts

### `stored_at + UUID`

Rejected as a correctness watermark.

- `stored_at DEFAULT now()` is PostgreSQL transaction-time, not commit-time;
- UUID is not commit ordering;
- a transaction with an earlier-looking pair may commit after a later-looking
  row and be skipped by a monotonic watermark.

### BIGSERIAL / sequence alone

Also rejected as a commit watermark.

Sequence values are allocated before commit. A lower sequence value may commit
after a higher one.

### Fixed late-arrival lookback

Rejected as a correctness claim.

A hidden fixed interval merely changes which late rows can be lost. It does not
prove eventual evaluation and it silently introduces risk policy outside the
explicit detector configuration.

## 3. Selected repository model

Keep two separate concepts.

### Normal event-time progression

#769 remains authoritative for normal half-open scheduler windows:

`[last_successful_window_end, database_now)`

### Evaluation receipt ledger

`security_detection_evaluated_events` records only:

- canonical `security_audit_events.id`;
- database evaluation timestamp.

It stores no:
- actor id/role;
- target ref;
- email/IP/header;
- token;
- detector policy;
- detection body;
- alert body.

A durable audit row is therefore discoverable as long as it remains inside the
declared monitoring scope and has no evaluation receipt.

## 4. Monitoring scope

#776 adds immutable `monitoring_started_at` to
`security_detection_scheduler_state`.

For a newly initialized scheduler, it is the explicit
`initialWindowStart` supplied to the first successful tick.

For a scheduler row that existed before #776, migration 0038 backfills:

`monitoring_started_at = last_successful_window_end`

This is deliberately conservative. The repository does **not** retroactively
claim that older event-time history was monitored before the receipt authority
existed.

Later scheduler ticks update only `last_successful_window_end`; they never move
`monitoring_started_at`.

## 5. Tick semantics

Under the same PostgreSQL advisory-lock transaction:

1. run the normal canonical detector for the current event-time window;
2. require normal status `EVALUATED`;
3. discover canonical audit rows that:
   - have no receipt;
   - have `occurred_at >= monitoring_started_at`;
   - have `occurred_at < current window start`;
4. fail closed if the late-target batch exceeds the explicit `maxEvents`;
5. derive the event-time context radius from the **enabled explicit detector
   policy windows**;
6. run the unchanged canonical detector over that bounded context;
7. if the late re-evaluation succeeds, receipt:
   - the exact normal-window event ids;
   - the exact late target event ids;
8. do **not** receipt neighboring context rows merely because they participated
   in re-evaluation;
9. advance the normal scheduler cursor;
10. commit atomically.

If normal evaluation, late replay, receipt persistence or cursor persistence
fails, the transaction does not claim progress.

## 6. Why context is policy-derived

A late event can change a windowed result only together with neighboring
event-time events.

For the current detector the context radius is the maximum enabled explicit:
- repeated-denial `windowSeconds`;
- rapid-multi-target `windowSeconds`.

The machine-attempt detector needs no neighboring time window.

No additional “late tolerance” constant is introduced.

The replay range uses a 1 ms upper-bound increment solely to preserve inclusion
at the edge of the half-open query interval. It is not a risk/lookback policy.

## 7. Detection and alert boundary

Late replay may reproduce a detection that was already observable from another
evaluation window.

#776 therefore establishes **evaluation completeness**, not alert delivery
idempotency.

It does not:
- create a durable detection-history table;
- deliver an alert;
- deduplicate future alerts;
- acknowledge/escalate incidents;
- select an SIEM;
- select production thresholds;
- select a scheduler cadence;
- establish an SLA.

Future alert delivery under #526 must define deterministic delivery identity and
dedupe semantics before repeated evaluations can drive notifications.

## 8. Concurrency

The existing #769 PostgreSQL transaction-scoped advisory lock remains the
single scheduler serialization boundary.

A concurrent tick returns `BUSY`.

The receipt primary key provides an additional idempotency boundary for audit
event evaluation state, but it does not replace the scheduler lock.

## 9. Acceptance evidence

Disposable PostgreSQL must prove on both historical migrations and generated
Drizzle baseline:

- first successful scheduler start freezes `monitoring_started_at`;
- later ticks do not change that scope boundary;
- normal evaluated audit rows get receipts;
- a row committed after cursor advancement with an older `occurred_at` is
  discovered on a later tick;
- late replay derives enough context from the explicit policy to reproduce a
  windowed detection;
- only late target ids are newly receipted by replay;
- repeated ticks do not create duplicate receipts;
- overflow/failure leaves both receipts and cursor unchanged;
- cursor/receipt state contains no audit actor/target payload.

## 10. Gate

`EVENT_TIME_CURSOR = IMPLEMENTED_ON_MAIN_VIA_#779`

`LATE_COMMIT_DISCOVERY = RECEIPT_LEDGER_CANDIDATE`

`MONITORING_SCOPE = EXPLICIT + IMMUTABLE`

`HIDDEN_LATE_LOOKBACK = NONE`

`ALERT_DELIVERY_DEDUPE = OPEN_UNDER_#526`

`CONTINUOUS_PRODUCTION_DEPLOYMENT = OPEN`
