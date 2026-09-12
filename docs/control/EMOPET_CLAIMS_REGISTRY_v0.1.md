# EMOPET — Claims Registry v0.1

**Status:** PROPOSED CLAIM CONTROL / NOT MARKETING OR LEGAL SIGN-OFF  
**Date:** 2026-09-06  
**Parent:** #223  
**Related:** `EMOPET_EXPERIENCE_DOCTRINE_v0.1.md`, `COMPETITIVE_LANDSCAPE.md`, #230, #231

## 0. Purpose

This registry prevents product, science, marketing, veterinary, investor and partner communications from drifting into different versions of EMOPET.

Every material claim should resolve to one of these states:

- `AUTHORIZED_DESCRIPTIVE` — supported description of current controlled architecture or verified project fact;
- `CONDITIONAL` — may be used only with an explicit qualifier or within a defined scope;
- `EVIDENCE_REQUIRED` — plausible hypothesis, not authorized as a performance claim;
- `THIRD_PARTY_RIGHTS_REQUIRED` — blocked until licence/permission is obtained;
- `FORBIDDEN` — conflicts with EMOPET doctrine or intended regulatory position;
- `HISTORICAL_ONLY` — may exist in legacy material but is not current authority.

No claim moves to stronger status because it appears repeatedly in code, decks, emails or generated copy.

## 1. Core product claims

| Claim | State | Allowed wording / condition | Evidence or gate |
|---|---|---|---|
| EMOPET is a non-medical canine wellbeing monitoring project/system | `AUTHORIZED_DESCRIPTIVE` | Keep non-diagnostic boundary explicit where context requires | project doctrine / controlled presentation |
| EMOPET's target architecture combines MAT + TAG | `AUTHORIZED_DESCRIPTIVE` | `target architecture` / `intended architecture` until production hardware is validated | architecture docs |
| TAG follows/observes the dog in wearable contexts | `CONDITIONAL` | only for implemented/validated TAG capabilities | TAG engineering gates |
| MAT provides a dedicated resting-context observation surface | `CONDITIONAL` | architecture statement only; do not imply superiority | #230 |
| MAT + TAG are complementary observation contexts | `CONDITIONAL` | acceptable as design intent, not measured performance | #230 |
| MAT improves accuracy vs wearable-only | `EVIDENCE_REQUIRED` | do not use externally yet | #230 |
| MAT + TAG are more reliable than one device | `EVIDENCE_REQUIRED` | do not use as generic claim | #230 |
| EMOPET builds an individual longitudinal reference/baseline | `CONDITIONAL` | only for variables where baseline formation is actually implemented/validated | ELI / metric-specific evidence |
| EMOPET notices or surfaces longitudinal change | `CONDITIONAL` | must name the qualified observation class; no generic health implication | metric-specific validation |
| EMOPET knows when evidence is insufficient and can abstain | `CONDITIONAL` | architecture/product behavior claim only where runtime path is demonstrated | ELI confidence/abstention tests |
| EMOPET is more accurate than Tractive/Invoxia/PetPace/etc. | `FORBIDDEN` | no comparative superiority without direct controlled evidence | competitor-specific evidence required |
| EMOPET is unique / first in the world | `EVIDENCE_REQUIRED` | do not state as fact | full market/IP analysis |

## 2. Medical / veterinary claims

| Claim | State | Notes |
|---|---|---|
| EMOPET diagnoses disease | `FORBIDDEN` | outside intended product position |
| EMOPET identifies the cause of a behavioral/physiological change | `FORBIDDEN` | EMOPET may describe observations, not causality |
| EMOPET detects arthritis/heart disease/etc. | `FORBIDDEN` unless product/regulatory strategy changes under separate authority | no disease-specific claim under current doctrine |
| EMOPET prevents disease | `FORBIDDEN` | no preventive medical claim |
| EMOPET gives clinical decision support | `FORBIDDEN` under current doctrine | veterinarian retains interpretation |
| EMOPET can prepare useful information for a veterinary consultation | `CONDITIONAL` | product workflow description, not proof of improved consultation |
| Veterinary Summary improves the consultation | `EVIDENCE_REQUIRED` | Founding Panel / workflow study |
| Veterinary Summary saves X minutes | `EVIDENCE_REQUIRED` | requires prospective measured evidence |
| EMOPET enriches/repairs anamnesis | `EVIDENCE_REQUIRED` for performance wording | safer internal hypothesis: `aims to preserve a more precise chronology for the Guardian to share` |
| A veterinarian can interpret EMOPET observations | `AUTHORIZED_DESCRIPTIVE` | professional interpretation remains outside EMOPET authority |

## 3. Behavioral / emotion claims

| Claim | State | Notes |
|---|---|---|
| EMOPET measures anxiety/stress/depression/joy/fear | `FORBIDDEN` | sensor outputs are not emotion truth |
| EMOPET knows how the dog feels | `FORBIDDEN` | no inner-state certainty |
| EMOPET can observe activity/agitation/vocal/rest patterns when technically qualified | `CONDITIONAL` | metric and sensor-specific evidence required |
| Breed determines individual temperament | `FORBIDDEN` | breed may be bounded context, not individual truth |
| Owner questionnaire result is sensor truth | `FORBIDDEN` | owner report remains separate evidence class |
| C-BARQ can be integrated into EMOPET | `THIRD_PARTY_RIGHTS_REQUIRED` | licence/permission + scientific integration design required |
| EMOPET uses the complete C-BARQ | `EVIDENCE_REQUIRED / RIGHTS_REQUIRED` | direction under discussion, not present licensed product fact until agreement |
| Professor James Serpell validated ELI/EMOPET | `FORBIDDEN` unless he explicitly does so under a defined process | current interaction is methodological discussion, not product endorsement |

## 4. Breiz claims

| Claim | State | Allowed wording / block |
|---|---|---|
| Breiz is a contextual companion | `AUTHORIZED_DESCRIPTIVE` | architecture/product positioning |
| Breiz explains qualified EMOPET observations | `CONDITIONAL` | cannot increase certainty or invent causal meaning |
| Breiz knows the dog's emotions | `FORBIDDEN` | no anthropomorphic certainty |
| Breiz knows everything about Brittany / every local place | `FORBIDDEN` | source coverage is bounded and #116 remains open |
| Breiz can provide source-backed local/context information | `CONDITIONAL` | only where item-level provenance/rights are controlled |
| Breiz is a veterinarian / gives veterinary advice | `FORBIDDEN` | navigation/general information only within policy |
| Breiz remembers user preferences | `CONDITIONAL` | only explicit/confirmed permitted preference paths with delete/correction behavior |

## 5. Memories / relationship claims

| Claim | State | Notes |
|---|---|---|
| Memories preserves the Guardian's chosen history with the dog | `CONDITIONAL` | design authority; implementation and user value still to test |
| EMOPET automatically knows which moments matter emotionally | `FORBIDDEN` | Guardian chooses meaning |
| EMOPET measures bond strength | `FORBIDDEN` | no relationship score |
| EMOPET can tell whether the user is a good Guardian | `FORBIDDEN` | no moral/performance scoring |
| Memories is private by default | `CONDITIONAL` | product authority; must be enforced in runtime before production claim |
| EMOPET will never use Memories for engagement pressure | `CONDITIONAL` | doctrine commitment, requires implementation review |

## 6. Community / World claims

| Claim | State | Notes |
|---|---|---|
| Community is designed around local useful connection rather than virality | `CONDITIONAL` | design doctrine; needs runtime/UX proof |
| Community has no infinite scroll / no popularity optimization | `CONDITIONAL` | only after implementation path matches doctrine |
| World is an optional persistent social/playful experience | `CONDITIONAL` | concept/gated, not released runtime fact |
| World reflects the dog's emotional state | `FORBIDDEN` | avatar may not act as ELI mood display |
| Real dog activity earns World XP/rewards | `FORBIDDEN` | prohibited gamification flow |
| Community matching guarantees dogs will get along | `FORBIDDEN` | safety/suitability cannot become guarantee |
| EMOPET provides a compatibility percentage for dogs | `FORBIDDEN` | no false precision |

## 7. Data / privacy claims

| Claim | State | Notes |
|---|---|---|
| Guardian controls professional sharing | `CONDITIONAL` | intended authority; runtime grant/revocation model must exist |
| Vet access is revocable/expiring/recipient-bound | `CONDITIONAL` | target architecture, not current broad production fact |
| `vet_export_opt_in` alone is sufficient for permanent Vet View | `FORBIDDEN` | future access requires scoped grant model |
| Community/World never receives Care data automatically | `CONDITIONAL` | doctrine; must be backed by implementation tests |
| User data is fully anonymous | `FORBIDDEN` unless technically demonstrated for a specific dataset | use exact pseudonymized/anonymized classification only after review |
| No data is shared with third parties | `EVIDENCE_REQUIRED` | depends on actual services/processors/product flows |
| EMOPET is GDPR compliant | `EVIDENCE_REQUIRED` | requires qualified legal/privacy review + implementation evidence |

## 8. Science / evidence claims

| Claim | State | Notes |
|---|---|---|
| ELI is scientifically validated | `EVIDENCE_REQUIRED` | do not state globally before the applicable validation program closes |
| EMOPET is clinically validated | `FORBIDDEN` currently | no such evidence |
| A specific sensor/metric has passed bench validation | `CONDITIONAL` | may be used only with exact test scope/version/result |
| Negative/failed tests are retained | `AUTHORIZED_DESCRIPTIVE` as R&D doctrine | must continue to be true operationally |
| EMOPET has a scientific collaboration with Penn/Oniris/Unizar | `EVIDENCE_REQUIRED` per institution | use `in discussion`, `in contact`, `exploratory exchange` until formalized |
| A named scientist endorses EMOPET | `FORBIDDEN` absent explicit endorsement permission | do not convert correspondence into endorsement |

## 9. Commercial / competitive claims

| Claim | State | Notes |
|---|---|---|
| Personalized baseline is an EMOPET-only feature | `FORBIDDEN` | market already contains comparable claims/features |
| Veterinary report is unique to EMOPET | `FORBIDDEN` | competitors provide professional/vet reports |
| Community features are unique to EMOPET | `FORBIDDEN` | pet social platforms exist |
| EMOPET's differentiator is the governed continuity/evidence contract | `CONDITIONAL` | positioning thesis, not legal uniqueness claim |
| D2C will outperform clinic distribution | `EVIDENCE_REQUIRED` | strategy hypothesis |
| Vet recommendation without commission improves trust/conversion | `EVIDENCE_REQUIRED` | Founding 12 + GTM data |
| EMOPET has secured Bpifrance funding | `FORBIDDEN` unless award exists | discussions are not funding |
| EMOPET has a manufacturing contract/SOW with MOKO | `FORBIDDEN` until signed operational agreement exists | current bilateral NNN is not SOW/PO/manufacturing authorization |
| MOKO is under signed confidentiality/NNN framework | `CONDITIONAL` | factual only while the executed agreement remains valid and description is exact |

## 10. External communication rules

### Scientific email
Prefer:
- `we are exploring`;
- `we intend to test`;
- `current architecture proposes`;
- `this remains unvalidated`;
- `we would value criticism`.

### Investor / school / incubator
May describe:
- architecture already documented;
- executed confidentiality/IP steps;
- named discussions with exact status;
- open technical/scientific risks.

Must not inflate:
- contact → partnership;
- methodological feedback → endorsement;
- NNN → manufacturing contract;
- prototype design → validated product.

### Consumer marketing
Before launch, avoid performance certainty. After launch, every factual performance claim must map to a claim row + evidence pointer + exact product/version scope.

## 11. Promotion process

A claim may move to a stronger state only when the change records:
1. exact claim text;
2. product/version/scope;
3. evidence pointer;
4. rights/licence status if applicable;
5. scientific/product owner review;
6. legal/regulatory review when needed;
7. date and approver.

## 12. Immediate high-risk claims to police

Search product/decks/copy for variants of:
- `diagnose`, `detect disease`, `prevent`, `health alert`, `risk`;
- `anxiety`, `stress`, `happy`, `sad`, `emotion` as measured truth;
- `clinically proven`, `scientifically validated`;
- `more accurate`, `superior`, `best`, `unique`, `first`;
- `partnership with Penn/Oniris` where only discussion exists;
- `MOKO manufacturing contract` where only confidentiality framework exists;
- `C-BARQ integrated/licensed` before rights are cleared;
- `GDPR compliant` without qualified review.

**Gate:** `G-EMOPET-CLAIMS-CONTROL-01 = OPEN`

This file is claim-governance infrastructure, not a legal opinion.