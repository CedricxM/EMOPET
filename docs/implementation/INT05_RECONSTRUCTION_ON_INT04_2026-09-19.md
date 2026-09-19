# INT-05 — recipient-bound backend reconstruction on INT-04

Status: `DRAFT / UNMERGED / FRESH-BASELINE CANDIDATE`.

Owner: #261. Prerequisite lineage: #319 → #327 → #334.
Exact integration base: `ebffaaf595877cc49642b996ea1dbdf09715509e`.
#335 mirrors that prerequisite head; #329/#331 remain superseded evidence.

## Decisions applied

The project authority explicitly selected **A/A** for the two INT-05 persistence decisions.

| Decision | Selected contract |
| --- | --- |
| H-05A-01 | PostgreSQL `ACTIVE` requires both non-null `recipient_principal_id` and non-null `activated_at`. |
| H-05A-02 | PostgreSQL scopes must be a JSON array of 1–5 members from the five existing scope names. Application creation/read validators continue to reject duplicates. |
| H-05D-01 | Mechanical contract correction: preserve real zero distance, MAT presence and vocal-event measurements; discard only null/undefined. Weight remains strictly positive. |

The database vocabulary includes `OWNER_SELECTED_NOTES` and `DECLARED_CONTEXT` because they are existing contract names. This does not enable them: Owner creation and access policy continue to refuse those scopes. Research remains unavailable.

The JSONB containment constraint deliberately does not claim uniqueness. Both insertion and update constraints are checked with direct PostgreSQL writes, independently of the application. Array shape is guarded with `CASE` before evaluating its length. See [PostgreSQL 16 JSONB containment](https://www.postgresql.org/docs/16/datatype-json.html#JSON-CONTAINMENT).

## Source receipts and selective replay

Frozen source #224: `7e0d90445a3cf03b094d7037aa6addbfa6f2cc19`.

- `backend/db/schema/professional-sharing.ts`: final Owner terminology, with A/A constraints added.
- `packages/shared/src/types/professional-share.ts` and `validators/professional-share.ts`: recipient, grant, strict Owner lifecycle and access contracts; additive barrel exports only.
- `backend/api/services/professional-share-access.ts`, `professional-share-db-authority.ts`, `professional-share-projection.ts`, `professional-share-recipient-read.ts`: selective file replay of internal backend authority.
- `backend/api/services/professional-share-vet-snapshot.ts`: bounded collector with the zero/null correction.
- `backend/api/routes/dogs.ts`: only professional-share lifecycle/helpers and the production generic-share hold are replayed. The frozen file's unrelated dog CRUD, absence comparison, erasure and unapproved 30-day report cap are not replayed.
- Frozen professional-share policy, persistence, concurrency, projection and publication tests are ported with additional A/A, zero/null, Owner creation and audit/projection-failure evidence. Sensor fixtures comply with INT-03A `ingestion_id`/device FK authority.
- `scripts/security/professional-share-authority-audit.mjs`: reconstructed backend/shared guard. Frozen mobile hold checks remain owned by INT-09/#265, and historical migration filenames are not required as active files.
- #277 source-failure successor at `89a32872b69081e65816c942f6faf72186d7df05`: `backend/test/professional-share-source-failure.integration.test.mjs`, unchanged selective test replay.

No bulk cherry-pick or whole-file replay of the mixed `dogs.ts` source is used.

## Fresh baseline and historical SQL

`NO_EXISTING_DB_TO_PRESERVE` and #258 Model A apply. No active migration number is allocated, no SQL is promoted, and existing-database upgrade readiness is not claimed.

`backend/db/fresh-baseline-only-tables.json` records exactly two newly generated tables plus frozen SQL blob provenance:

- `professional_share_grants`;
- `professional_share_access_audits`.

Historical `0006_professional_share_authority.sql` and `0009_professional_share_owner_terminology.sql` remain source provenance. The generated schema starts directly with final Owner terminology and the approved constraints.

Static and PostgreSQL inventory checks require the generated table set to equal the unchanged historical table set plus exactly these two additions. This is an explicit fresh/historical delta, not a claim that historical migrations create the new tables. Historical repeatability and CREATE-before-ALTER checks remain in force.

## Runtime boundaries

Owner create/list/revoke consumes current ownership under a bounded transaction and dog row `FOR SHARE`; revocation then takes the grant row `FOR UPDATE`. Concurrent retries retain the first committed revocation evidence. Created grants remain `PENDING`, with no principal and no activation timestamp. Owner responses omit the recipient principal.

Recipient reads remain internal. Provider-neutral evidence is runtime-validated, collection is bounded to the authorized dog and both time limits, and publication locks dog → grant before repeating the durable policy. Transfer, revocation, expiry, audit failure or projection failure blocks collected data. Authoritative empty data is distinct from source failure.

The publication transaction retains the source's READ COMMITTED semantics so its final locked reads observe a mutation that committed during collection. This implementation does not settle the separate final snapshot-versus-live Product/Privacy policy. No recipient-read or activation HTTP route is added, and no identity provider is implemented.

The generic bearer-sharing path is refused in production, including when its legacy development flag is set. This does not promote its remaining development-only/report semantics as Product V1 authority.

## Privacy composition

The existing INT-04 REPEATABLE READ discovery transaction now counts Owner grants, grants linked to selected current dogs, and audits carrying selected dog identifiers. It publishes no recipient metadata, principal, audit reason, provider evidence or report contents. Unknown audit identifiers do not establish verified subject attribution.

Slice-local lineage, topology, disposition, residue and export registries are extended from the actual #334 base:

- 14 direct user FKs;
- 17 direct dog FKs;
- 3 unconstrained dog identifiers;
- explicit unconstrained audit `grant_id` relation;
- both new persistence tables remain unclassified for final privacy inventory purposes;
- grants/audits remain outside the current Owner export;
- lifecycle dispositions remain `TO_CONFIRM`, residue probes remain unimplemented, and all complete-erasure/export claims remain false.

The inherited topology workflow set `PRIVACY_ERASURE_TOPOLOGY_DB_INTEGRATION`, while its test reads `PRIVACY_TOPOLOGY_DB_INTEGRATION`. This reconstruction fixes the workflow variable so catalog/FK validation actually runs; prior green aggregate status alone did not prove that particular runtime subtest executed.

## Verification and remaining gates

The P0 generated-database workflow adds the focused INT-05 suite alongside inherited AUTH, identity, sensor provenance, discovery, topology and export checks. It exercises direct DB constraints, Owner lifecycle concurrency, private response projection, provider-evidence validation, requested scopes/time bounds, zero/missingness, source failure and final publication failures.

Local dependency installation was rejected by the host's supply-chain policy for four pre-existing lockfile entries (`eslint-import-resolver-typescript@3.10.1`, `semver@5.7.2`, `ua-parser-js@1.0.41`, `undici-types@6.21.0`). No policy was relaxed and no dependency/lockfile change is included. Local checks are dependency-free static/syntax checks; build, database and security acceptance must come from the repository's existing isolated CI at the candidate SHA.

Record exact candidate SHA and workflow runs on the canonical PR after completion. A draft or green build is not merge/release authority.

`G-GUARDIAN-AUTHORITY-01` remains OPEN: professional proofing, provider selection, server binding, activation, delivery, recipient HTTP access, selected notes/context, research consent, final retention and final snapshot/live policy are not authorized here.
