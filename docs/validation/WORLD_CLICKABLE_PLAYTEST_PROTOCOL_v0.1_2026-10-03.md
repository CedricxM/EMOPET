# EMOPET World controlled clickable playtest protocol v0.1

**Issue:** #49  
**Parents:** #43, #46  
**Date:** 2026-10-03  
**Status:** `PROPOSED CONTROLLED PRODUCT-VALIDATION PROTOCOL / NOT STARTED`  
**Gate:** `G-WORLD-PLAYTEST-01 = OPEN`  
**Prototype:** `docs/prototypes/world-playtest-v0.1/index.html`

**Not a clinical study. Not scientific validation of ELI. Not retention evidence. Not production authorization.**

## 1. Decision question

Does the bounded World concept create enough understandable, comfortable and voluntary social value that a participant would plausibly choose to return **for the World experience itself**, without needing a new Care, MAT, TAG or ELI insight?

This protocol does not ask whether Unity, Nakama or the current technical spike works. Those technical questions are separately evidenced. It asks whether the product concept deserves a higher-fidelity World prototype.

## 2. What this round is allowed to conclude

This round may support one of four product-research dispositions:

- `GO_TO_HIGHER_FIDELITY_PROTOTYPE`
- `ITERATE_CLICKABLE_PROTOTYPE`
- `HOLD_FOR_SAFETY_OR_AUTHORITY_REDESIGN`
- `NO_GO_CURRENT_WORLD_CONCEPT`

It may identify:
- usability failures;
- social-pressure failures;
- safety-control failures;
- authority/privacy misunderstandings;
- preference between the two communication conditions;
- whether the cooperative activity appears intrinsically interesting enough to justify another prototype round.

It may **not** claim:
- retention;
- engagement lift;
- product-market fit;
- launch readiness;
- moderation readiness at scale;
- child/youth safety;
- clinical or behavioural validity;
- that a participant's stated return intent predicts real return behaviour.

## 3. Authority and design constraints

The test must preserve the current World doctrine:

- World is a persistent social experience, not a monetized game layer.
- No dog-health, ELI, relationship or activity score becomes gameplay.
- No streak, leaderboard, popularity rank, currency or reward pressure.
- Dog representation remains emotionally neutral.
- Community speech is not EMOPET scientific authority.
- Community and World are separate but connected surfaces.
- Exact location is never exposed by the prototype.
- Accept and decline actions must have comparable prominence.
- Leaving, blocking and reporting must remain easy.
- No direct or hidden pressure to keep playing.
- No participant content is used to infer dog emotion, relationship quality or compatibility.

## 4. Prototype scope

The clickable prototype must represent all #49 required moments:

1. Community to World handoff;
2. Hub arrival;
3. `Mon espace`;
4. stranger encounter;
5. Quiet Social Layer;
6. invite / accept / decline;
7. `La piste commune` cooperative flow;
8. shared keepsake placement;
9. block / report / leave;
10. dog-avatar-neutrality explanation.

The prototype is intentionally 2D and local-only. It is designed to answer product questions faster than a new 3D build.

## 5. Test conditions

### Condition A: preset-only coordination

Participants may use only the controlled Quiet Social Layer presets:

- Salut
- Par ici
- J'ai trouvé quelque chose
- Prêt·e
- Attends
- Bien joué
- Merci
- Je quitte
- Pas maintenant

The participant must be able to complete the cooperative flow without free text.

### Condition B: preset + free text

The same flow is available, with a bounded free-text field added.

The comparison question is not "which makes people type more?". It is:

> Does free text materially improve comprehension, comfort or connection enough to justify the additional moderation and safety surface?

### Ordering

For an initial moderated round, use counterbalanced order where possible:

- half of sessions: A then B;
- half of sessions: B then A.

If sample size is too small to balance order, record the order explicitly and do not interpret condition differences as causal.

## 6. First-round participant boundary

Recommended first controlled round: **8 to 12 adults, age 18+**.

This is a conservative product-research boundary, not a statement of law. Youth social design remains separately gated and must not be inferred from adult results.

Seek variation in:
- familiarity with social games / virtual spaces;
- technical confidence;
- dog ownership or dog-care experience;
- comfort with meeting strangers online;
- preference for text communication vs low-friction preset communication.

Do not recruit only enthusiastic EMOPET supporters.

## 7. Data minimization

Use participant codes, not names, in the observation sheet.

Do not request:
- real dog health history;
- real exact location;
- account credentials;
- real Community content;
- sensitive Breiz conversations;
- medical/veterinary information.

The prototype itself:
- sends no network requests;
- persists no participant input;
- uses no analytics;
- uses no local storage;
- uses synthetic identities and synthetic content only.

If a session is screen-recorded, obtain explicit research consent outside this prototype and store the recording under the applicable research/privacy process. The repository does not authorize recording by itself.

## 8. Moderator rules

The moderator should:
- read the same opening script for every participant;
- avoid explaining controls before the participant attempts the task;
- distinguish a clarification from a hint;
- record every hint;
- avoid praising one communication mode over the other;
- avoid explaining the intended product philosophy until after the comprehension questions;
- never turn a failed task into a success by completing it for the participant.

A task is `UNASSISTED_SUCCESS` only when completed without a hint that identifies the target control.

## 9. Session script

Target moderated duration: approximately **30 to 40 minutes**.

### S0 - opening and expectation capture

Moderator script:

> This is an early interactive concept, not a finished product. Some controls may be incomplete. Please say what you expect to happen before you click when that feels natural. I am testing the concept, not you.

Ask before showing World:
1. What would you expect an EMOPET social space to let you do?
2. What would make you uncomfortable in a social space connected to a dog-care product?
3. If you saw something from another user, would you assume EMOPET had verified it?

Do not correct answers yet.

### S1 - Community to World handoff

Start on the synthetic Community card.

Task:

> You see a local Community discovery that interests you. Find how you would enter the shared World experience connected to it.

Observe:
- whether the handoff is found;
- whether participant expects Community content to become scientific/ELI truth;
- whether the boundary between Community and World is understandable.

Post-task question:

> What do you think EMOPET has verified about the Community item you just saw?

### S2 - Hub arrival and orientation

Task:

> You have entered World. Tell me what you think you can do here, then choose what you would do first.

Observe:
- first fixation / first action;
- whether `Mon espace`, social presence and discovery are distinguishable;
- whether the Hub feels navigable without tutorial text;
- whether any element looks like a score, reward or obligation.

### S3 - stranger encounter and invitation

Task:

> Another adult participant appears in the Hub. Decide whether you want to interact.

Run two variants across sessions:
- invitation accepted;
- invitation declined / `Pas maintenant`.

Observe:
- whether decline feels equivalent in weight;
- whether decline creates guilt or implied penalty;
- whether the participant understands that proximity alone does not create trust;
- whether the neutral dog representation is misread as emotion or compatibility.

Ask:

> What, if anything, did the dog representation tell you about the real dog's mood or relationship with the other person?

Correct answer is not taught until after the response is recorded.

### S4 - Quiet Social Layer

Use the assigned communication condition.

Task:

> Coordinate with the other participant to start a shared activity.

Observe:
- whether preset meanings are understandable;
- whether the participant searches for free text in Condition A;
- whether Condition A can support basic coordination;
- whether free text in Condition B adds meaningful capability or only familiarity.

### S5 - `La piste commune`

Task:

> Complete the shared trail together.

The prototype uses three cooperative checkpoints. Neither participant can earn points, rank or dog-performance progress.

Observe:
- whether the activity is understood as cooperation rather than competition;
- whether coordination itself feels satisfying;
- where confusion occurs;
- whether the participant feels pressure to continue after wanting to stop.

Ask immediately after:

> If there were no new Care or ELI information tonight, would this activity alone give you a reason to open World? Why or why not?

This is directional qualitative evidence only. It is not retention evidence.

### S6 - shared keepsake and `Mon espace`

Task:

> Keep one neutral reminder of the shared activity, then find where it lives.

Observe:
- whether "shared keepsake" is confused with public Community posting;
- whether personal-space persistence is expected to be private or public;
- whether the participant expects sensor/ELI information to be attached automatically.

Ask:

> Who do you think can see this keepsake right now?

Record the prediction before revealing the prototype answer.

### S7 - block / report / leave

Scenario:

> The other participant keeps trying to interact after you no longer want contact.

Do not point to safety controls.

Task:

> Do whatever you would naturally do.

Observe:
- time to first safety action;
- whether leave, block and report are discoverable;
- whether the participant understands the difference;
- whether blocking appears to reveal exact location or additional identity;
- whether the participant feels trapped or pressured.

A severe failure is recorded if the participant cannot find a viable exit/safety action without moderator rescue.

### S8 - exit and return-intent debrief

Task:

> End the World session.

Observe whether leaving is obvious and non-punitive.

Ask:
1. What part, if any, would make you choose to come back?
2. What would make you avoid opening World?
3. Would you miss this if it disappeared from EMOPET?
4. Could Community alone replace it?
5. Could a normal group chat replace it?
6. Which communication condition felt safer?
7. Which felt more natural?
8. Which gave you more useful control?
9. Did anything make you think EMOPET knew how a dog felt?
10. Did anything make you think another user's statement was EMOPET evidence?

## 10. Observation fields

Use the controlled CSV template:
`docs/validation/templates/WORLD_PLAYTEST_OBSERVATION_SHEET_v0.1.csv`.

For each scenario capture:
- completion state;
- assisted vs unassisted;
- hints;
- time to first meaningful action;
- time to task completion;
- misclick / wrong-path count;
- authority confusion;
- privacy prediction;
- safety control discovery where applicable;
- comfort (1-5);
- pressure (1-5);
- return intent (1-5, directional only);
- verbatim participant note;
- observer note.

Time metrics are diagnostic friction measures. They must not be optimized as engagement metrics.

## 11. Issue severity

Use the issue log:
`docs/validation/templates/WORLD_PLAYTEST_ISSUE_LOG_v0.1.csv`.

Severity:

- `S0_CRITICAL`: credible safety/privacy/authority failure or participant cannot safely exit;
- `S1_HIGH`: blocks a core scenario or creates repeated material misunderstanding;
- `S2_MEDIUM`: significant friction with a workaround;
- `S3_LOW`: polish/copy/visual hierarchy issue.

Categories:
- `SAFETY`
- `PRIVACY`
- `AUTHORITY_COMPREHENSION`
- `SOCIAL_PRESSURE`
- `NAVIGATION`
- `QUIET_SOCIAL`
- `COOP_ACTIVITY`
- `PERSONAL_SPACE`
- `COMMUNITY_HANDOFF`
- `ACCESSIBILITY`
- `OTHER`

## 12. Predeclared decision rules

These are product-research gates, not statistical claims.

### Mandatory HOLD / ITERATE triggers

A `GO_TO_HIGHER_FIDELITY_PROTOTYPE` is not available if any of the following remains unresolved after the round:

- any `S0_CRITICAL` safety/privacy/authority issue;
- block/report/leave cannot be completed by at least 80% of participants without a moderator identifying the control;
- more than 20% of participants leave the session believing Community speech was verified EMOPET/ELI evidence after the tested explanation;
- more than 20% interpret the dog avatar as a live emotional/relationship signal;
- decline/leave is repeatedly described as punitive, guilt-inducing or visually hidden;
- `La piste commune` requires Care/ELI rewards, points, streaks or dog-performance scoring to make sense;
- Condition B adds free-text value only by introducing a moderation surface that the team cannot yet govern.

### Candidate GO to higher fidelity

A candidate GO requires all mandatory triggers to be clear **and**:

- at least 80% complete Hub -> encounter -> shared activity -> exit without moderator rescue;
- at least 80% correctly identify that the dog representation is not an emotional inference after the prototype explanation;
- at least 80% correctly distinguish synthetic Community speech from EMOPET evidence after the tested boundary explanation;
- median comfort is at least 4/5;
- median pressure is at most 2/5;
- at least half of participants can name a World-specific value that they say Community or ordinary chat would not replace;
- the qualitative reasons for return do not primarily depend on Care/ELI rewards, streaks, FOMO or dog-performance progression.

These thresholds are deliberately fixed before observation to reduce post-hoc goal movement. They can be revised only by versioning the protocol before a later round.

### NO-GO current concept candidate

Consider `NO_GO_CURRENT_WORLD_CONCEPT` when repeated evidence shows that:
- participants see little value beyond Community/chat;
- the cooperative activity repeatedly feels like a thin wrapper rather than a reason to visit;
- safety/privacy boundaries make the intended stranger-social experience impractical;
- the concept requires prohibited engagement or dog-data mechanics to create motivation.

## 13. Condition A vs B interpretation

Do not choose free text merely because participants are accustomed to typing.

Prefer Condition A when presets provide sufficient coordination and materially reduce uncertainty, moderation burden or unwanted contact.

Prefer Condition B only when the round produces specific recurring tasks or social needs that presets cannot express and those benefits justify the expanded moderation/safety surface.

A mixed future model may also be proposed, but must remain separately gated.

## 14. Accessibility review

During every session record:
- keyboard-only reachability where applicable;
- clarity without relying on colour alone;
- text legibility;
- control labels;
- whether preset meanings depend on animation;
- whether reduced-motion users would lose information;
- whether the experience assumes fast reaction or precise pointing.

An accessibility workaround is an issue, not a participant failure.

## 15. Required evidence package after the round

Do not close #49 until the repository contains:

1. protocol version actually used;
2. participant criteria and count;
3. condition/order assignment;
4. completed observation sheets;
5. issue log;
6. confusion/adverse cases;
7. condition A/B comparison;
8. unresolved safety/privacy/authority issues;
9. a written `GO / ITERATE / HOLD / NO-GO` recommendation;
10. Founder decision recorded separately from the researcher's recommendation.

Raw personal participant information must not be committed to the public repository.

## 16. Current evidence status

As of 2026-10-03:

- protocol: **DEFINED / NOT RUN**;
- clickable prototype: **CANDIDATE / NOT YET PLAYTESTED**;
- participants: **0 recorded under this protocol**;
- observation evidence: **NONE**;
- playtest disposition: **NONE**;
- `G-WORLD-PLAYTEST-01`: **OPEN**.

The existence of this document and prototype does not close any product gate.
