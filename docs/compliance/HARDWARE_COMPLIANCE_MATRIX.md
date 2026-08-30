# EMOPET MAT/TAG — Hardware Compliance Matrix

Status: `P0 CONTROLLED READINESS / NOT CE DECLARATION / NOT LEGAL OR LAB SIGN-OFF`

This matrix is a design-control aid for MAT and TAG. It does not determine final legal classification, conformity-assessment route or applicable harmonised-standard edition. Those must be confirmed against the final hardware/firmware configuration and, where appropriate, by an accredited/compliance laboratory and regulatory counsel.

## Product boundary

| Product | Current working description | Radio assumption | Battery assumption | Status |
|---|---|---|---|---|
| MAT | Connected home reference station / sensing mat | Connectivity architecture `TO_CONFIRM_FINAL` | Mains/battery architecture `TO_CONFIRM_FINAL` | P0 / NOT PRODUCT V1 |
| TAG | Connected wearable/collar sensing device | BLE/positioning architecture expected but final radio implementation `TO_CONFIRM` | Portable rechargeable battery expected; exact cell/pack `OPEN` | P0 / NOT PRODUCT V1 |

## Regulatory / conformity matrix

| ID | Framework | MAT | TAG | P0 design obligation / evidence | Status |
|---|---|---:|---:|---|---|
| HW-COMP-001 | Radio Equipment Directive 2014/53/EU (RED) | IF radio | EXPECTED | Confirm radio modules/bands/power/antennas. Build essential-requirements map for health/safety, EMC and efficient spectrum use. Maintain technical file, test evidence and Declaration of Conformity route. | `OPEN_FINAL_RADIO_ARCHITECTURE` |
| HW-COMP-002 | RED cybersecurity Art. 3(3)(d)-(f) / Delegated Reg. 2022/30 transition | IF covered radio | EXPECTED if internet/network-connected radio | Threat model network/privacy/fraud protections; verify applicability for equipment placed on market in relevant transition window. Do not assume CRA replaces pre-11-Dec-2027 RED obligations retroactively. | `OPEN_APPLICABILITY` |
| HW-COMP-003 | EN 18031-1/-2/-3:2024 references under RED | IF covered | EXPECTED | Gap-assess the applicable part(s). Account for the limitations/notices attached to harmonised-standard references; using the standard does not automatically give unrestricted presumption of conformity for every clause/scenario. | `OPEN_LAB_GAP_ASSESSMENT` |
| HW-COMP-004 | Cyber Resilience Act, Regulation (EU) 2024/2847 | EXPECTED if connected digital product | EXPECTED | Cybersecurity risk assessment, secure-by-default design, vulnerability handling, support-period/update design, SBOM/component control, incident reporting readiness and conformity documentation. Article 14 reporting applies from 11 Sep 2026; general application from 11 Dec 2027. | `P0_READINESS / FULL_CONFORMITY_FUTURE` |
| HW-COMP-005 | General Product Safety Regulation, Regulation (EU) 2023/988 (GPSR) | REVIEW interaction with harmonisation law | REVIEW interaction with harmonisation law | Maintain product-safety hazard analysis, traceability, consumer safety information and incident/corrective-action process where GPSR provisions apply. Avoid double-counting requirements already specifically harmonised; final legal interaction requires review. | `OPEN_SCOPE_INTERACTION` |
| HW-COMP-006 | Batteries Regulation, Regulation (EU) 2023/1542 | IF incorporated portable battery | EXPECTED | Identify battery category, chemistry/cell/pack, safety and labelling duties; design replacement/service strategy. Do **not** assume TAG qualifies for any exemption from end-user removability/replaceability. Record the justification for any derogation relied upon. | `BLOCKED_EXACT_BATTERY + REPAIRABILITY_DECISION` |
| HW-COMP-007 | RoHS Directive 2011/65/EU | EXPECTED for EEE | EXPECTED for EEE | Supplier declarations/material evidence for restricted substances; BOM-level compliance records; track exemptions by exact scope and expiry. | `OPEN_SUPPLIER_EVIDENCE` |
| HW-COMP-008 | WEEE Directive 2012/19/EU / national EPR implementation | EXPECTED if EEE placed on market | EXPECTED | Producer-registration/EPR route, marking, information and end-of-life/take-back responsibilities must be established for each market. | `OPEN_MARKET_LAUNCH_PLAN` |
| HW-COMP-009 | EMC Directive 2014/30/EU | REVIEW | REVIEW | For radio equipment, RED Article 3(1)(b) incorporates an adequate EMC level; determine whether separate EMC Directive route applies to any non-radio equipment/configuration. Plan emissions/immunity tests for final assembly. | `OPEN_PRODUCT_CLASSIFICATION` |
| HW-COMP-010 | Electrical/product safety under RED Art. 3(1)(a) and applicable standards | REVIEW | REVIEW | Hazards: electrical, thermal, charging, battery, mechanical, ingress, misuse, dog contact/chewing, strangulation/snags, small parts, materials/skin contact and foreseeable household use. Select final standards after architecture freeze. | `OPEN_SAFETY_STANDARD_SELECTION` |
| HW-COMP-011 | CE marking / EU Declaration of Conformity | IF applicable | EXPECTED | No CE mark/DoC until applicable legislation, conformity-assessment modules, standards, tests, technical documentation, labelling and economic-operator data are complete. | `BLOCKED_PRODUCT_RELEASE` |

## RED / radio evidence register

Before radio conformity work can close, record at minimum:

- exact radio chipset/module MPN and module certification evidence;
- frequency bands, channel plan and maximum conducted/EIRP power;
- antenna type/gain/location and final enclosure/body detuning evidence;
- BLE/positioning coexistence test plan;
- RF exposure / health-and-safety assessment as applicable;
- EMC emissions/immunity and radio-performance test reports;
- firmware/radio stack versions tied to test samples;
- network/cybersecurity features and update mechanism;
- final user instructions and restrictions.

A pre-certified radio module may reduce some engineering effort but does not, by itself, certify the final MAT/TAG product.

## Battery / repairability gate

The TAG battery gate cannot be closed from enclosure preference alone. Record:

1. exact cell/pack MPN and chemistry;
2. protection circuit and charging architecture;
3. capacity and operating envelope;
4. replacement method and tools;
5. waterproofing/ingress impact;
6. independent-professional serviceability if end-user replacement is not selected;
7. spare-part availability strategy;
8. safety instructions;
9. final legal basis for any Article 11 derogation/exemption relied upon.

`BATTERY_REPAIRABILITY_GATE = OPEN`

## Cybersecurity-to-hardware traceability

Final MAT/TAG architecture should be able to evidence:

- unique device identity without universal/default shared credentials;
- authenticated pairing/provisioning;
- least-privilege interfaces/services;
- secure key storage appropriate to the MCU/security architecture;
- signed update verification;
- secure boot / chain of trust if technically selected;
- anti-rollback or justified equivalent policy;
- recovery from interrupted/failed update;
- vulnerability fix delivery during the declared support period;
- logging/telemetry minimisation and secret redaction;
- factory provisioning and key-injection controls;
- component/SBOM traceability.

Implementation remains gated until the MCU, bootloader, firmware and key-management architecture are controlled.

## Product-safety hazard families to carry into design reviews

- thermal runaway / charging fault;
- ingestion/chewing and enclosure fracture;
- collar snag/entanglement/strangulation risk;
- skin/contact material irritation;
- water/saliva/rain ingress;
- sharp edges after damage;
- battery swelling/end-of-life;
- RF/EMC malfunction affecting intended function;
- false confidence caused by missing/poor-quality measurements;
- foreseeable misuse, cleaning and charging behavior;
- pet weight/load and MAT mechanical failure modes.

This list is a starting hazard inventory, not a completed risk assessment.

## Release rule

No artifact from this P0 matrix authorises:

- CE marking;
- EU Declaration of Conformity;
- tooling;
- mass production;
- supplier manufacturing release;
- a clinical/medical claim;
- a claim that EN 18031, RED, CRA, GPSR, Batteries, RoHS, WEEE or EMC conformity has been demonstrated.
