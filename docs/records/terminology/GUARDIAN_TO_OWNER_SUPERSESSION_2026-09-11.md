# EMOPET — Guardian → Owner terminology supersession

**Decision date:** 2026-09-11  
**Status:** `PROJECT_DECISION / TERMINOLOGY SUPERSESSION`  
**Tracking:** DOMAIN-TERM #245

## Decision

`Guardian` is no longer the canonical EMOPET term for the person who owns the dog.

Canonical vocabulary:

- code/domain owner role: `Owner`;
- French product copy: `Propriétaire`;
- delegated trusted-person role: `Trusted Caregiver` where a non-owner receives scoped authority;
- `Responsable de l’animal` remains reserved for a possible future broader product/legal role and is not introduced by this migration.

This terminology change does **not** expand or weaken permissions, consent, privacy, sharing, deletion, device-binding or professional-access rules.

## Superseded terminology sources

The following source files remain in the repository as historical evidence and must not be treated as current terminology authority:

| Historical source | Canonical successor | Supersession scope |
|---|---|---|
| `docs/strategy/GUARDIAN_RELATIONSHIP_AND_PRODUCT_SCOPE_DOCTRINE_2026-09-07.md` | `docs/strategy/OWNER_RELATIONSHIP_AND_PRODUCT_SCOPE_DOCTRINE_2026-09-11.md` | terminology only |
| `docs/product/EMOPET_GUARDIAN_AUTHORITY_MASTER_v0.1.md` | `docs/product/EMOPET_OWNER_AUTHORITY_MASTER_v0.1.md` | terminology only |
| `docs/product/EMOPET_GUARDIAN_CONTINUITY_MASTER_v0.1.md` | `docs/product/EMOPET_OWNER_CONTINUITY_MASTER_v0.1.md` | terminology only |
| `docs/control/EMOPET_GUARDIAN_AUTHORITY_MASTER_v0.1.md` | `docs/control/EMOPET_OWNER_AUTHORITY_MASTER_v0.1.md` | terminology only; legacy gate identifier retained |
| `docs/control/EMOPET_GUARDIAN_PROFESSIONAL_SHARING_v0.1.md` | `docs/control/EMOPET_OWNER_PROFESSIONAL_SHARING_v0.1.md` | terminology only; legacy gate identifier retained |
| `docs/qa/EMOPET_GUARDIAN_AUTHORITY_BOLA_MATRIX_v0.1.md` | `docs/qa/EMOPET_OWNER_AUTHORITY_BOLA_MATRIX_v0.1.md` | terminology only; legacy QA gate identifier retained |

Historical files are retained unchanged so the repository preserves what was actually written and reviewed at the time.

## Role mapping

| Legacy label | Canonical label | Notes |
|---|---|---|
| `Guardian` | `Owner` | canonical dog-owner role |
| `PRIMARY_GUARDIAN` | `PRIMARY_OWNER` | same primary authority concept |
| `TRUSTED_GUARDIAN` | `TRUSTED_CAREGIVER` | delegated person; does not imply ownership |
| Guardian journal | Owner journal | same first-person context/evidence class |
| Guardian Continuity | Owner Continuity | same capability group |

## Phase C persistence and contract migration

DOMAIN-TERM #245 Phase C is complete for active professional-sharing persistence and runtime contracts.

Migration `0009_professional_share_owner_terminology.sql` establishes the canonical persisted names:

- `professional_share_grants.guardian_user_id` → `owner_user_id`;
- `idx_prof_share_grant_guardian_dog` → `idx_prof_share_grant_owner_dog`;
- authorization semantics and existing data are unchanged;
- historical migration `0006_professional_share_authority.sql` remains unchanged.

The active professional-sharing stack now uses Owner terminology end to end:

- Drizzle property `ownerUserId` mapped to `owner_user_id`;
- shared contract `ownerUserId`;
- `hasCurrentOwnerAuthority`;
- `OWNER_AUTHORITY_MISMATCH`;
- audit actor `OWNER`;
- Owner-named create/revoke validators;
- owner-scoped create/list/revoke route queries;
- Owner-named integration fixtures and assertions.

The temporary Drizzle `guardianUserId` compatibility bridge has been removed. No active professional-sharing contract or persistence adapter should reintroduce it.

## Phase D current-source migration

Phase D is complete for the current product/domain sources identified during the controlled migration.

Canonical Owner terminology now covers:

- active web runtime copy/comments and legacy compatibility modules;
- active owner-scoped backend integration fixtures and test descriptions;
- observed repository architecture and current reference docs;
- Owner Authority, Owner Continuity and professional-sharing controls;
- the canonical Owner BOLA QA successor;
- Core Capability / activation doctrine;
- Home / Today product authority;
- Humane Social Architecture;
- Founder Strategic Locks;
- Brittany local-entry strategy;
- Data / Trust / Business Model doctrine;
- project-memory policy;
- Language & Cultural Intelligence working authority;
- current P0 baseline-draft comments.

QA or control authorities that carried legacy `Guardian` filenames were migrated by creating Owner-named canonical successors rather than rewriting historical source files in place.

The BOLA QA matrix successor keeps `G-GUARDIAN-BOLA-QA-01` stable because the gate identifier is evidence lineage, not product vocabulary.

## Remaining `Guardian` occurrence classes

After the controlled migration, remaining `Guardian` strings are permitted only when they belong to one of these explicit classes:

1. **Historical evidence or superseded source**  
   Dated records, predecessor doctrines/masters, implementation records and evidence preserved to show what was actually written or reviewed at the time.

2. **Stable legacy gate/evidence identifier**  
   Identifiers such as `G-GUARDIAN-AUTHORITY-01`, `G-GUARDIAN-CONTINUITY-01`, `G-GUARDIAN-PROFESSIONAL-SHARE-01` and `G-GUARDIAN-BOLA-QA-01` remain stable for evidence continuity.

3. **Historical migration/schema lineage**  
   Migration `0006_professional_share_authority.sql` retains its original `guardian_user_id` spelling. Migration `0009` records the controlled rename to `owner_user_id`.

4. **Terminology regression/enforcement evidence**  
   Tests and this supersession record may contain the literal word `Guardian` when asserting that the active role is forbidden or when verifying a permitted historical identifier.

5. **External proper name / provider brand**  
   `GitGuardian` and configuration identifiers such as `API_GITGUARDIAN_*` are an external service name, not EMOPET's dog-owner role, and must not be renamed.

An occurrence outside these classes is a terminology regression and should be migrated or explicitly classified before being accepted.

## Legacy identifiers intentionally retained

The following identifiers may continue to contain `guardian` only for the explicit classes above:

- historical control/gate identifiers including `G-GUARDIAN-AUTHORITY-01`, `G-GUARDIAN-CONTINUITY-01`, `G-GUARDIAN-PROFESSIONAL-SHARE-01` and `G-GUARDIAN-BOLA-QA-01`;
- historical migration `0006_professional_share_authority.sql`, which records the schema originally authored at that point in time;
- historical filenames, implementation records and evidence whose purpose is to preserve what was reviewed at the time;
- terminology regression tests and supersession records that name the forbidden legacy role or stable evidence identifiers;
- external proper names such as GitGuardian.

The following are **not approved current identifiers**:

- `guardian_user_id` in current schema;
- `guardianUserId` in active code/contracts;
- `GuardianProfessionalShareGrantCreateSchema`;
- `GuardianProfessionalShareGrantRevokeSchema`;
- `hasCurrentGuardianAuthority`;
- `GUARDIAN_AUTHORITY_MISMATCH`;
- `Guardian` as the current EMOPET dog-owner role in active UI, product, strategy, runtime, API or current controlled documentation.

These retained historical names are evidence lineage, enforcement vocabulary or external names, not permission semantics and not approved vocabulary for new product code.

## Migration rule

New active product code, tests, UI copy and current controlled documentation must use canonical Owner terminology unless a legacy identifier is being referenced explicitly for compatibility, enforcement or historical traceability.

Do not perform a blind repository-wide replacement. Historical gate identifiers and evidence records remain stable unless a separately controlled compatibility plan changes them. External proper names such as GitGuardian remain unchanged.

## Delegated access rule

A trusted household member, pet-sitter, professional recipient or other delegate does not become an Owner merely because access is granted. The canonical Owner term must therefore not be mechanically substituted into non-owner actor roles.

**STATUS: TERMINOLOGY SUPERSESSION ACTIVE — PHASE C + PHASE D COMPLETE / REMAINING OCCURRENCES CLASSIFIED.**
