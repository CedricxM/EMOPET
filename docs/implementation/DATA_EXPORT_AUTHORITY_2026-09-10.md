# DATA-01 export authority — 10 September 2026

Status: implementation candidate in draft PR #224; #68 and #69 remain open.

## Defect and correction

The portability route checked dog ownership and then performed four independent
database reads. An owner transfer could commit between that check and data
collection. The route also lacked private/no-store response controls and a
sanitized source-unavailability response.

The candidate now reads the owner-scoped dog with `FOR SHARE` inside the same
READ COMMITTED transaction as devices, sensor summaries, ELI and baseline reads.
An already running owner change is waited on and rechecked; later transfers or
deletion wait until collection completes. A five-second lock timeout and a
ten-second statement timeout bound database waits. A database failure returns
`503 DATA_EXPORT_UNAVAILABLE`, without a partial attachment or database details.

This is an authorization boundary during collection. It is not a global
point-in-time snapshot, a streaming/large-export design or revocation of bytes
already delivered. These properties require separate designs if needed.

The router requires a canonical authenticated identity, validates the dog UUID
before SQL/attachment naming and sets private/no-store plus nosniff headers.
Existing interval validation and publication policy remain authoritative:
internal ELI fields and opaque baseline metrics stay withheld, no high-rate raw
streams are fabricated, and device MAC addresses remain excluded.

## JSON and CSV

Both formats consume the same projections and chronological observation order.
The interval filters sensor summaries and ELI history; device/profile/baseline
metadata remain current available context, not historical reconstructions.

The CSV encoder prefixes formula-like text with an apostrophe, quotes that cell
and doubles embedded quotes, including whitespace/control and full-width prefix
cases. Numeric values remain numeric; JSON strings remain unchanged. The policy
is advertised by `capabilities.csvTextPolicy`. This mitigation is limited to the
emitted file: spreadsheet edit/save/re-open behavior varies. Machine consumers
should use JSON when preserving original text is essential.

References:
- [PostgreSQL row locks](https://www.postgresql.org/docs/16/explicit-locking.html#LOCKING-ROWS)
- [OWASP CSV injection guidance](https://github.com/OWASP/www-community/blob/master/pages/attacks/CSV_Injection.md)

## Evidence

`backend/test/data-export-runtime.integration.test.mjs` authenticates requests
with real candidate access JWTs against disposable PostgreSQL. It parses actual
JSON/CSV downloads and checks interval boundaries/order, publication gates,
internal sentinel and MAC exclusion, spreadsheet-like text, quoted newlines,
negative numeric preservation, missing/other-Guardian denials, and true empty data.

Two scenarios observe PostgreSQL lock waiters to prove transfer-before-export
denial and ownership-lock retention throughout reads. A real blocked source read
exercises the timeout/503 boundary and successful recovery. Waiter observation is
limited to this test's connections. The P0 workflow now includes export route,
policy and test paths so later changes trigger disposable PostgreSQL validation.

CI evidence is recorded on #68 and #224 after the exact candidate run completes.
No retention duration, erasure policy, processor, sensitive-action re-authentication
policy, direct third-party delegation or legal Data Act classification is decided.
