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
| `docs/control/EMOPET_GUARDIAN_AUTHORITY_MASTER_v0.1.md` | `docs/control/EMOPET_OWNER_AUTHORITY_MASTER_v0.1.md` | terminology only; control status preserved |
| `docs/control/EMOPET_GUARDIAN_PROFESSIONAL_SHARING_v0.1.md` | `docs/control/EMOPET_OWNER_PROFESSIONAL_SHARING_v0.1.md` | terminology only; control/security invariants preserved |

Historical files are retained unchanged so the repository preserves what was actually written and reviewed at the time.

The professional-sharing static audit now reads the canonical Owner control successor. It no longer depends on the historical `GUARDIAN` document path, while the legacy gate identifier remains stable for evidence continuity.

## Role mapping

| Legacy label | Canonical label | Notes |
|---|---|---|
| `Guardian` | `Owner` | canonical dog-owner role |
| `PRIMARY_GUARDIAN` | `PRIMARY_OWNER` | same primary authority concept |
| `TRUSTED_GUARDIAN` | `TRUSTED_CAREGIVER` | delegated person; does not imply ownership |
| Guardian journal | Owner journal | same first-person context/evidence class |
| Guardian Continuity | Owner Continuity | same capability group |

## Legacy identifiers intentionally retained

The following identifiers may continue to contain `guardian` until an explicit compatibility or persistence migration removes them:

- database/storage identifiers including `guardian_user_id` and `guardianUserId`;
- historical control/gate identifiers including `G-GUARDIAN-AUTHORITY-01`, `G-GUARDIAN-CONTINUITY-01` and `G-GUARDIAN-PROFESSIONAL-SHARE-01`;
- deprecated compatibility aliases such as `GuardianProfessionalShareGrantCreateSchema` and `GuardianProfessionalShareGrantRevokeSchema` while downstream callers may still depend on them;
- filenames and records whose purpose is to preserve historical evidence.

These retained names are **legacy compatibility/history**, not permission semantics and not approved vocabulary for new product code.

## Migration rule

New active product code, tests, UI copy and current controlled documentation must use canonical Owner terminology unless a legacy identifier is being referenced explicitly for compatibility or historical traceability.

Do not perform a blind repository-wide replacement. In particular, do not rename persisted columns, public contracts or historical gate identifiers without a migration and compatibility plan.

## Delegated access rule

A trusted household member, pet-sitter, professional recipient or other delegate does not become an Owner merely because access is granted. The canonical Owner term must therefore not be mechanically substituted into non-owner actor roles.

**STATUS: TERMINOLOGY SUPERSESSION ACTIVE.**
