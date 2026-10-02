# Company Time Machine append PR

> Use this template only for a **human-reviewed append** to `state/history/company-transitions.jsonl`.
> This PR records an already-reviewed transition. It does not create the underlying decision.

## Transition

- Proposal ID:
- Reviewed candidate / review reference:
- Event ID:
- Recorded on:
- Source snapshot: `main@<40-hex-sha>`
- Previous ledger tail:
- Subject:
- From:
- To:

## Required checklist

- [ ] The underlying proposal was reviewed by a human before this append PR was prepared.
- [ ] The review reference is public-safe and points to a real `path`, `issue`, or `pr`.
- [ ] `source_snapshot_ref` points to an **already-merged main commit**, not this PR head or an unmerged branch commit.
- [ ] The cited source snapshot is equal to or an ancestor of this PR's base SHA. CI verifies this and fails closed.
- [ ] The reviewed candidate still matches the current ledger tail.
- [ ] The event ID uses `EMO-TRANSITION-YYYYMMDD-NNNN` and its date matches `recorded_on`.
- [ ] This PR only appends history; existing ledger lines were not edited, reordered, or deleted.
- [ ] `TIME_MACHINE.md` was regenerated from the ledger.
- [ ] The append PR reference is preserved in `decision_refs`.
- [ ] No secret, signature, identity document, bank detail, private contract, personal data, confidential supplier material, or restricted investor term is included.
- [ ] No claim of scientific validation, product validation, legal clearance, release authority, funding approval, or commercial commitment is created by this append.

## Reviewer confirmation

- [ ] I reviewed the underlying state change, not only the mechanics of the ledger append.
- [ ] I understand that green CI proves structural/history controls, not the substantive truth of the transition.

## Notes

Describe why this transition belongs in the Company Time Machine and link the controlling authority/evidence/decision records.
