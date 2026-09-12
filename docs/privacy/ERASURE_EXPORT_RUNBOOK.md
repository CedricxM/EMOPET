# EMOPET Export & Erasure Runbook

Status: `P0 EXPORT IMPLEMENTED / ERASURE IMPLEMENTATION OPEN`

## Export

The Data Act/access slice implements owner-scoped JSON/CSV export of currently persisted dog-scoped backend data.

Export must remain:

- authenticated;
- owner-scoped server-side;
- machine-readable;
- separated by measured/preprocessed/inferred level;
- transparent about unavailable raw data;
- auditable without exposing unnecessary device identifiers.

Account-scoped categories that are not part of the dog-scoped Data Act export, including support/contact requests, require their own rights projection before production. They must not be silently omitted from a future account-level access package or bolted onto a dog export with the wrong subject boundary.

### Account access coverage

`config/privacy/account-access-coverage.json` records the **current implementation coverage** for every direct `users.id` relation in the machine-readable subject-lineage registry. It is not a legal-rights decision matrix and it does not claim a complete DSAR/account export exists.

The distinction is intentional:

- `config/privacy/user-subject-lineage.json` answers **where direct account-linked PostgreSQL relations exist**;
- `config/privacy/account-access-coverage.json` answers **whether the current product has an explicit account-access projection for each direct relation**.

The coverage registry must stay one-to-one with direct subject lineage. Existing dog-scoped export and Owner self-list Contact behavior are recorded as separate/current surfaces, not re-labelled as a complete account package. Security-sensitive session state and all other unprojected direct relations remain visibly incomplete until a safe field-level projection or justified exclusion is explicitly reviewed.

A future account-access endpoint must not claim completeness merely because it can read `users` or a subset of directly linked tables. Indirect dog descendants, non-FK subject identifiers, object/media storage, processors/providers, caches/search indexes, analytics and backups remain outside the direct-FK coverage registry and require separate treatment.

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

### Machine-readable direct account lineage

`config/privacy/user-subject-lineage.json` is the controlled mechanical registry of direct PostgreSQL foreign-key references to `users.id` declared by the current Drizzle schemas. CI compares that registry to every `backend/db/schema/*.ts` file so a new direct account relation cannot be added silently.

This registry is deliberately narrower than a complete erasure or access graph. It does **not** enumerate indirect dog-linked descendants, rows linked only by non-FK identifiers, object/media storage, processors/providers, caches/search indexes, analytics or backups. A direct FK also does not decide whether a record is deleted, anonymised, retained under a justified hold or included in an account access package.

### Machine-readable dog lineage

`config/privacy/dog-subject-lineage.json` classifies dog-like identifier columns declared by the current Drizzle schemas into two mechanical groups:

- `canonicalForeignKeys`: columns with an explicit foreign key to canonical `dogs.id`;
- `unconstrainedDogIdentifiers`: `dog_id`, `dog_a_id` or `dog_b_id` columns that currently have no foreign key to `dogs.id`.

CI derives both groups from the schemas and compares them to the registry. This prevents a new dog-linked persistence path from being added silently, including legacy or audit tables that use dog identifiers without relational enforcement.

The unconstrained group is especially important for erasure design. Current examples include the legacy `eli-v5` tables, `copresence_events.dog_a_id/dog_b_id`, and the deliberately non-FK `professional_share_access_audits.dog_id`. Those rows cannot be assumed to follow a dog ownership transfer, dog deletion, or account deletion automatically.

This remains **technical lineage only**. A canonical FK does not authorize `ON DELETE CASCADE`, and an unconstrained identifier does not imply that the corresponding row must be deleted rather than anonymised or retained under an approved hold. Object/media storage, providers, caches, analytics, backups and identifiers outside the Drizzle PostgreSQL schemas remain outside this registry.

### Current Contact topology

The Product V1 Contact candidate now persists support requests in PostgreSQL table `contact_requests`. Its subject link is `contact_requests.requester_user_id -> users.id`, backed by a foreign key and canonical authenticated core-user UUID. The current candidate stores request id, reason, message, status, consent timestamp and record timestamps; it does not persist a separate caller-supplied owner token or direct phone/email contact value.

This relationship is **technical lineage, not an erasure decision**. The foreign key does not authorize an automatic SQL cascade, and no delete-vs-anonymise-vs-justified-retention policy is inferred from it. `G-PRIV-ERASURE` remains `OPEN` until the lifecycle policy and executor are approved and tested.

The historical Next.js file-backed Contact plane remains explicit non-production/demo-only legacy state. It must be considered when cleaning up development/demo environments, but it is not Product V1 durable PII authority and must not be used as evidence that production rights handling is complete.

## Current blocker

Canonical authentication/session and PostgreSQL foundations now exist as controlled Product V1 candidates, so they are no longer the sole reason erasure is unavailable. Destructive erasure must remain fail-closed until an approved lifecycle policy and executor cover, at minimum, delete-vs-anonymise decisions, justified holds, Community residue, object/media storage, provider-held copies, caches/indexes, security/audit evidence, account-scoped support/contact records and backup expiry.

No retention duration or deletion deadline is established by this runbook. Those decisions remain subject to the controlled privacy/legal approval path tracked by PRIV-01.

## Required tests before enabling deletion

- user A cannot erase user B;
- deletion requires recent authentication or equivalent strong confirmation;
- dog-only deletion does not erase another dog/account accidentally;
- account deletion covers all owned dogs and related data;
- account deletion enumerates canonical dog descendants and unconstrained dog identifiers separately;
- account deletion enumerates account-scoped support/contact records separately from dog-scoped data;
- revoked tokens cannot continue deletion/export;
- audit record contains no deleted sensitive payload;
- retries are idempotent;
- backup retention/expiry is documented.
