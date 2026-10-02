# EMOPET Company Time Machine

This directory stores the append-only Company OS transition ledger.

## Canonical ledger

`company-transitions.jsonl`

One JSON object per line, validated against `company-transition.schema.json`.

## Append-only rule

Existing lines are historical records and MUST NOT be edited, reordered or deleted.

When a past record needs correction, append a new `CORRECTION` event and point `corrects_event_id` at the earlier event. Do not rewrite the earlier line.

Each non-bootstrap event must point `previous_event_id` to the immediately preceding event.

CI compares the pull-request version of the ledger with the base-branch copy and rejects any change that is not a strict append.

## Authority boundary

The ledger records **that a controlled state changed and why**. It does not itself create domain truth.

A transition must preserve public-safe references to the controlling authority, evidence and decision record when those exist.

Repository activity alone is not evidence, validation, legal clearance, release authority or freshness.

## Confidentiality

The repository is public. Do not append secrets, private contracts, signatures, identity documents, bank details, personal data, private supplier material or restricted investor terms.

## Transition proposals

`scripts/control/propose-company-transitions.mjs` can derive review-only proposals from controlled state diffs.

The committed queue lives at `pending-transition-proposals.json` and is validated against `company-transition-proposals.schema.json`.

A proposal is **not** a ledger event. Every proposal carries `review_status = REVIEW_REQUIRED` and `append_ready = false`.

CI generates a fresh proposal artifact for each pull request by comparing the PR base state with the candidate state. That artifact is evidence for review only; it never edits `company-transitions.jsonl`.

A reviewed transition still requires an explicit human decision and a separate append-only ledger change.
