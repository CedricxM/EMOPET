# Breiz — content freshness gate

**Date:** 2026-10-03  
**Status:** `CONTROLLED MODEL / NO SOURCE PROMOTED`

## Decision

Public Breiz use now requires two independent clocks to remain valid:

1. **rights freshness** — the source rights review and recheck window;
2. **content freshness** — the age of the exact document snapshot relative to the source-specific freshness policy.

Valid rights do not make old content current.

## Content freshness authority

A document carries `last_checked_at`.

A controlled source carries `freshnessHours`.

The content freshness verdict is:

- `fresh`;
- `stale`;
- `future_last_checked_at`;
- `unreadable_last_checked_at`;
- `no_recheck_rule`.

Only `fresh` authorizes a public promotion or public retrieval.

The boundary is inclusive: content checked exactly one configured freshness window ago is still fresh; anything older fails closed.

## Promotion boundary

`promoteBreizDocumentForPublicAnswer()` now rejects otherwise valid neutral content when its exact `last_checked_at` value is not fresh under the reviewed source policy.

A fresh rights receipt therefore cannot promote a stale document.

## Retrieval boundary

`evaluateBreizChunkReleaseAuthority()` re-evaluates the content timestamp at answer time.

A chunk with valid immutable rights binding still fails closed when:

- the content is stale;
- its check timestamp is in the future;
- its check timestamp is unreadable;
- the source has no usable recheck rule.

This prevents a historical vector-store snapshot from remaining public indefinitely merely because its rights receipt is still valid.

## Deterministic time

`retrieveBreizLocalKnowledge()` accepts an optional `nowMs` authority clock. Tests and controlled callers can therefore evaluate historical or future states without depending on wall-clock time.

## Schema boundary

`last_checked_at` must be a non-empty parseable date.

Schema validation proves timestamp shape only. Runtime freshness still requires the source policy and the current evaluation time.

## Boundary

This slice does not:

- promote any current source;
- refresh any existing content;
- infer source update times;
- change DATAtourisme or Région Bretagne rights status;
- close #116 or #835;
- assert that an old mock corpus is current.

It only ensures that public-answer authority expires when the underlying content evidence becomes stale.

Related: #116, #835, #821.
