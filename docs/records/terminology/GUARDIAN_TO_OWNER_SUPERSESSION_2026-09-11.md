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

## Legacy identifiers intentionally retained

The following identifiers may continue to contain `guardian` only for explicit compatibility/history:

- historical control/gate identifiers including `G-GUARDIAN-AUTHORITY-01`, `G-GUARDIAN-CONTINUITY-01` and `G-GUARDIAN-PROFESSIONAL-SHARE-01`;
- historical migration `0006_professional_share_authority.sql`, which records the schema originally authored at that point in time;
- historical filenames, implementation records and evidence whose purpose is to preserve what was reviewed at the time.

The following are **not approved current identifiers** after Phase C:

- `guardian_user_id` in current schema;
- `guardianUserId` in active code/contracts;
- `GuardianProfessionalShareGrantCreateSchema`;
- `GuardianProfessionalShareGrantRevokeSchema`;
- `hasCurrentGuardianAuthority`;
- `GUARDIAN_AUTHORITY_MISMATCH`.

These retained historical names are evidence lineage, not permission semantics and not approved vocabulary for new product code.

## Migration rule

New active product code, tests, UI copy and current controlled documentation must use canonical Owner terminology unless a legacy identifier is being referenced explicitly for compatibility or historical traceability.

Do not perform a blind repository-wide replacement. Historical gate identifiers and evidence records remain stable unless a separately controlled compatibility plan changes them.

## Delegated access rule

A trusted household member, pet-sitter, professional recipient or other delegate does not become an Owner merely because access is granted. The canonical Owner term must therefore not be mechanically substituted into non-owner actor roles.

**STATUS: TERMINOLOGY SUPERSESSION ACTIVE — PHASE C ACTIVE PERSISTENCE/CONTRACT MIGRATION COMPLETE.**
