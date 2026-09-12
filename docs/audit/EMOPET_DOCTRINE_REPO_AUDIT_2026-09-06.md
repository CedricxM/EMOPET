# EMOPET — Doctrine / Repository Audit — 2026-09-06

**Status:** CONTROLLED HARDENING AUDIT / NOT RELEASE AUTHORITY  
**Snapshot reviewed:** `main@a59de8870688e9f9d4ed4e08d9bcc245ad47360d` plus experience-hardening branch authority changes  
**Parent:** #223  
**Doctrine:** `docs/product/EMOPET_EXPERIENCE_DOCTRINE_v0.1.md`

## 0. Purpose

This audit compares currently observed repository behavior with the proposed EMOPET experience doctrine.

Classification:
- `PASS` — consistent with current doctrine;
- `LEGACY_CONFLICT` — observed code/data model conflicts with current proposed authority;
- `SEMANTIC_RISK` — not necessarily user-visible violation, but naming/modeling can cause future leakage;
- `IMPLEMENTATION_GAP` — doctrine exists but runtime enforcement is not demonstrated;
- `REVIEW_REQUIRED` — cannot conclude without deeper code/test/runtime evidence.

This audit does **not** delete existing prototype behavior. It identifies what must be remediated, retired, narrowed or explicitly approved.

## 1. Executive result

Current repository direction is **not yet doctrine-clean**.

Strong controls already exist around:
- non-diagnostic language;
- forbidden emotional/medical copy patterns;
- ELI confidence/degrade/reject concepts;
- explicit separation language in several newer documents;
- current World/Community workstreams that reject dog-performance scoring.

However, older prototype code still contains a substantial **owner-gamification system whose inputs include real dog/activity/data-adherence metrics**. Under the newly clarified authority this is not acceptable merely because the UI says the Guardian, rather than the dog, receives the points.

The central remediation principle is:

> **Changing the subject of the badge from dog to Guardian does not neutralize the mechanic if the reward is still derived from the dog's real activity, rest, MAT adherence or sensor/data volume.**

## 2. P0 — legacy gamification conflicts

### 2.1 `apps/web/lib/gamification.ts`

**State:** `LEGACY_CONFLICT / P0`

Observed mechanics include:
- global points;
- levels;
- badge rarity;
- reward points;
- progression percentages;
- unlocks;
- thresholds based on journal entries, walks, beaches/places, events and knowledge actions;
- importantly, thresholds based on `baselineFrozen` and `validDataDays`;
- walk count contributes directly to points;
- level names and unlocks create cross-surface progression.

Specific doctrinal conflict:
- `walks * POINTS.walk` turns real-world dog/Guardian walking volume into progression;
- `validDataDays` and `baselineFrozen` turn sensor/data adherence into achievement;
- `Assidu des données` rewards thirty valid data days;
- progression/unlock structure can pressure behavior to satisfy EMOPET rather than support the relationship.

### Required disposition
Do **not** simply rename points.

Separate the current system into candidate classes:

#### Candidate removable
- walk-count points;
- baseline/data-validity badges;
- any MAT adherence streak/achievement;
- progression unlocked by real-dog activity/data volume.

#### Candidate redesignable
- optional purely World-specific symbolic progression that is not driven by real dog data;
- explicit educational completion if it does not create pressure or affect Care/social status;
- Community role privileges based on real governance/training, not engagement points.

#### Hold
Current generic level system should not be release authority until World/Community product review decides whether any cross-surface progression belongs in EMOPET at all.

## 3. P0 — shared achievement model contains prohibited sources

### 3.1 `packages/shared/src/types/user.ts`

**State:** `LEGACY_CONFLICT / P0`

Observed `AchievementType` includes:
- `distance_record`;
- `mat_streak`;
- `community_first`;
- `walk_group`;
- `founding_member`;
- `monthly_journal`.

`distance_record` and `mat_streak` directly conflict with the new rule against rewards derived from real dog activity/MAT adherence.

The type also binds `Achievement` to `dogId`, increasing the risk that a supposedly owner-only reward becomes semantically attached to dog performance.

### Proposed remediation
Replace the generic achievement authority with one of two directions after Founder review:

**Preferred V1:** no global achievement model.

If World later needs playful progression, define a World-owned type such as:
`WorldKeepsake / WorldUnlock / CooperativeArtifact`
with an explicit invariant that its source cannot be Care/MAT/TAG/ELI/activity/rest/distance.

`distance_record` and `mat_streak` should be marked deprecated/blocked before release.

## 4. P0 — Breiz milestone templates reference performance/streak metrics

### 4.1 `packages/ai-personality/src/bleiz/bleiz-content-templates.ts`

**State:** `LEGACY_CONFLICT + SEMANTIC_RISK / P0`

Observed context fields include:
- `mat_streak_days`;
- `personal_best_km`;
- `weekly_distance_goal`;
- `weekly_distance_last`.

Observed template IDs/search results include:
- `MIL_MAT_STREAK`;
- `ACT_DISTANCE_RECORD`;
- `MIL_DISTANCE_RECORD`.

These create a path from sensor/real activity into celebratory or milestone copy.

### Required remediation
- freeze these templates from any launch authority;
- remove/rewrite all milestone logic whose trigger is MAT adherence, distance record or dog activity volume;
- do not replace them with softer language while retaining the same reward trigger;
- keep factual activity history in Care only where scientifically/product-valid;
- if a Guardian deliberately creates a Memory about a long walk, it is user-authored relationship history, not an automatic achievement.

## 5. P1 — journal uses unlock language

### 5.1 `apps/web/app/journal/page.tsx`
### 5.2 `apps/web/lib/i18n/dictionaries.ts`

**State:** `SEMANTIC_RISK / P1`

Observed UI behavior:
- after an entry, code may display `milestoneUnlocked`;
- copy contains `Jalon débloqué :` / `Milestone unlocked:`.

Not every milestone is inherently prohibited. The problem is the **unlock/reward framing**, especially if the milestone candidate is generated from counts or performance.

### Proposed V1 direction
Prefer factual/private chronology language:
- `Repère ajouté`;
- `Milestone saved`;
- `Entrée ajoutée à votre histoire`;
when and only when the Guardian deliberately creates/confirms it.

Do not generate a `milestone unlocked` from activity volume, adherence or journal quotas.

## 6. P1 — internal naming can reintroduce prohibited interpretations

### 6.1 Breiz template identifiers/categories

**State:** `SEMANTIC_RISK / P1`

Examples observed:
- `BHV_ANXIETY_PATTERN` while user-facing copy forbids anxiety claims;
- categories such as `health_seasonal` / `health_breed`;
- internal triggers that combine activity, mat rest and vocal activity before generating behavior-oriented content.

Internal names are not consumer claims, but they matter because they shape future developer assumptions and analytics.

### Proposed remediation
Use observation-domain names rather than latent-state names.

Example:
- `BHV_ANXIETY_PATTERN` → candidate `BHV_ELEVATED_ACTIVITY_LOW_REST_VOCAL_PATTERN`;
- maintain `never_say` guardrails;
- explicitly mark whether a template is `OBSERVATION_EXPLANATION`, `GENERAL_EDUCATION`, `SEASONAL_CONTEXT` or `SUGGESTION`.

Do not infer that the current trigger combination scientifically represents anxiety merely because the output avoids the word.

## 7. P1 — `vet_export_opt_in` is too coarse for future Vet View

### 7.1 `packages/shared/src/types/user.ts`

**State:** `IMPLEMENTATION_GAP / P1`

Observed consent model includes:
- `location_opt_in`;
- `community_opt_in`;
- `vet_export_opt_in`.

A boolean can be useful as an onboarding preference, but it cannot carry the future authority promised by #64 / Product Authority Map:
- recipient binding;
- data-category scope;
- time range;
- expiry;
- revocation;
- purpose;
- audit.

### Proposed architecture
Keep coarse user preference if useful, but professional access requires a separate durable grant entity.

Candidate:

```ts
ProfessionalShareGrant {
  id
  guardianId
  dogId
  recipientType
  recipientId / recipientAddressBinding
  purpose
  dataScopes[]
  from
  to
  expiresAt
  revokedAt
  createdAt
  acceptedAt
}
```

Do not implement this merely as a frontend boolean.

## 8. P1 — subscription reward language

### 8.1 `packages/shared/src/types/user.ts`

**State:** `REVIEW_REQUIRED / P1`

Observed comment:
`Months of continuous membership — drives progressive rewards.`

This is not directly dog-performance gamification, but it may introduce loyalty/FOMO mechanics inconsistent with the humane-design direction depending on what the rewards do.

### Review rule
Allowed only if rewards:
- do not lock already-created Memories or core rights;
- do not pressure daily use;
- do not confer dog-health/social-status superiority;
- are transparent commercial benefits rather than manipulative retention mechanics.

If no strong product reason exists, simplify subscription tenure rather than building a loyalty game.

## 9. PASS / positive controls observed

### 9.1 Forbidden-vocabulary tooling
`apps/web/scripts/forbidden-vocab.mjs` explicitly recognizes that medical/emotional words may appear in disclaimers/guardrails and should be detected based on problematic assertion patterns rather than blindly banning every occurrence.

**Assessment:** `PASS DIRECTION`, but should be extended to cover the new gamification/authority rules.

### 9.2 Breiz `never_say` fields
Several templates already include explicit prohibited terms for anxiety/pathology/urgency.

**Assessment:** useful defense-in-depth, not sufficient scientific authority by itself.

### 9.3 Confidence gate vocabulary
Breiz content types include `PUBLISH / DEGRADE / REJECT` and ELI reliability state mechanisms exist elsewhere.

**Assessment:** direction consistent with the evidence contract. Runtime end-to-end enforcement remains to prove.

### 9.4 New Community/World authorities
Current #43/#50/#53/#54/#55/#57/#59 direction rejects dog-performance progression, infinite-scroll pressure, relationship scoring and ELI→social leakage.

**Assessment:** strong doctrine, still pre-production.

## 10. Required automated doctrine checks

Existing vocabulary audit should eventually be complemented by repository checks for prohibited product mechanics.

Candidate static checks:

### Block or flag in launch-scope code
- `mat_streak`;
- `distance_record`;
- `personal_best_km` used as reward/milestone trigger;
- `weekly_distance_goal` used for reward/pressure;
- `pointsReward` tied to dog/activity/Care data;
- `validDataDays` used for achievement;
- `baselineFrozen` used for achievement;
- `milestoneUnlocked` when generated by automatic count/performance;
- ELI/Care fields imported into World reward modules;
- private Memories imported into Community without explicit sanitized-share path.

### Do not blindly block
- technical reliability `streak` counters such as upgrade/degrade streaks inside a state machine;
- geometric SVG `points`;
- neutral geocoding `score` fields;
- scientific statistics called `score` when they are not user-facing wellbeing/relationship scores.

The audit must be semantic, not grep theater.

## 11. Recommended remediation sequence

### R1 — Freeze prohibited reward sources
Mark legacy `distance_record`, `mat_streak`, data-validity and walk-volume achievements as non-authoritative for release.

### R2 — Separate World play from dog evidence
If playful progression survives, move it behind a World-specific model that accepts no Care/ELI/performance inputs.

### R3 — Rewrite Breiz milestone triggers
Remove MAT streak/distance-record celebratory templates and rename latent-state semantic IDs.

### R4 — Replace journal unlock semantics
Use deliberate-save/history language, not quota/unlock mechanics.

### R5 — Create professional grant model
Track under #64/#232; `vet_export_opt_in` becomes preference, not access authority.

### R6 — Add doctrine CI/static audit
Add exact semantic rules only after the migration paths are agreed so CI does not fail permanently on known legacy files with no disposition.

## 12. Current disposition

| Area | Disposition |
|---|---|
| Global owner gamification | `HOLD / REDESIGN` |
| Dog activity/data-derived achievements | `BLOCK FROM RELEASE` |
| World play independent of real dog evidence | `GATED / MAY PROCEED TO DESIGN TEST` |
| Journal milestone unlock | `REWRITE` |
| Breiz distance/MAT-streak milestones | `BLOCK / REWRITE` |
| Breiz anxiety-named internal pattern | `RENAME / REVIEW SCIENTIFIC SEMANTICS` |
| Vet export boolean | `INSUFFICIENT FOR VET VIEW` |
| Existing vocab guardrails | `KEEP / EXTEND` |

## 13. Gate

`G-REPO-DOCTRINE-CLEANUP-01 = OPEN`

Close only when every P0/P1 item has one of:
- remediated implementation;
- explicit gated legacy isolation;
- approved narrow exception with rationale;
- removed/deprecated path;

and launch-scope tests demonstrate the forbidden flows are absent.