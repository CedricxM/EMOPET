# MotsPet v0.6 — bounded sharing scope

Status: `CONTROLLED_SEED / INTERNAL_AUTHORITY_MAPPED`

## Decision

Promote `share_scope` from the MotsPet review queue into runtime-controlled language as:

- FR: `périmètre de partage`;
- EN: `sharing scope`;
- semantic class: `SHARING_SCOPE_METADATA`.

This concept describes the explicit boundary of a sharing action. It does not itself grant permission.

## Authority already present in the repository

The current repository already separates professional-sharing authority into bounded attributes such as:

- recipient;
- declared purpose;
- scopes;
- data window;
- access expiry;
- lifecycle state.

Relevant authority paths:

- `docs/product/EMOPET_OWNER_AUTHORITY_MASTER_v0.1.md`;
- `docs/control/EMOPET_PRODUCT_AUTHORITY_MAP_v0.1.md`;
- `docs/strategy/DATA_TRUST_AND_BUSINESS_MODEL_DOCTRINE_2026-09-07.md`.

The persisted professional-sharing model also carries recipient, purpose, scopes and an access window. That implementation evidence supports a public-language concept for the boundary itself without upgrading that boundary into a new permission.

## Semantic ceiling

A sharing scope may state:

- what information is in scope;
- which recipient or audience is in scope;
- the declared purpose;
- the relevant data/access window.

It must never be interpreted as:

- blanket consent;
- unrestricted publication;
- unlimited access;
- permission for another purpose;
- proof that a recipient actually accessed or received the data;
- authority to expose private Memories, raw Breiz conversations or other excluded data.

The existing MotsPet privacy invariant remains:

`PRESERVE_PURPOSE_AND_CONSENT`.

## Why this is not the same as consent

`consent` remains a separate MotsPet concept with truth class `PURPOSE_BOUND_PERMISSION`.

`share_scope` is metadata describing the permitted sharing boundary. A valid scope can exist as a draft/configuration object before an active permission exists, and changing the scope does not silently create consent.

## Runtime impact

This change only:

1. adds controlled FR/EN vocabulary;
2. adds the semantic QA contract;
3. reconciles the candidate inventory;
4. removes `share_scope` from the next-review queue.

It does not change professional-share persistence, recipient activation, Community visibility, retention, legal basis, or any ELI/scientific authority.

## Remaining MotsPet review queue

- `moment`;
- `memory`;
- `community_visibility`.

`activation_change` remains `AUTHORITY_HOLD`.
