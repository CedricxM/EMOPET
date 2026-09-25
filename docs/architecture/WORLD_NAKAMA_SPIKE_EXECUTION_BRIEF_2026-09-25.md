# WORLD-NAKAMA-01 execution brief

**Issue:** #565  
**Parent:** #48  
**Branch:** `spike/world-nakama-565`  
**Base:** `main@5ab7d2e893282f42b682a84675965c5e7b02e9e3`

## Authority

TECHNICAL SPIKE ONLY. NO PRODUCTION RUNTIME ACTIVATION. NO MERGE TO `main` WITHOUT EXPLICIT APPROVAL.

Nakama is limited to realtime/session concerns. Canonical EMOPET authority remains in the Hono/PostgreSQL stack for identity, ownership, consent/privacy, moderation/audit truth, ELI/scientific state, billing, and other durable product state.

## Execution order

1. Inspect #565, #48, `AGENTS.md`, `CLAUDE.md`, `ARCHITECTURE.md`, backend auth middleware/routes, and current workspace conventions.
2. Add an isolated local Nakama development stack without promoting the historical root Docker Compose path.
3. Add one narrow EMOPET↔Nakama adapter boundary.
4. Implement the smallest testable Friends / Groups / Presence / Chat slice.
5. Add fail-closed identity, unavailable/degraded, reconnect, and authority-firewall tests.
6. Add architecture/state-ownership/sequence/runbook documentation.
7. Run relevant build/typecheck/tests.
8. Open a **draft PR** referencing #565. Do not merge.

## Stop conditions

Stop the affected subtask and document the blocker if it would require:
- inventing a product or authority decision;
- moving identity/consent/moderation/ELI/dog ownership authority into Nakama or Unity;
- production credentials or deployment claims;
- broad unrelated refactors;
- bypassing the canonical Hono JWT identity boundary.

Full acceptance criteria and scope are in #565.
