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


## Append pull-request checklist

Use `.github/PULL_REQUEST_TEMPLATE/company-transition-append.md` for a real human-reviewed ledger append.

The append PR must identify the reviewed proposal/candidate, final event ID, recorded date, source snapshot and current ledger tail. Reviewers must confirm both the underlying state transition and the append mechanics.

## Source-snapshot verification

`scripts/control/verify-transition-source-snapshot.mjs` verifies that an appended event's `source_snapshot_ref` is not merely a syntactically valid `main@<sha>` string.

In pull-request CI, every newly appended event must cite a source snapshot that is **equal to or an ancestor of the PR base SHA on main**. The guard uses GitHub compare evidence and fails closed for divergent, unmerged or otherwise unreachable snapshots.

This check proves repository ancestry only. It does not approve the transition or validate the underlying product, scientific, legal, funding or release claim.

Manual diagnostic example:

```bash
node scripts/control/verify-transition-source-snapshot.mjs \
  --repository CedricxM/EMOPET \
  --source-snapshot-ref main@<already-merged-sha> \
  --base-sha <pull-request-base-sha>
```

## Workflow status doctor

`scripts/control/transition-workflow-status.mjs` is a read-only diagnostic for the proposal → review → append path.

Default diagnostic:

```bash
node scripts/control/transition-workflow-status.mjs
```

To inspect a prepared reviewed candidate:

```bash
node scripts/control/transition-workflow-status.mjs \
  --reviewed-candidate reviewed-transition-append.json
```

The helper can report:

- `NO_PENDING_PROPOSALS`;
- `PROPOSAL_REVIEW_REQUIRED`;
- `REVIEWED_CANDIDATE_ORPHANED`;
- `REVIEWED_CANDIDATE_SOURCE_MISMATCH`;
- `REVIEWED_CANDIDATE_STALE`;
- `REVIEWED_CANDIDATE_READY_FOR_MANUAL_FINALIZATION_INPUTS`.

These are mechanical workflow states only. They are not approval, validation, release authority, funding authority or a substitute for the substantive human review.


## Transition review packet

`scripts/control/transition-review-packet.mjs` turns a proposal queue into a human-readable inspection packet without modifying any controlled state.

Render the committed queue:

```bash
node scripts/control/transition-review-packet.mjs
```

Render a CI-generated proposal artifact:

```bash
node scripts/control/transition-review-packet.mjs \
  --proposal-queue company-transition-proposals.json
```

Focus one proposal:

```bash
node scripts/control/transition-review-packet.mjs \
  --proposal-queue company-transition-proposals.json \
  --proposal-id EMO-PROPOSAL-YYYYMMDD-NNNN
```

The packet is inspection only. It is not approval, a review reference, append readiness or substantive decision authority. A real accepted proposal still requires the separate reviewed append preparation flow with a real dated review reference.


## Operator handoff

When the workflow doctor reports `PROPOSAL_REVIEW_REQUIRED`, its `operator_handoff` points to the existing read-only transition review packet command.

The handoff is mechanical navigation only. With multiple pending proposals it renders the full queue and deliberately does not select a proposal ID, rank proposals, or imply review priority. It never accepts, approves, prepares, finalizes or appends a transition.
