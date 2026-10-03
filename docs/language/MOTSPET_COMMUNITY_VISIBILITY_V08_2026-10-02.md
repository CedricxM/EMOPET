# MotsPet v0.8 — explicit Community audience

Status: `CONTROLLED_SEED / INTERNAL_AUTHORITY_MAPPED`

## Decision

Promote `community_visibility` from the MotsPet review queue as:

- FR: `audience choisie`;
- EN: `chosen audience`;
- semantic class: `EXPLICIT_AUDIENCE_CHOICE`.

This concept describes an explicit audience boundary. It does not publish content by itself and does not create a Community/World entitlement.

## Authority already present

Relevant repository authority:

- `docs/product/EMOPET_HUMANE_SOCIAL_ARCHITECTURE_MASTER_v0.2_VERIFIED_2026-09-01.md`;
- `docs/product/EMOPET_OWNER_AUTHORITY_MASTER_v0.1.md`;
- `docs/control/EMOPET_PRODUCT_AUTHORITY_MAP_v0.1.md`;
- `docs/product/EMOPET_SURFACE_NECESSITY_MATRIX_v0.1.md`;
- `docs/strategy/OWNER_RELATIONSHIP_AND_PRODUCT_SCOPE_DOCTRINE_2026-09-11.md`.

These sources already require controlled publication, explicit profile/audience choices, restrictive defaults, no hidden audience expansion and separate purpose-specific handling for exact location.

## Semantic ceiling

`community_visibility` may describe:

- the audience explicitly chosen for a particular Community/Circles/World social context;
- a bounded visibility choice attached to an authorized social action.

It must never mean:

- automatic publication;
- public-by-default exposure;
- silent audience expansion;
- blanket consent;
- all-data sharing;
- exact-location sharing without a separate explicit purpose-specific transition;
- permission to expose Care/ELI, private Memories, raw Breiz conversation or other private data.

The invariant remains:

`PRESERVE_PURPOSE_AND_CONSENT`.

## Relationship to share_scope and consent

The three concepts remain separate:

- `community_visibility` = who is the chosen social audience;
- `share_scope` = what bounded information may be shared, for which purpose/window;
- `consent` = the purpose-bound permission.

No one of these silently manufactures the others.

## Runtime and release boundary

This language promotion does **not** assert that Community or World is production-ready.

It does not:

- activate a Community/World account;
- publish a post/profile/Memory;
- implement audience persistence;
- implement durable account-bound consent;
- expose exact location;
- bypass moderation, age, block/report or Trust & Safety gates;
- close #131 or any World/Community release gate.

## Candidate inventory state

After this promotion, the `CANDIDATE_REVIEW` queue is empty.

That does not mean every MotsPet concept is released. `activation_change` remains `AUTHORITY_HOLD` and controlled entries remain bounded by their own implementation/release authorities.
