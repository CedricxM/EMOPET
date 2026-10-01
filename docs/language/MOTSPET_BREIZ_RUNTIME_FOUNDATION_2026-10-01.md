# EMOPET — MotsPet + Breiz runtime foundation v0.2

**Date:** 2026-10-01  
**Issue:** #817  
**Status:** `IMPLEMENTED FOUNDATION CANDIDATE / CONTROLLED SEED / EXTERNAL REVIEW OPEN / NOT RELEASE AUTHORITY`

## 1. Purpose

This slice implements the first controlled runtime boundary for:

`ELS / Semantic Core → MotsPet → Explanation Grammar → Regional Companion → Local Context Engine`.

It does not declare MotsPet v1 complete, validate Breton/Gallo wording or promote any external content source.

## 2. MotsPet v0.2 seed

The seed carries:
- stable concept id;
- domain + internal producer terms;
- FR/EN public wording;
- definition + prohibited shortcuts;
- provenance requirement;
- repository authority pointers;
- explicit revision;
- review state;
- reviewer/date/receipt slots;
- `CONTROLLED_SEED` vs `HOLD`.

Current controlled concepts:
- observation;
- Owner note, with domain `Owner` / French product `Propriétaire` terminology authority;
- confidence;
- insufficient evidence / epistemic silence;
- source;
- consent, anchored to the controlled data-governance doctrine.

The activation/arousal wording stays `AUTHORITY_HOLD`.

## 3. Regional review gate

Regional terms are separate from MotsPet semantics.

The current prototype candidates `Demat` and `Ar Veute` remain `PENDING_REVIEW`.

A future `VERIFIED` status is insufficient by itself. Prompt injection requires:
- named reviewer;
- review date;
- review receipt/reference.

This prevents a one-line status change from silently manufacturing cultural authority.

## 4. Candidate reviewer intake

Issue #817 records verified public candidate channels:
- OPLB / TermBret for Breton terminology;
- Institut du Galo for Gallo language/terminology;
- Chubri as optional secondary Gallo perspective;
- Bretagne Culture Diversité for cultural/editorial context.

They are **candidate reviewers only**, not partners and not rights grants.

## 5. Runtime integration

The regional system prompt receives:
1. the controlled MotsPet block;
2. the fail-closed regional lexicon block;
3. only the existing bounded relevant regional knowledge.

Regional wording may not change:
- truth class;
- confidence;
- provenance;
- consent/privacy meaning;
- medical boundary.

## 6. Next gates

### LANG-REG-01A — reviewed minimum inventory
Inventory 15–30 high-frequency public terms first, with authority and review metadata.

### LANG-REG-01B — first named regional review receipt
No regional candidate moves to VERIFIED before evidence is recorded.

### LANG-REG-01C — cross-locale semantic QA
Prove FR/EN/regional wording preserves truth class, confidence, provenance, consent/privacy and medical boundaries.

### LANG-REG-01D — legacy-copy migration
Only after the inventory/review gate is mature enough should duplicated UI wording be migrated to MotsPet.

## 7. Non-goals

This slice does not:
- rename Breiz globally;
- alter UI design;
- claim Breton/Gallo correctness;
- activate external APIs;
- ingest BCD/Bécédia/Bretania;
- change ELI scientific authority;
- promote a regional term from prototype presence alone;
- claim production readiness.
