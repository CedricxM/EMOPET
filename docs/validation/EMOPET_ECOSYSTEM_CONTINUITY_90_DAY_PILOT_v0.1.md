# EMOPET — 90-Day Ecosystem Continuity Pilot v0.1

**Status:** PROPOSED CONTROLLED PRODUCT-VALIDATION PROTOCOL / NOT STARTED  
**Date:** 2026-09-06  
**Parent:** #223  
**Not a clinical trial. Not scientific validation of ELI.**

## 1. Question

Can a Guardian experience Care, Breiz, Together, Memories, Community/World and professional sharing as **one coherent EMOPET product** while still understanding that these surfaces have different evidence, privacy and semantic authority?

The pilot is designed to test ecosystem coherence, not to prove medical benefit or diagnostic performance.

## 2. Minimum prerequisite

Do not start until the tested slice has:
- stable test accounts and Guardian ownership;
- controlled consent/sharing flows;
- explicit provenance/confidence display for Care observations;
- an abstention state;
- a bounded Breiz implementation;
- at least clickable/testable versions of Together, Memories and Community/World handoff;
- a Veterinary Summary prototype;
- logging sufficient to reconstruct what the participant saw and did without collecting unnecessary sensitive data.

## 3. Cohorts

### Cohort A — ecosystem users
Target first controlled round: **12–20 Guardian–dog households**.

Recruit across:
- different dog ages;
- different household routines;
- different technical confidence;
- at least some users who are not enthusiastic early adopters.

### Cohort B — professional readers
Target: **6–12 veterinarians** who review bounded Veterinary Summary examples during or after the pilot.

Professional review is separate from clinical care unless a separately approved protocol exists.

## 4. 90-day journey

### Days 0–7 — onboarding / authority comprehension
Test:
- dog + Guardian setup;
- MAT/TAG onboarding where hardware is in-scope;
- consent/privacy choices;
- explanation of what EMOPET does and does not know.

Measure:
- can the user explain the difference between observation, suggestion and diagnosis?
- can the user find sharing/privacy controls?

### Days 8–21 — baseline / quiet value
Test:
- baseline formation or a controlled simulated baseline where real hardware validation is not ready;
- no forced insights;
- at least one deliberate abstention/degraded example.

Measure:
- trust after `insufficient information`;
- whether quiet days feel broken or appropriately quiet;
- misunderstanding of confidence.

### Days 22–35 — Breiz explanation
Test:
- Breiz explains a qualified observation;
- Breiz asks a clarifying question when context is missing;
- Breiz retrieves one controlled local/reference fact;
- Breiz explicitly distinguishes fact vs suggestion.

Measure:
- hallucination/overclaim perception;
- whether users think Breiz has independent access to the dog's emotions;
- usefulness vs generic-chat perception.

### Days 36–49 — Together + refusal learning
Test:
- user requests or enters Together;
- one bounded suggestion is produced;
- participant declines/skips at least one suggestion where naturally applicable;
- later recommendations demonstrate reduced pressure or preference learning.

Measure:
- whether refusal feels consequence-free;
- whether user understands suggestion rationale;
- whether suggestion feels like judgement of relationship quality.

### Days 50–63 — Moment → Memory
Test:
- create a deliberate Moment;
- save or decline to save it as Memory;
- retrieve it later manually;
- optional controlled Breiz retrieval on request.

Measure:
- privacy expectation;
- whether users think sensors auto-write emotional memories;
- value of history without streaks/push pressure.

### Days 64–77 — Community / Circle / World
Test at least one coherent path:
- discover a moderated local item or Circle;
- optional join/decline;
- controlled Community→World or Community→real-world activity handoff;
- clear leave/block/report path.

If World is not ready, use a clickable prototype rather than pretending runtime exists.

Measure:
- value without infinite scroll;
- comprehension of Community speech vs EMOPET authority;
- willingness to return without Care rewards;
- privacy/location expectations.

### Days 78–90 — professional continuity
Test:
- Guardian generates a Veterinary Summary;
- Guardian chooses whether/how to share;
- vet reviews summary or a standardized equivalent;
- access expires/revokes where implemented.

Measure:
- vet comprehension time;
- useful vs unnecessary fields;
- trust in observation/interpretation boundary;
- Guardian understanding of what was shared.

## 5. Primary system metrics

### 5.1 Coherence score
After each major phase ask:
> `Does this still feel like the same product serving one relationship with your dog?`

Use qualitative interview + bounded Likert item. Do not turn it into a public scientific metric.

### 5.2 Semantic-boundary comprehension
Participants classify example outputs as:
- OBSERVATION;
- EXPLANATION;
- SUGGESTION;
- MEMORY;
- COMMUNITY SPEECH;
- PROFESSIONAL INTERPRETATION.

Target for iteration: identify every repeated confusion cluster.

### 5.3 Trust-after-abstention
Ask whether `EMOPET does not have enough information` increases, decreases or does not change trust, and why.

### 5.4 Cross-surface privacy prediction
Before revealing the real answer, ask:
> `Who do you think can see this?`

Run on Care, Memory, Circle, World and Vet-sharing examples.

Any systematic wrong prediction is a design failure.

### 5.5 Surface necessity
For each surface:
- `Would you notice if this disappeared?`
- `What would you lose?`
- `Which other EMOPET surface could replace it?`

Use answers to enforce the Surface Necessity Matrix.

## 6. Anti-vanity metrics

Do **not** optimize the pilot for:
- total time spent;
- notification opens;
- number of Community posts;
- Memories created;
- Together suggestions accepted;
- World session length;
- daily streaks.

These may be diagnostic logs only where justified.

## 7. Failure triggers

Escalate / redesign if:
- users interpret qualified observations as diagnoses;
- users think Breiz knows the dog's inner emotional state;
- users cannot predict data sharing;
- Memories is perceived as automatically generated sentimental history;
- Community content is mistaken for EMOPET scientific authority;
- World needs Care/ELI rewards to feel worth opening;
- users feel guilt/pressure after declining Together or Community activity;
- vets report the Summary adds workload without useful chronology;
- MAT/TAG setup burden materially overwhelms perceived value.

## 8. Decision after round 1

Each surface receives one disposition:
- `KEEP / HARDEN`
- `NARROW`
- `MERGE`
- `DEFER`
- `KILL`

The ecosystem receives one disposition:
- `COHERENT — PROCEED TO LARGER PILOT`
- `PROMISING BUT FRAGMENTED — ITERATE`
- `OVERBUILT — REDUCE SCOPE`
- `NO-GO CURRENT ARCHITECTURE`

## 9. Evidence package

Required outputs:
- protocol version + participant criteria;
- scenario scripts;
- consent/research classification review;
- interview guide;
- event log schema;
- issue register;
- surface dispositions;
- adverse/confusion cases;
- final Founder decision.

**Gate:** `G-EMOPET-90D-CONTINUITY-PILOT-01 = OPEN`
