# World WP-02 repository reconciliation — original design artifacts vs current implementation

**Issue:** #46  
**Date:** 2026-10-03  
**Status:** `SOURCE RECOVERY + IMPLEMENTATION RECONCILIATION / GATE REMAINS OPEN`

## 1. Why this file exists

The five WP-02 World social-design artifacts referenced in #46 were originally produced on 2026-09-01 outside the Git repository. Later issue discussion correctly treated their absence from GitHub as an evidence/provenance gap.

On 2026-10-03 the original files were recovered from the persistent project Library and imported under `docs/product/world/`.

The imported files are preserved as historical source artifacts. Their wording, terminology and original status lines are not silently rewritten to make them look newer than they are.

That matters because some of the source files still say `NOT IMPLEMENTED`, while parts of the design have since been implemented on `main`.

## 2. Recovered source set

The recovered WP-02 source set is:

- `EMOPET_WORLD_QUIET_SOCIAL_LAYER_SPEC_v0.1.md`
- `EMOPET_WORLD_SOCIAL_TRUST_PERMISSION_MATRIX_v0.1.md`
- `EMOPET_WORLD_SOCIAL_TRUST_STATE_MACHINE_v0.1.md`
- `EMOPET_WORLD_ZERO_CHAT_COOP_TEST_PROTOCOL_v0.1.md`
- `EMOPET_WORLD_SOCIAL_ADVERSARIAL_CASES_v0.1.md`

Each file retains its original 2026-09-01 framing.

The historical use of `Guardian` inside these source artifacts is also preserved. Current repository terminology may use `Owner` under later terminology authority; source preservation is not a terminology rollback.

## 3. Reconciliation rule

Use the recovered files for:

- design intent;
- original permission boundaries;
- original abuse/adversarial cases;
- original zero-chat research question;
- original Quiet Social Layer interaction constraints.

Use current executable code and current controlled architecture documents for present implementation truth.

A historical status line never overrides newer verified implementation evidence.

## 4. Quiet Social Layer

### Original design authority

The recovered Quiet Social Layer source defines the first-slice communication model:

- user-triggered presets;
- human communication only;
- no dog-emotion proxy;
- no location-revealing preset;
- no required response;
- accessible text labels / non-colour-only alternatives;
- a first comparison between preset-only communication and preset + free text.

### Current implementation truth

The canonical World spike contract currently carries the nine controlled preset ids in:

`backend/api/services/world-spike/contracts.ts`

Current first-slice labels are:

- Salut
- Par ici
- J’ai trouvé quelque chose
- Prêt·e
- Attends
- Bien joué
- Merci
- Je quitte
- Pas maintenant

The transport carries the preset id and clients render the label.

Free text remains a separate command surface and is not part of the default first-slice path.

### Remaining evidence gap

Implementation of a bounded preset transport does **not** prove:

- social comfort;
- reduced harassment;
- accessibility;
- preference for presets;
- that free text is unnecessary.

Those claims remain playtest evidence questions.

## 5. Social Trust Ladder

### Original design authority

The recovered permission matrix/state-machine sources define:

- `STRANGER`
- `CONTEXTUAL_ACQUAINTANCE`
- `CONNECTED`
- `TRUSTED`
- global `BLOCKED` override

The ladder controls permissions only. It is not a friendship, bond, compatibility or relationship score.

`TRUSTED` is directional and explicitly granted.

No state silently grants Care, MAT, TAG, ELI, exact real-world location or private Memories.

### Current implementation truth

Current canonical connection authority lives in:

- `backend/api/services/social-connections.ts`
- `backend/db/schema/social-connections.ts`

Current implemented behaviour includes:

- request + explicit acceptance into `CONNECTED`;
- mutual request connecting immediately;
- silent decline semantics;
- one-action connection removal;
- directional user-granted `TRUSTED`;
- `BLOCKED` overriding social visibility and dissolving the connection;
- no numerical score;
- no automatic trust upgrade.

`CONTEXTUAL_ACQUAINTANCE` is represented in the canonical type vocabulary but is not currently produced by a durable shared-activity authority.

Nakama remains transport/session infrastructure and does not become the durable trust authority.

## 6. Presence

Current World presence remains invisible by default.

Canonical presence consent is a separate, session-bounded authority. A social connection does not silently create visibility consent.

This preserves the original permission-matrix rule that higher social state does not equal automatic location/presence disclosure.

## 7. Zero-chat cooperation

The recovered zero-chat protocol asks whether two people can complete `La piste commune` using spatial presence, presets/emotes and shared objectives without unrestricted text.

The controlled #49 clickable-playtest pack is now present on `main` and carries this research direction into an executable low-fidelity prototype.

However:

- a clickable prototype existing is not a playtest result;
- no controlled participant result is recorded by this reconciliation;
- no retention or social-comfort claim is promoted.

`G-WORLD-PLAYTEST-01` remains open until real participant evidence exists.

## 8. Adversarial / abuse cases

The recovered adversarial seed includes cases for:

- preset spam;
- repeated invitations after decline;
- trust-escalation bypass;
- block during shared activity;
- contextual-permission leakage;
- exact-location inference;
- dog-emotion proxy;
- popularity pressure;
- harassment using allowed presets;
- mutual-friend auto-trust;
- dog-data compatibility shortcuts;
- decline visibility / social punishment.

Some underlying technical controls now exist in canonical backend and World transport paths, including block enforcement, silent decline semantics, directional trust and preset-only first-slice messaging.

That does **not** establish a safety PASS for the product experience.

The actual usability, pressure, discoverability and abuse-handling experience must still be tested under #49 and subsequent Trust & Safety review.

## 9. What is now closed vs still open

### Repository provenance gap

**CLOSED for the five WP-02 source artifacts.**

The referenced originals are now in the repository rather than existing only outside GitHub.

### Technical implementation subsets

**PARTIALLY IMPLEMENTED / VERIFIED BY CURRENT CODE.**

Canonical connections, directional trust, block precedence, session-bounded presence consent and controlled World presets exist in current repository code.

### Product-validation gate

**OPEN.**

No source recovery, implementation test or technical spike can substitute for controlled participant evidence.

### #46 disposition

Keep #46 open until:

1. #49 records real controlled prototype evidence;
2. accessibility observations exist;
3. social-pressure/abuse findings are reviewed;
4. Condition A vs B evidence is recorded;
5. Founder review records the product disposition.

## 10. Claim boundary

This reconciliation authorizes none of the following claims:

- World is safe;
- presets reduce harassment;
- users prefer zero-chat interaction;
- social trust states are understood;
- the cooperative activity creates connection;
- the experience improves retention;
- World is launch-ready.

It only restores source provenance and reconciles historical design intent with current repository implementation truth.
