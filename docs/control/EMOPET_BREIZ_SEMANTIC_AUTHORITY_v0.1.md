# EMOPET — Breiz Semantic Authority v0.1

**Status:** CONTROLLED / PRE-RELEASE AUTHORITY  
**Date:** 2026-09-06  
**Parent:** #223  
**Primary remediation:** #234  
**Code authority:** `packages/ai-personality/src/bleiz/bleiz-release-templates.ts` + `bleiz-release-scheduler.ts`

## 0. Purpose

Breiz is an explanation, context and suggestion layer. It is not an independent scientific inference engine and it may not increase the certainty of Care/ELI evidence.

This document defines the release boundary between:

1. historical Breiz templates retained for migration/regression;
2. release-authorized Breiz content;
3. observable evidence;
4. educational/contextual copy;
5. suggestions;
6. community content;
7. prohibited latent-state, relationship-score, reward and medical narratives.

The central rule is:

> **Breiz may change how authorized evidence is explained. Breiz may not change what the evidence means.**

## 1. Canonical release authority

Release consumers MUST use:

- `BLEIZ_RELEASE_TEMPLATES`;
- package-root `scheduleBleizContent()`;
- `releaseTemplateBlockReason()` / `filterReleaseTemplates()`;
- `releaseClass`;
- `semanticAuthority`;
- `sourceAuthority`.

The historical catalog is exposed from the package root only as:

- `LEGACY_BLEIZ_TEMPLATES`;
- `LEGACY_BLEIZ_TEMPLATE_STATS`.

Those aliases exist for migration and regression only. They are not product authority.

## 2. Release classes

Every release-authorized template MUST be classified as exactly one of:

| Release class | Allowed job | Hard boundary |
|---|---|---|
| `OBSERVATION_EXPLANATION` | Explain an authorized observable pattern | No hidden emotion, disease, cause, motivation or relationship conclusion |
| `GENERAL_EDUCATION` | Provide general, non-medical educational information | Must not present generic information as an individual inference |
| `SEASONAL_CONTEXT` | Add weather/season/environment context | Context cannot increase ELI confidence or become diagnosis |
| `SUGGESTION` | Offer optional low-pressure next steps | A suggestion is not evidence and must remain optional |
| `COMMUNITY_CONTENT` | Support explicitly opt-in community interactions | Community activity is not scientific evidence and cannot feed ELI truth |

## 3. Semantic ceilings

Every release job carries one semantic ceiling:

| Semantic authority | Maximum allowed assertion |
|---|---|
| `OBSERVATION_ONLY` | What was observed, over what period, relative to what reference, with what gate/confidence |
| `EDUCATION_ONLY` | General educational context supported by the source/authority of the content |
| `CONTEXT_ONLY` | External or declared context without causal interpretation |
| `SUGGESTION_ONLY` | Optional action or question, never a conclusion about the dog |
| `COMMUNITY_ONLY` | Social/local content under community privacy rules |

Downstream UI, analytics and notification systems MUST preserve this metadata. A presentation layer may reduce assertiveness but may never promote a semantic ceiling.

## 4. Historical catalog quarantine

The historical `BLEIZ_TEMPLATES` catalog remains in source because deleting it before migration would destroy useful regression and provenance evidence.

However:

- it is not package-root release authority;
- blocked templates cannot be scheduled through the canonical package-root scheduler;
- ad-hoc caller templates not present in the canonical release registry fail closed;
- duplicate legacy IDs are quarantined rather than resolved by arbitrary first/last-wins behavior.

`BLEIZ_RELEASE_BLOCKED_LEGACY` exposes the blocked legacy IDs and reasons.

`BLEIZ_RELEASE_COLLISIONS` exposes ambiguous duplicate legacy IDs. Every colliding legacy ID is excluded from release until deliberately migrated.

## 5. Prohibited semantic paths

### 5.1 Latent emotional/medical state from ordinary sensor patterns

Forbidden examples:

- activity + low rest + vocalization -> `anxiety`;
- sensor arousal -> fear, happiness, depression, pain or emotional diagnosis;
- a confidence value -> a medical conclusion;
- a breed heuristic -> an individual behavioural diagnosis.

User-facing euphemism does not cure a bad upstream semantic model. A template called `ANXIETY_PATTERN` remains unsafe even if its copy avoids the word anxiety.

### 5.2 Relationship truth derived from Care/ELI

Forbidden:

- stable routine -> stronger bond;
- calm during presence/absence -> emotional balance;
- MAT usage -> relationship quality;
- sensor data volume -> closeness;
- distance walked -> strength of relationship;
- ELI confidence -> Guardian quality.

A factual Care observation may exist separately. Breiz cannot promote it to a relationship conclusion.

### 5.3 Sensor/performance-derived celebration

Forbidden:

- MAT streak milestones;
- personal-best distance celebrations;
- weekly distance goals;
- walk-volume quotas;
- signal/data adherence as achievement;
- WQI or other hidden quality scores as reward/progression.

Factual history can remain in the appropriate Care/Journal surface. A Guardian may deliberately save a real-life moment as a Memory, but Breiz must not manufacture an achievement from the metric.

### 5.4 Automatic sentimental memory

Forbidden:

- onboarding duration + accumulated metrics -> sentimental relationship narrative;
- ELI/MAT/TAG observation -> automatic sentimental Memory;
- an algorithmic milestone -> proof that a moment was meaningful.

Meaning belongs to the Guardian unless a separate controlled, user-authored Memories flow says otherwise.

## 6. Current migration example

Historical semantic identity:

`BHV_ANXIETY_PATTERN`

Disposition:

`BLOCKED FROM RELEASE`

Release replacement:

`BHV_ELEVATED_ACTIVITY_LOW_REST_VOCAL_PATTERN`

Role:

- `releaseClass = OBSERVATION_EXPLANATION`;
- `semanticAuthority = OBSERVATION_ONLY`;
- `sourceAuthority = SANITIZED_LEGACY`.

The replacement may describe:

- elevated movement;
- less qualified MAT rest;
- increased vocal activity;
- persistence/reference context when available.

It may not assert:

- anxiety;
- fear;
- panic;
- motivation;
- cause;
- disorder;
- diagnosis;
- hidden emotional state.

The prompt explicitly preserves multiple possible explanations.

## 7. Gate propagation

`PUBLISH / DEGRADE / REJECT` remains upstream evidence authority.

Breiz rules:

### `PUBLISH`
Content may be rendered only within the template's semantic ceiling.

### `DEGRADE`
Breiz may:

- reduce assertiveness;
- move from push to a quieter surface where configured;
- omit unsupported physiological details;
- explain that evidence is partial.

Breiz may NOT:

- convert `DEGRADE` to a confident conclusion;
- invent a cause;
- use tone/personality to hide uncertainty.

### `REJECT`
No release content job is emitted.

## 8. Category names are not semantic authority

Historical taxonomy such as:

- `behavior`;
- `health_breed`;
- `health_seasonal`;
- `relationship`;

may remain during migration for compatibility.

These category names MUST NOT be used downstream as proof of what the system knows.

Canonical downstream meaning is:

`releaseClass + semanticAuthority + gate`

Example:

A legacy `health_breed` template using a qualified individual sensor observation may be classified for release as:

`OBSERVATION_EXPLANATION / OBSERVATION_ONLY`

It does not thereby become medical authority.

## 9. Fail-closed registry rule

The release scheduler accepts only templates whose IDs resolve to the canonical `BLEIZ_RELEASE_TEMPLATES` registry.

Therefore a caller cannot bypass review by constructing:

```ts
{ id: 'NEW_SOFT_NAME', ... }
```

and sending it directly to the package-root scheduler.

A new template requires explicit registry admission and tests.

## 10. Required tests

Release tests MUST prove at minimum:

1. blocked latent-state IDs do not enter the release catalog;
2. forbidden performance/adherence fields do not enter release;
3. sensor/computed evidence cannot become a `relationship` narrative;
4. release IDs are unique;
5. duplicate legacy IDs fail closed;
6. unregistered ad-hoc templates fail closed;
7. the observable replacement for the historical anxiety pattern can publish without encoding the old latent state;
8. `DEGRADE` does not become a confident push;
9. release jobs carry `releaseClass`, `semanticAuthority`, and `sourceAuthority`.

## 11. New-template review checklist

Before a new Breiz template can become release-authorized, answer all of these:

1. What exact evidence or context is it based on?
2. Is that evidence authorized for this surface?
3. What is the `releaseClass`?
4. What is the `semanticAuthority`?
5. What would make the template `DEGRADE`?
6. What would make it `REJECT`?
7. Could the ID itself encode an unsupported latent state?
8. Could the prompt imply cause, emotion, disease, motivation, bond quality or Guardian quality?
9. Does it create reward/pressure from dog performance or data adherence?
10. Does it depend on a third-party right, dataset or scientific claim not yet cleared?
11. Is there a release regression test?

Any unresolved answer means HOLD.

## 12. Current status

Implemented in the hardening branch:

- historical catalog quarantined behind `LEGACY_*` package-root aliases;
- canonical release catalog created;
- machine-readable release class + semantic ceiling;
- blocked-template audit;
- duplicate-ID quarantine;
- blocked performance/adherence fields;
- blocked sensor/computed relationship narratives;
- blocked automatic relationship-memory path;
- observable replacement for the historical anxiety semantic identity;
- fail-closed package-root scheduler;
- regression tests for the above controls.

Not yet proven:

- successful workspace typecheck/build/test on an actual runner after these changes;
- end-to-end generated-copy evaluation against adversarial LLM outputs;
- complete migration/removal of every historical template from the source catalog;
- UX validation of the resulting Breiz behavior.

## 13. Gate

`G-BREIZ-SEMANTIC-CLEANUP-01 = OPEN`

The implementation is materially hardened, but this gate must remain open until:

- package build/typecheck/tests execute successfully;
- generated-output adversarial tests pass;
- all intentional release templates have explicit disposition;
- no uncontrolled import path bypasses release authority;
- Founder/scientific review approves the remaining release registry.
