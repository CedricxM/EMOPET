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

## Reviewed append preparation

`scripts/control/prepare-reviewed-transition-append.mjs` is the explicit bridge between a review-only proposal and a possible future ledger append.

It requires:

- a concrete proposal ID;
- an explicit `--accept` flag;
- a review date;
- a public-safe review reference of kind `path`, `issue` or `pr`;
- a separate output path.

The output is validated by `reviewed-transition-append.schema.json` and remains deliberately incomplete: `event_id` and `source_snapshot_ref` stay null, `append_to_ledger` stays false, and human PR approval remains required.

The command refuses to use `company-transitions.jsonl` as its output path. It prepares a candidate only; it never appends history.

Example:

```bash
node scripts/control/prepare-reviewed-transition-append.mjs \
  --proposal-id EMO-PROPOSAL-YYYYMMDD-NNNN \
  --accept \
  --reviewed-on YYYY-MM-DD \
  --review-ref-kind pr \
  --review-ref-value '#123' \
  --output reviewed-transition-append.json
```

Do not create a reviewed candidate unless a real human review reference exists. The tooling must not fabricate approval to make the ledger look complete.

## Human-approved finalization

`scripts/control/finalize-reviewed-transition-append.mjs` is the only Company OS helper allowed to append a prepared reviewed transition to the canonical ledger.

It is deliberately manual and fail-closed:

- it refuses to run when `CI` is set;
- it requires explicit `--finalize`;
- it requires a human-supplied final event ID;
- the event-ID date must match `--recorded-on`;
- it requires an already-merged `main@<40-hex-sha>` source snapshot reference;
- it requires the explicit append pull request reference as `#<number>`;
- the reviewed candidate must still point to the current ledger tail;
- duplicate event IDs are rejected;
- the prior human review reference and append-PR reference are preserved in `decision_refs`.

Example:

```bash
node scripts/control/finalize-reviewed-transition-append.mjs \
  --reviewed-candidate reviewed-transition-append.json \
  --event-id EMO-TRANSITION-YYYYMMDD-NNNN \
  --recorded-on YYYY-MM-DD \
  --source-snapshot-ref main@<already-merged-sha> \
  --append-pr-ref '#123' \
  --finalize
```

This command is intended for a separate, explicit append PR after human review. CI may validate the resulting append-only ledger, but CI must never invoke the finalizer.

No final event should be created merely because tooling exists. If there is no real reviewed proposal and real append PR, there is nothing to append.
