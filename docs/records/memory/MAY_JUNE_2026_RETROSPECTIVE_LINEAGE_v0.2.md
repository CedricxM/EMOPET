# EMOPET — May–June 2026 Retrospective Lineage v0.2

**Audit date:** 2026-09-07  
**Status:** `CONTROLLED MEMORY / PROVENANCE GATES SUBSTANTIALLY CLOSED`  
**Supersedes for audit status only:** `MAY_JUNE_2026_RETROSPECTIVE_LINEAGE_v0.1.md`  
**Important:** v0.1 remains preserved as the original partial snapshot. Historical records never override current controlled product/engineering authority.

## 1. Why v0.2 exists

The v0.1 retrospective deliberately left several May–June lineage gaps open. Subsequent targeted archaeology across Gmail, ClickUp and the current repository has now recovered enough evidence to close most provenance questions without inventing missing rationale.

This v0.2 does not rewrite history into a neat story. It records which questions are now evidenced, which are only historically documented, and which remaining gates are current implementation/product decisions rather than missing archaeology.

## 2. MAT sensing lineage — provenance gate closed

The recovered sequence is now supported as:

`raw-film / Alqio exploration → discrete LDT0-028K architecture → four shielded coaxial piezoelectric cables`

Key recovered evidence:

- April/early-May scientific outreach already described a stationary MAT with PVDF sensing;
- 13 May supplier mapping captured an exploratory discrete-sensor path;
- 25 May `EMOPET_Couts.xlsx` explicitly recorded the six-sensor LDT0-028K architecture and the rejection of the raw Alqio-film path for manufacturability/integration reasons at that checkpoint;
- 11 June `EMOPET_Architecture_Hybride.pdf` formalised the two-layer washable/passive + protected/instrumented MAT around six LDT0-028K sensors and explicitly stated that no physical prototype or experimental validation had yet occurred;
- 24–26 June ClickUp decision records document the later pivot to four shielded coaxial piezo cables, including the recorded reasons: shielding/50 Hz rejection, mechanical robustness and longitudinal coverage across resting orientation.

Detailed record:

`PVDF_TO_COAXIAL_PIVOT_LINEAGE_2026-09-07.md`

### Closure

`OPEN-MEM-LINEAGE-PVDF-001` — **CLOSED at historical decision/provenance level**.

The architecture choice still does not equal bench or animal validation.

## 3. Subscription/pricing lineage — provenance gate closed

The early commercial model is now traceable.

Recovered evidence establishes that by 13 May 2026 the BMC already described:

- Breiz Free without hardware;
- kit + subscription;
- hardware target below €150;
- Premium target below €6;
- explicit `Breiz Premium — 5,99 €/mois`;
- local community as a core acquisition/retention mechanism.

Late-May/early-June AudéLor discussion preserved the intention to keep €5.99/month if possible, while the May financial workbook also modelled a historical Essential €5.99 / Premium €8.99 structure tied to then-current voice/GPS assumptions.

Detailed record:

`EARLY_COMMERCIAL_MODEL_LINEAGE_MAY_JUNE_2026.md`

### Closure

`OPEN-MEM-LINEAGE-SUBSCRIPTION-001` — **CLOSED for origin/provenance**.

Current willingness-to-pay, pricing and offer structure remain unvalidated current commercial gates.

## 4. Early commercial doctrine — historically established

The following ideas are not later inventions; they already existed in May/June form:

- Brittany/Lorient-first territorial deployment;
- Breiz as a local/contextual companion and community layer;
- a free/local experience as an acquisition surface before hardware conversion;
- Guardian/consumer as final customer;
- veterinarians and animal professionals as prescribers/trust partners rather than primary customers;
- non-medical positioning;
- confidence-gating / silence when evidence is insufficient;
- MAT + TAG as complementary observation surfaces.

Some old implementations of these ideas were later narrowed or superseded. Historical origin does not freeze current execution.

## 5. Data-commercialisation lineage — historical framing identified and superseded

A June AudéLor exchange explicitly contemplated owner-consented data use/sales.

That historical framing is now retained as lineage only. Current authority separates research contribution, partner studies, commercial R&D and AI/model contribution into distinct permission/governance classes, with privacy/trust rights not paywalled and base-case data revenue at €0 until evidence and governance exist.

Detailed treatment:

`EARLY_COMMERCIAL_MODEL_LINEAGE_MAY_JUNE_2026.md`

### Status

Historical provenance **closed**; current data-governance implementation remains a live controlled workstream.

## 6. Brand lineage — substantially closed

The best-supported sequence is now:

`28 May Playfair/Montserrat + navy/orange/teal/cream + SMART CARE. STRONG BOND.`

→

`30 May Sora + paw/spiral + inherited colour family + bilingual tagline variants`

→

`25 August controlled v2 authority: Fraunces + Instrument Sans + JetBrains Mono + aperture + sable/granit/terre-cuite/lichen`

Detailed record:

`BRAND_AND_PUBLIC_COPY_LINEAGE_MAY_AUG_2026.md`

### Closure

Historical brand provenance is **substantially closed**.

Remaining open gates are current decisions/implementation issues:

- explicit tagline retain/replace/retire decision;
- web-token/logo implementation reconciliation;
- bounded pilot + visual/accessibility/regression QA.

## 7. Supplier-chain lineage — provenance and quote applicability separated

The pre-MOKO working chain is now documented as historical:

`component suppliers → Yz-Link if qualified → Landztop if qualified → tested subassemblies → ESAT France final assembly/control/packaging`

It was never a fully selected/contracted production chain.

Detailed records:

- `SUPPLIER_CHAIN_LINEAGE_JUNE_JULY_2026.md`
- `SUPPLIER_SOURCING_LINEAGE_JUNE_SEPT_2026.md`

The second record also reconciles historical sample/listing/quote figures with the current rule that old prices cannot be silently mixed into current COGS when configuration or scope changed.

### Closure

Historical supplier provenance / supersession is **closed at audit level**.

Current sourcing remains operationally open: MOKO RFQ acknowledgement, engineering/NRE quote, prototype quote, CAD/R3 release and final supplier decisions remain evidence-gated.

## 8. Current repository assumptions inherited from older product thinking — identified

The retrospective question “which May/June assumptions still leak into current implementation?” is no longer unanswered.

Controlled repository audits now record, among other drift:

- generic/global ELI wellbeing/balance scores still rendered in the web prototype;
- WQI/RSI numeric surfaces with current authorisation not established;
- internal affect/model terminology bleeding toward user-facing semantics;
- legacy brand palette/type/slogan residues in current web implementation;
- hardware/topology terminology that can be confused with superseded PVDF/discrete-sensor generations.

Detailed audits:

- `CURRENT_UI_ELI_PRODUCT_DRIFT_AUDIT_2026-09-07.md`
- `CURRENT_REPO_HARDWARE_TERMINOLOGY_DRIFT_AUDIT_2026-09-07.md`
- `BRAND_AND_PUBLIC_COPY_LINEAGE_MAY_AUG_2026.md`

### Status

The archaeology/provenance question is **closed enough to act**. What remains is implementation reconciliation under current authority.

## 9. Remaining open work is no longer “find the past”

The main unresolved workstreams are now forward-facing:

### Product/UI

- reconcile the dashboard global ELI score with relationship-first / no-naked-number doctrine;
- decide current WQI/RSI status;
- map existing components to the Care observation contract;
- keep internal model state separate from user publication semantics;
- make abstention/no-result a first-class state.

### Brand

- decide tagline status;
- migrate design tokens/assets through a bounded pilot and QA, not a blind global replacement.

### Industrial

- receive/evaluate MOKO response and quotations;
- complete controlled CAD/R3 release;
- refresh current BOM/COGS only against current configuration;
- preserve alternates and IP/source-return gates.

### Science/validation

- bench feasibility remains distinct from architecture selection;
- animal validation remains distinct from bench success;
- external expert interest/feedback remains distinct from scientific validation or institutional partnership.

## 10. Retrospective closure rule

The May–June history is now sufficiently reconstructed for normal project governance.

Reopen archaeology only when a concrete contradiction, missing source or high-impact provenance question appears. Do not keep mining the past merely because more old material exists.

The project should now spend more energy converting controlled decisions into evidence and implementation than polishing historical memory.

**v0.1 asked “what happened?”  
v0.2 can now answer most of that. The next question is “what do we prove and implement next?”**