# EMOPET Export & Erasure Runbook

Status: `P0 EXPORT IMPLEMENTED / ERASURE IMPLEMENTATION OPEN`

## Export

The parallel Data Act/access slice implements owner-scoped JSON/CSV export of currently persisted backend data.

Export must remain:

- authenticated;
- owner-scoped server-side;
- machine-readable;
- separated by measured/preprocessed/inferred level;
- transparent about unavailable raw data;
- auditable without exposing unnecessary device identifiers.

## Erasure request lifecycle

1. authenticate the requester;
2. identify account and owned dogs;
3. freeze non-essential new processing for the subject where technically appropriate;
4. enumerate records across all durable stores;
5. identify legal/security records that require temporary retention;
6. delete or anonymise eligible records;
7. schedule backup expiry/deletion according to the approved backup policy;
8. invalidate sessions/share grants/device bindings;
9. record the erasure action without retaining the erased content;
10. communicate completion or justified exceptions.

## Cascade map to implement

At minimum verify deletion/anonymisation for:

- account;
- dog profiles;
- device bindings/identifiers;
- sensor summaries;
- raw sensor data if ever persisted;
- ELI states and baselines;
- health entries;
- journal/contact data;
- community posts/replies/events/map contributions;
- share tokens/grants;
- uploaded documents/media;
- caches/search indexes/vector stores;
- analytics/telemetry identifiers;
- backups according to policy.

## Current blocker

A destructive erasure endpoint must not be added while authentication/session authority and the final database baseline are still under controlled P0 review. Until those are merged and tested, erasure remains `OPEN_IMPLEMENTATION` rather than a fake button or unsafe cascading delete.

## Required tests before enabling deletion

- user A cannot erase user B;
- deletion requires recent authentication or equivalent strong confirmation;
- dog-only deletion does not erase another dog/account accidentally;
- account deletion covers all owned dogs and related data;
- revoked tokens cannot continue deletion/export;
- audit record contains no deleted sensitive payload;
- retries are idempotent;
- backup retention/expiry is documented.
