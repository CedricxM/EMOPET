# EMOPET — Market Intelligence Register

**Control date:** 2026-09-07  
**Status:** CONTROLLED MARKET-MEMORY INDEX

## Purpose

This register is the canonical memory layer for EMOPET market intelligence. It is intended to prevent market claims, competitor assumptions, remembered figures or slide-deck estimates from becoming project facts without a traceable source.

## Evidence rule

Every material market statement should record, where applicable:

- source;
- publication/access date;
- geography;
- market/category definition;
- period covered;
- currency and tax basis where relevant;
- methodology/sample if disclosed;
- whether the figure is primary data, secondary research, competitor claim or EMOPET estimate;
- confidence / limitations;
- strategic consequence.

Do not treat unsourced TAM/SAM/SOM figures as established facts.

## Market-memory categories

| Category | Current status | What must be maintained |
|---|---|---|
| France companion-animal / dog-owner opportunity | `PENDING_CONTROLLED_RESEARCH` | population/base data, owner behaviour, spend and addressable-user assumptions with dated sources |
| Connected pet / pet-tech category | `PENDING_CONTROLLED_RESEARCH` | category definitions, market-size evidence, growth assumptions, hardware/software split where supportable |
| Wearable / behavioural-monitoring competitors | `ACTIVE_CONTROLLED_WATCH` | dated public facts and EMOPET interpretation; see competitive landscape |
| Veterinary channel | `WORKING_STRATEGY + EVIDENCE INPUTS` | clinic/network structure, prescriber behaviour, channel economics, legal/deontological constraints |
| D2C channel | `WORKING_STRATEGY` | acquisition economics, pricing sensitivity, conversion assumptions and recurring-revenue hypotheses once measured |
| Brittany regional entry | `PROJECT_DECISION / 2027 START` | ecosystem mapping, early-user/pilot opportunities, local veterinary and support-network integration, regional learning objectives |
| Pricing / subscription | `TO_CONTROL` | every price hypothesis, willingness-to-pay source, hardware margin assumption and subscription-retention assumption |
| Funding / support ecosystem | `ACTIVE_WORKSTREAM` | AudéLor/Emergys and other support routes with exact eligibility/status evidence |

## Competitor link

Competitive intelligence is maintained separately in:

`docs/strategy/COMPETITIVE_LANDSCAPE.md`

That document must preserve the distinction between:

1. verified public facts;
2. competitor marketing claims;
3. EMOPET interpretation;
4. EMOPET strategic response.

## Brittany 2027 market-entry rule

The current project planning decision is that **2027 is the beginning of EMOPET's launch phase and operational integration into the Brittany ecosystem**.

This does not by itself establish:

- a fixed launch month;
- a fixed unit-sales target;
- a confirmed regional partnership;
- a confirmed pilot volume;
- a national rollout date.

Those require their own controlled decisions/evidence.

## Market hypothesis template

Use this structure for important market assumptions:

```text
Hypothesis ID:
Date:
Status: HYPOTHESIS / WORKING_ASSUMPTION / SOURCE_VERIFIED / REJECTED / SUPERSEDED
Statement:
Segment/geography:
Evidence:
Confidence:
What would falsify it:
Strategic consequence:
Next validation action:
```

## Update triggers

Update this register when:

- a new market study materially changes category sizing or segmentation;
- a competitor launches, reprices or changes its model;
- EMOPET obtains primary user/practitioner research;
- pilot data replaces an assumption;
- pricing or subscription economics are tested;
- Brittany integration produces concrete adoption/channel evidence;
- a deck uses a new material market number.
