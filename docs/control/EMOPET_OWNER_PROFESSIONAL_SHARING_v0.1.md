# EMOPET — Owner-Controlled Professional Sharing v0.1

**Status:** CONTROLLED DESIGN AUTHORITY / PRE-PRODUCTION / NOT SECURITY VALIDATION  
**Source control date:** 2026-09-06  
**Canonical terminology revision:** 2026-09-11 under DOMAIN-TERM #245  
**Parent:** #64 Owner Authority (historical workstream number retained)  
**Related:** #223 Experience Hardening, Veterinary Summary / prescriber strategy  
**Legacy stable gate identifier:** `G-GUARDIAN-PROFESSIONAL-SHARE-01 = OPEN`

> This is the canonical terminology successor for professional-sharing control. The legacy gate identifier remains stable for evidence continuity. This revision changes role names, not access scope, revocation behavior or security requirements.

## 0. Purpose

This document rejects the idea that a single `vet_export_opt_in = true` can authorize veterinary/professional access.

The preference may remain as a coarse UX preference, but it has **zero durable authorization power**.

Professional access must be:

- Owner-initiated;
- dog-specific;
- recipient-bound;
- purpose-bound;
- scope-limited;
- data-period-limited;
- access-expiring;
- revocable;
- auditable;
- backend-authorized.

Central rule:

> **An Owner shares a defined view with a defined recipient for a defined reason and period. EMOPET never turns a general preference into permanent professional access.**

## 1. Principals

### Primary Owner

Candidate authority:
- create/revoke professional grants for a dog they control;
- choose data period and scopes;
- choose/identify recipient;
- inspect access history;
- export/delete subject to sensitive-action controls.

### Trusted Caregiver / Household Member

No automatic professional-sharing authority.

A future delegation may explicitly grant `MANAGE_PROFESSIONAL_SHARING`, but household membership or trusted-caregiver status alone is insufficient.

### Professional recipient

A recipient is not authorized merely because a string says `vet`, `clinic`, `researcher` or because an email domain looks professional.

The grant must bind to either:
- a named delivery identity (minimum email-bound link candidate); or
- a verified EMOPET professional principal when that system exists.

Professional verification and access authorization are separate questions.

## 2. Allowed default scopes

Candidate scopes:

- `VETERINARY_SUMMARY`
- `OWNER_SELECTED_NOTES`
- `QUALIFIED_LONGITUDINAL_OBSERVATIONS`
- `DATA_COVERAGE_AND_CONFIDENCE`
- `DECLARED_CONTEXT`

Explicitly excluded from default professional sharing:

- raw MAT/TAG streams;
- raw audio;
- private Memories;
- Community DMs/posts not deliberately selected;
- World state;
- contact graph;
- precise location history unless separately justified and selected;
- hidden model/debug state;
- unrelated dogs;
- unrelated Owner account data.

Any future raw/research-data sharing belongs to a separate research-governance flow, not Vet View.

## 3. Grant lifecycle

```text
DRAFT (client only)
  ↓ submit
PENDING (backend durable intent)
  ↓ authorization / token issue
ACTIVE
  ├─ revoke → REVOKED
  ├─ sensitive/security action → SUSPENDED
  └─ accessExpiresAt reached → EXPIRED
```

`DRAFT` is intentionally not a durable grant status in the shared server model. A client draft is not authority.

Backend authorization must treat every non-`ACTIVE` state as denied.

## 4. Data window vs access window

These are different clocks.

Example:
- data period: 1 Aug → 31 Aug;
- link/access expiry: 48 hours after issue.

Extending access MUST NOT silently extend the data period.
Extending the data period MUST require a new/updated Owner decision.

## 5. Recipient-bound link candidate

A bearer link is allowed only as an implementation candidate if it is bound server-side to a durable grant containing recipient identity and scope.

Required token properties:

- opaque or signed random token with high entropy;
- token ID recorded server-side, bearer plaintext never persisted in logs/database;
- grant ID;
- dog ID;
- recipient binding;
- purpose/scope reference;
- short expiry;
- revocation check at every access;
- audience/issuer where applicable;
- no report contents inside the token.

A self-contained JWT that remains valid solely because its signature is valid is insufficient for revocation-sensitive professional sharing.

## 6. Audit events

At minimum:

- `GRANT_CREATED`
- `GRANT_ACTIVATED`
- `LINK_ISSUED`
- `ACCESS_SUCCEEDED`
- `ACCESS_DENIED`
- `GRANT_REVOKED`
- `GRANT_EXPIRED`

Audit records must not contain:
- bearer token plaintext;
- report body;
- raw sensor data;
- private Memory text.

The Owner-facing audit should answer:
- who was given access;
- to which dog;
- what categories;
- what data period;
- until when;
- when it was accessed;
- whether it was revoked/expired.

## 7. Revocation contract

Revocation must be effective server-side before UI success is shown.

After revocation:
- future professional requests deny;
- previously issued bearer links deny even if cryptographic expiry has not elapsed;
- cache/CDN headers remain no-store/private;
- audit records remain as controlled access history;
- revocation must not delete the underlying Owner-owned dog data.

## 8. Breiz language authority

Breiz may:
- explain what the Owner is about to share;
- explain scope/expiry in plain language;
- remind the Owner that sharing is optional/revocable.

Breiz may not:
- activate a grant;
- infer that a vet "needs" access;
- pressure the Owner;
- widen scope;
- select private Memories automatically;
- imply a clinician has reviewed data merely because a link was generated/opened.

## 9. Legacy generic-link HOLD

The current pre-doctrine path creates a signed generic `vet-report` link for the dog and a number of days. It is not recipient-bound and has no durable revocation entity.

Disposition:

`LEGACY_GENERIC_VET_REPORT_LINK = HOLD_FOR_RELEASE`

It may remain only behind an explicit non-production compatibility gate while migration work is completed.

The mobile UI must not present the old general opt-in as if it grants durable veterinarian access.

## 10. Adversarial requirements

Before release, prove at least:

- user A cannot create/revoke/access grants for user B's dog (BOLA);
- changing dog ID in URL/token denies;
- changing period/scope denies;
- expired grants deny;
- revoked grants deny immediately;
- email/recipient mismatch denies when recipient verification is used;
- an Owner cannot share raw/private scopes not exposed by policy;
- Community/World membership cannot confer professional access;
- multiple dogs remain isolated;
- logs do not contain bearer links/report bodies;
- link previews/crawlers do not accidentally consume or disclose professional data;
- no-store/cache controls are enforced.

## 11. UX candidate

The Owner should see a review screen before creation:

```text
Partager avec
Clinique vétérinaire X — dr.x@example.fr

Chien
Naya

Motif
Consultation vétérinaire

Données
✓ Résumé vétérinaire
✓ Observations longitudinales qualifiées
✓ Couverture et niveau de confiance
□ Notes choisies par moi
□ Contexte déclaré

Période observée
01/08/2026 → 31/08/2026

Accès valable jusqu'au
08/09/2026 18:00

[Créer l'accès]
```

After creation:
- show recipient;
- show expiry;
- show `Révoquer l'accès` prominently;
- show latest access/audit state.

## 12. Implementation boundary

Shared domain types/validators may be implemented now.

A production-ready grant store/API is blocked on:
- durable backend auth/authorization baseline;
- controlled DB migration path;
- recipient-delivery/verification decision;
- security/privacy review;
- real negative tests.

Do not create a mock in-memory grant store and call the problem solved.

## 13. Gate state

`G-GUARDIAN-PROFESSIONAL-SHARE-01 = OPEN`

Controlled model exists only when code/docs are merged and reviewed. Security validation requires runtime evidence.