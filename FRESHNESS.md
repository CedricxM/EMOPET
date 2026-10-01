# EMOPET — Freshness / STALE State

> **Status:** `COMPANY OS FRESHNESS PROJECTION / NOT DOMAIN AUTHORITY`  
> **Machine-readable source:** `state/freshness/freshness-state.json`

Freshness is a separate overlay on top of Company OS state. It answers a different question from status:

**not only “what does the projection say?”, but “when was the controlling domain review last performed, when is review due, and when must this state stop being treated as current?”**

A recent Git commit, a recent file edit, or a dated evidence file does **not** automatically make the underlying claim fresh.

## Semantics

| Freshness state | Meaning | Decision effect |
|---|---|---|
| `UNREVIEWED` | No controlled domain review date and/or cadence is recorded | Cannot support freshness-dependent strong claims or promotion |
| `CURRENT` | Controlled review + cadence exist and review is not yet due | May be used subject to the underlying domain authority |
| `REVIEW_DUE` | Review date has arrived but the hard stale boundary has not | Re-review before relying on it for a strong claim |
| `STALE` | Hard stale boundary has been reached | Treat as non-current until re-reviewed |
| `NOT_APPLICABLE` | Freshness does not meaningfully apply to this item | No freshness promotion is implied |

## Initial V2 posture

This first slice is intentionally conservative.

Covered Company + Corporate/IP state objects, and evidence references exposed by those surfaces, begin as `UNREVIEWED` unless a controlled review event and cadence are explicitly available.

That is **not** a statement that the underlying material is wrong. It means the Company OS refuses to manufacture freshness from repository recency.

## Rules

- `CURRENT` requires a controlled domain review date, a review cadence, `review_due_at`, and `stale_after`.
- `REVIEW_DUE` begins when the review date arrives.
- `STALE` begins when the hard stale boundary arrives.
- `UNREVIEWED`, `REVIEW_DUE`, and `STALE` cannot be used to promote a covered item into a freshness-dependent strong state such as validated, signed, awarded, committed, passed, or reviewed-go.
- Re-indexing an unchanged source does not reset freshness.
- The controlling domain authority decides whether the underlying evidence is actually valid. This layer only records review timing and decision-use constraints.

## Next migration step

Add explicit domain review cadences only where the responsible authority can justify them. Missing cadence remains `UNREVIEWED`; the Company OS must never invent a 30/60/90-day review cycle merely to make the dashboard look complete.
