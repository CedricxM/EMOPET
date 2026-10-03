# EMOPET — WORLD SOCIAL ADVERSARIAL & ABUSE CASES v0.1

**Date:** 2026-09-01  
**GitHub:** #46  
**Status:** PROPOSED TRUST & SAFETY TEST SEED

## ADV-SOC-001 — Preset spam
A Stranger repeatedly sends `Salut` every second.

Expected:
- rate limit;
- mute/block available;
- no escalating visual attention.

## ADV-SOC-002 — Repeated invite after decline
User declines activity.

Expected:
- cooldown or suppression for repeated identical invites;
- no shame copy;
- no “they ignored you” signal.

## ADV-SOC-003 — Trust escalation attempt
Connected user tries to access personal space before explicit permission.

Expected:
- denied server-side;
- no client-only bypass.

## ADV-SOC-004 — Block during activity
User blocks another participant while in `La piste commune`.

Expected:
- social interaction ends;
- session policy handles separation/rematch safely;
- blocker is not forced back into the same private instance.

## ADV-SOC-005 — Contextual acquaintance leakage
Two users share one event, then event ends.

Expected:
- temporary permissions disappear;
- no persistent DM access unless they mutually connected.

## ADV-SOC-006 — Location inference
User attempts to infer exact location from World instance or event metadata.

Expected:
- only broad World context exposed;
- no precise real-world coordinates.

## ADV-SOC-007 — Dog emotion proxy
User selects `Bien joué`; dog avatar performs “happy wag.”

Expected:
- FAIL.
Quiet Social Layer must not trigger dog emotional expression.

## ADV-SOC-008 — Popularity pressure
A user receives many connection requests.

Expected:
- no public “popular Guardian” badge/rank;
- controls to limit requests.

## ADV-SOC-009 — Harassment via presets
User alternates allowed presets to annoy someone.

Expected:
- rate-limit, mute, block, report still apply even though text is pre-approved.

## ADV-SOC-010 — Mutual friends shortcut
System sees 5 mutual connections and automatically upgrades trust.

Expected:
- FAIL.
Mutual friends never auto-grant trust.

## ADV-SOC-011 — Real dog data shortcut
Two Guardians have similar dog profiles.

Expected:
- no social compatibility score;
- no trust upgrade.

## ADV-SOC-012 — Decline visibility
User declines connection request.

Expected:
- requester receives neutral state;
- no punitive or humiliating wording;
- no repeated automatic prompts.

**STATUS: ADVERSARIAL SEED READY FOR QA EXPANSION.**