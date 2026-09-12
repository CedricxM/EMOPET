# PRIV-01 erasure topology and disposition control — 12 September 2026

Status: technical implementation candidate in draft PR #224; #69 and `G-PRIV-ERASURE` remain open.

## Why this layer exists

The repository previously had privacy inventory and subject-lineage evidence but no
machine-readable statement of what PostgreSQL would actually do if `users.id` or
`dogs.id` were deleted. That distinction matters because relationship topology is
not erasure policy: a foreign key proves linkage, while `ON DELETE` mechanics only
describe database behavior.

The current candidate therefore separates four concerns:

1. **subject lineage** — which persisted relations are technically linked to a user
   or dog;
2. **database erasure topology** — whether PostgreSQL currently cascades, blocks or
   cannot enforce lifecycle through a relation;
3. **disposition authority** — the future approved choice between deletion,
   anonymisation, detachment or justified retention;
4. **execution evidence** — proof that the approved action actually ran across SQL
   and non-SQL copies.

No layer is allowed to silently stand in for another.

## Current account topology

`config/privacy/account-erasure-topology.json` is locked to the schema by
`backend/test/privacy-account-erasure-topology.test.mjs`.

The current schema has 15 direct foreign-key references to `users.id`. None declares
an explicit Drizzle `onDelete` action, so the registry records PostgreSQL's default
`NO_ACTION` behavior rather than claiming automatic cascade. A referenced user row
therefore cannot be assumed deletable until blocking relations are handled according
to an approved disposition.

`user_config.user_id` is separately recorded as
`NO_FK_LIFECYCLE_NOT_ENFORCED`. It does not block a PostgreSQL root delete by
referential integrity, but that absence of a foreign key also means the database
cannot prove lifecycle cleanup.

## Current dog topology

`config/privacy/dog-erasure-topology.json` and
`backend/test/privacy-dog-erasure-topology.test.mjs` lock the same distinction for
`dogs.id`.

The candidate currently records 10 canonical dog foreign keys, all with default
`NO ACTION`, plus 10 registered dog identifiers without canonical foreign-key
lifecycle enforcement. These include the ELI-v5 derived tables, copresence IDs and
the sanitized professional-share audit dog ID.

The latter audit relation is deliberately not interpreted here as delete or retain.
Its disposition remains a separate privacy/security authority decision.

## Transitive descendants

`config/privacy/subject-transitive-lineage.json` currently identifies
`behavioral_responses` and `behavioral_factor_scores` as one-hop children of
`behavioral_assessments`. Their schema uses explicit parent `ON DELETE CASCADE`.

That cascade is recorded as an execution mechanic only. It does not authorize
subject erasure or decide whether the parent assessment itself should be deleted,
anonymised, detached or retained under an approved exception.

## Disposition matrix

`config/privacy/erasure-disposition-matrix.json` is the future decision surface.
Its final disposition vocabulary is intentionally closed to:

- `DELETE`;
- `ANONYMIZE`;
- `DETACH`;
- `RETAIN_WITH_JUSTIFICATION`.

Every current SQL, unconstrained and transitive relation remains `TO_CONFIRM`.
`backend/test/privacy-erasure-disposition-matrix.test.mjs` requires the matrix to
remain one-to-one with the locked account, dog and transitive topology registries.
A relation cannot disappear from the disposition problem merely because a schema
file changes.

Five non-SQL completion surfaces are also explicit: object/media storage,
provider-held copies, caches/search indexes, analytics/telemetry and backups. They
remain `TO_CONFIRM / NOT_IMPLEMENTED`.

## Technical dependency order

`config/privacy/erasure-execution-dependency-plan.json` records only the dependency
order that would apply where a future approved disposition is `DELETE`.

Because the direct root foreign keys currently use `NO ACTION`, referencing rows
must be handled before the relevant root delete. For account deletion, the dog
subject root is a nested dependency through `dogs.owner_id`; its approved dog
lifecycle and required descendants must therefore be resolved before a `users.id`
root delete can be treated as executable.

Unconstrained identifiers do not automatically block the SQL root delete, but they
still block a complete-erasure claim until an explicit lifecycle step has run and
has evidence. Non-SQL copies remain separate completion gates and may require
provider-specific deletion or backup-expiry evidence outside the database
transaction.

`backend/test/privacy-erasure-execution-dependency-plan.test.mjs` keeps this plan
aligned with the locked topology rather than a manually drifting checklist.

## Promotion gate

`backend/test/privacy-erasure-promotion-gate.test.mjs` prevents readiness from being
created by changing a label alone.

For a SQL or transitive relation to move away from `TO_CONFIRM`, the candidate must
use an allowed final disposition, have non-placeholder approval authority, report
`IMPLEMENTED_AND_TESTED`, and provide non-empty machine-readable `evidenceRefs`.
Non-SQL surfaces likewise require resolved authority, execution/expiry evidence and
machine-readable evidence references.

While any relation or non-SQL surface remains unresolved,
`claimsExecutableErasure` must remain false.

## Explicit non-decisions

This work does not:

- choose delete versus anonymise/detach/retain for any current relation;
- assign a legal basis or retention duration;
- approve a security/audit retention exception;
- create a production account-deletion endpoint;
- prove provider-side deletion, object/media deletion, cache invalidation,
  analytics deletion or backup expiry;
- claim a complete data-subject erasure procedure;
- close `G-PRIV-ERASURE` or `G-PRIV-01`.

The next implementation stage is to obtain approved per-relation dispositions and
then build executable, concurrency-aware deletion/anonymisation behavior plus
negative residue tests against disposable PostgreSQL and every applicable non-SQL
surface. CI evidence for each exact candidate head is recorded on #69 / #224.
