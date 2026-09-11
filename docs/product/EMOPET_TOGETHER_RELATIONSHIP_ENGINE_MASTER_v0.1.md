# EMOPET — TOGETHER / RELATIONSHIP ENGINE MASTER v0.1

**Original date:** 2026-09-01  
**Original GitHub workstream:** #59  
**Canonical terminology revision:** 2026-09-11 under DOMAIN-TERM #245  
**Status:** `PROPOSED PRE-PRODUCTION AUTHORITY / NOT IMPLEMENTED / NOT RELEASED`  
**Gate:** `G-TOGETHER-RELATIONSHIP-ENGINE-01`  
**Imported to project memory:** 2026-09-07

> The 2026-09-11 revision updates dog-owner terminology only. Product scope and relationship safeguards are unchanged.

## 1. Product role

Together answers one bounded question:

> **What might make sense for this Owner and this dog to do together, in this context, now?**

It does **not** answer:

- how strong their relationship is;
- whether the Owner is “good”;
- whether the dog “loves” an activity;
- whether the bond improved;
- whether the dog is happy/sad;
- whether the Owner should spend more time with the dog.

The Relationship Engine is therefore a **context-and-preference engine**, not a relationship evaluator.

## 2. Product principle

> **Learn choices, not worth. Learn context, not intimacy scores.**

A useful engine should get better at:

- not suggesting what has been clearly refused;
- remembering explicitly confirmed preferences;
- understanding activity format;
- respecting practical constraints;
- recognizing user-confirmed rituals;
- offering safer/more suitable alternatives;
- abstaining.

It should not get better at manipulating acceptance.

## 3. Output families

### `SOLO_OWNER_DOG`

- quiet walk;
- sniff/explore activity;
- user-chosen route;
- home activity;
- private Memory revisit;
- sourced local discovery.

### `COMMUNITY`

- Circle;
- group event;
- humans together / dogs separated;
- parallel walk.

### `WORLD`

- cooperative World session;
- regional discovery;
- Circle World activity;
- private/shared symbolic activity.

### `MEMORY_CONTINUITY`

- user-requested revisit;
- user-confirmed ritual;
- manually chosen anniversary.

### `NO_SUGGESTION`

A first-class successful state.

## 4. Inputs hierarchy

Preferred order:

1. **Current explicit intent**
2. **Explicit constraints**
3. **Confirmed preferences**
4. **Confirmed refusals / cooldowns**
5. **Activity-specific canine context**
6. **Practical context**
7. **User-confirmed rituals/history**
8. **Eligible Community/World opportunities**
9. **Fresh sourced external context**
10. Future validated/approved contextual fields only

Raw Breiz conversation is not a direct input.

Care/MAT/TAG/ELI are not general Together personalization inputs.

## 5. Relationship Context Graph

The engine stores structured context with provenance and scope.

Examples:

- likes coastal walks → confirmed;
- prefers small groups → confirmed;
- does not want direct dog play → explicit;
- usually unavailable Tuesday evening → practical;
- Sunday-morning walk is a ritual → confirmed;
- declined crowded events three times → bounded preference candidate;
- has Circle Balades tranquilles → membership context.

No edge such as:

- `bond_strength = 0.91`;
- `dog_loves_owner`;
- `owner_quality`;
- `emotional_dependency`.

## 6. Refusals

Every suggestion allows:

- `Pas maintenant`
- `Pas ce format`
- `Ne plus me proposer ça`
- `Pourquoi ?`

Distinguish temporary refusal, contextual refusal, persistent preference and hard block.

A refusal may suppress future suggestions. It must never create guilt, reduce a relationship score, generate more aggressive reminders or be treated as positive engagement.

## 7. Abstention

Candidate outputs:

- `NO_RELEVANT_SUGGESTION`
- `INSUFFICIENT_CONTEXT`
- `SAFETY_CONSTRAINT`
- `PREFERENCE_SUPPRESSED`
- `NO_ELIGIBLE_OPPORTUNITY`

Useful user-facing copy may simply say:

> **Je n’ai rien de suffisamment pertinent à te proposer pour maintenant.**

This is a valid success state.

## 8. Memories boundary

Memories may provide factual continuity only when user-authored/confirmed, eligible for the use and not sensitive beyond necessary scope.

Allowed:

> “Tu as enregistré cette balade comme un rituel que tu aimes refaire.”

Not allowed:

> “This is where your bond is strongest.”

## 9. Care / ELI boundary

Current rule:

- no sentimental activity recommendation from ELI;
- no social suggestion because of inferred Valence/Arousal;
- no generic “your dog needs this” from unvalidated data;
- no diagnosis.

Future sensor-derived activity context requires its own validation and claims gate.

## 10. Community / matching boundary

If Together proposes an activity involving another dog/person:

- age/privacy/block eligibility first;
- canine safety veto first;
- activity-specific matching;
- explicit mutual acceptance.

Together cannot override the dedicated matching authority.

## 11. World boundary

World can provide low-risk Together activities.

It cannot:

- convert real Care state into avatar emotion;
- reward relationship quality;
- require physical activity performance;
- generate social status.

## 12. Breiz

Breiz can explain why, ask what the user wants, propose an activity, turn a conversational preference into a **candidate** preference, ask confirmation, respect refusal and abstain.

Breiz cannot manipulate loneliness, insist after a refusal, claim dog emotion or define the relationship.

## 13. Success metrics

Good:

- suggestion accepted when actually useful;
- suggestion declined easily;
- user corrects a preference;
- repeated unwanted suggestions decrease;
- safer alternative chosen;
- abstention where context is weak;
- clear provenance understanding.

Not a north star:

- acceptance rate;
- activities/week;
- time spent;
- “bond engagement”;
- retention caused by reminders.

**STATUS: MASTER READY FOR FOUNDER / PRODUCT / PRIVACY / AI REVIEW.**
