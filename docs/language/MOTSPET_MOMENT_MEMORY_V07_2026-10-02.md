# MotsPet v0.7 — chosen Moment and Memory

Status: `CONTROLLED_SEED / INTERNAL_AUTHORITY_MAPPED`

## Decision

Promote two relationship-history concepts from the MotsPet review queue:

### `moment`

- FR: `moment choisi`;
- EN: `chosen moment`;
- semantic class: `INTENTIONAL_CAPTURE`.

A Moment is a deliberate capture event. It exists because the Owner chose to create or retain it.

### `memory`

- FR: `souvenir choisi`;
- EN: `chosen memory`;
- semantic class: `OWNER_CHOSEN_MEMORY_CONTENT`.

A Memory is durable relationship history explicitly retained by the Owner.

This language decision does not rename the product surfaces `Moments` or `Memories`.

## Authority already present in the repository

The repository already distinguishes the concepts and their limits:

- `docs/product/EMOPET_MEMORIES_EXPERIENCE_MASTER_v0.1.md`;
- `docs/product/EMOPET_SURFACE_NECESSITY_MATRIX_v0.1.md`;
- `docs/control/EMOPET_PRODUCT_AUTHORITY_MAP_v0.1.md`;
- `docs/product/EMOPET_EXPERIENCE_DOCTRINE_v0.1.md`;
- `docs/strategy/OWNER_RELATIONSHIP_AND_PRODUCT_SCOPE_DOCTRINE_2026-09-11.md`.

The Surface Necessity Matrix states the semantic split directly:

- Moment = deliberate capture event;
- Memory = durable chosen history.

The Product Authority Map classifies `MEMORY_CONTENT` as Owner-chosen private relationship history and explicitly forbids automatic ELI-generated sentimental Memory creation.

## Semantic ceiling

### Moment may represent

- user-created media;
- an Owner-authored note;
- intentionally retained context;
- a deliberate capture that may later be saved or declined as a Memory.

Moment must never mean:

- sensor-detected emotional significance;
- an automatically inferred happy/sad event;
- an ELI interpretation converted into relationship meaning;
- automatic social publication.

### Memory may represent

- a deliberately saved Moment;
- an Owner-authored milestone;
- a chosen place, ritual, person or event context;
- an explicitly retained note or symbolic keepsake where separately permitted.

Memory must never mean:

- ELI-generated sentiment;
- a relationship-quality score;
- a good-Owner judgement;
- a streak/completion mechanic;
- sensor anomaly converted into sentimental history;
- automatic public/social content.

## Privacy boundary

Both concepts retain:

`PRESERVE_PURPOSE_AND_CONSENT`.

Existing Memories remain private by default. Any later transition to Community, World or a professional surface requires its own explicit audience/purpose authority.

## Why provenance remains required

For these concepts, provenance is not scientific provenance. It is authorship/source lineage.

The system must be able to distinguish that a Moment or Memory originated from an explicit Owner action, confirmation or permitted source path. A sensor event alone cannot satisfy that provenance.

## Runtime impact

This change only:

1. adds controlled FR/EN MotsPet language;
2. adds semantic QA truth classes;
3. reconciles the candidate inventory;
4. removes `moment` and `memory` from the next-review queue.

It does not implement:

- Moment/Memory persistence;
- automatic resurfacing;
- Community publication;
- World handoff;
- professional sharing;
- ELI interpretation changes.

## Remaining MotsPet review queue

- `community_visibility`.

`activation_change` remains `AUTHORITY_HOLD`.
