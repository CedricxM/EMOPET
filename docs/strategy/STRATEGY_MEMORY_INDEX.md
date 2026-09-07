# EMOPET — Strategy Memory Index

**Control date:** 2026-09-07  
**Status:** CONTROLLED STRATEGY-MEMORY INDEX

## Purpose

This index records the current strategic architecture of EMOPET and the controlled files that support it. Strategy is versioned project memory: important directions must not live only in meetings, decks or chat sessions.

Each strategic record should distinguish:

- `WORKING_STRATEGY` — current direction subject to testing/revision;
- `PROJECT_DECISION` — internal decision that governs downstream work until changed;
- `HYPOTHESIS` / `WORKING_ASSUMPTION` — proposition used for planning but not established fact;
- `SOURCE_VERIFIED` — factual input supported by a dated controlled source;
- `SUPERSEDED` — historical direction retained for traceability.

## Current strategic records

| Domain | Current status | Core direction | Controlled file |
|---|---|---|---|
| Project calendar | `PROJECT_DECISION` | 2026 is preparation/structuring; launch phase and Brittany ecosystem integration begin in 2027 | `docs/strategy/PROJECT_TIMELINE_2026_2027.md` |
| Competitive positioning | `CONTROLLED WATCH / WORKING_STRATEGY` | Differentiate through EMOPET's evidence contract, MAT + TAG multi-context architecture, provenance, confidence gating and abstention rather than generic health-tracker claims | `docs/strategy/COMPETITIVE_LANDSCAPE.md` |
| France veterinary channel | `WORKING_STRATEGY` | D2C as primary volume/margin engine; veterinarians as prescribers, credibility partners and early adopters rather than the primary retail channel | `docs/strategy/VETERINARY_PRESCRIBER_CHANNEL_FRANCE_2026-09-06.md` |
| Veterinary founding loop | `WORKING_STRATEGY` | Build an early practitioner feedback/prescriber loop before scaling a veterinary commercial channel | `docs/strategy/VETERINARY_FOUNDING_12_PRESCRIBER_LOOP_2026-09-06.md` |
| Scientific framework governance | `CONTROLLED SCIENTIFIC MEMORY` | Preserve proposal → feedback → recommendation → adoption → validation/licensing distinctions | `docs/research/SCIENTIFIC_FRAMEWORK_REGISTER.md` |
| Market intelligence | `CONTROLLED RESEARCH INDEX` | Market numbers, segmentation and channel assumptions require dated sources and explicit confidence | `docs/market/MARKET_INTELLIGENCE_REGISTER.md` |

## Strategy record minimum fields

For any new material strategy, capture:

1. strategic objective;
2. current status;
3. decision date;
4. rationale;
5. supporting evidence and source dates;
6. assumptions that are not proven;
7. dependencies;
8. risks;
9. alternatives considered or rejected when material;
10. trigger for re-evaluation;
11. owner / next action when applicable;
12. links to related evidence, market, scientific, legal or product records.

## Decision-history rule

Do not silently rewrite a strategy when it changes. Preserve the prior state and mark it `SUPERSEDED`, then state why the new direction replaced it.

This is especially important for:

- product positioning;
- launch sequencing;
- regional rollout;
- pricing/subscription;
- distribution channels;
- veterinary strategy;
- scientific integration;
- supplier/industrial strategy;
- funding strategy;
- data/AI strategy;
- regulatory positioning;
- partnership strategy.

## 2027 planning authority

The current planning correction is controlled in `docs/strategy/PROJECT_TIMELINE_2026_2027.md`:

> EMOPET does not treat 2026 as its commercial launch year. The launch phase and the beginning of operational integration into the Brittany ecosystem are planned for 2027.

Any future document implying a conflicting launch calendar must either be corrected or explicitly marked historical/superseded.
