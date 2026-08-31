# CRA Incident & Vulnerability Reporting Procedure — EMOPET

Status: `P0 OPERATIONAL READINESS / NOT LEGAL SIGN-OFF`

Authority date: `2026-08-31`

## Regulatory checkpoint

The Cyber Resilience Act (Regulation (EU) 2024/2847) reporting obligations in Article 14 begin applying on **11 September 2026**. The European Commission confirms the following reporting clock for manufacturers of products with digital elements that are within scope and have been made available on the Union market:

- early warning within **24 hours** of awareness;
- main notification within **72 hours** of awareness;
- final report for an actively exploited vulnerability no later than **14 days after a corrective or mitigating measure becomes available**;
- final report for a severe security incident within **one month from the 72-hour notification**.

Notifications are submitted through the CRA **Single Reporting Platform (SRP)**. The Commission states that the SRP is to be operational by 11 September 2026.

Official references checked 2026-08-31:

- https://digital-strategy.ec.europa.eu/en/policies/cra-reporting
- https://digital-strategy.ec.europa.eu/en/policies/cra-summary

EMOPET is not currently treated by this repository as a commercially released product. This procedure is therefore a readiness control, not a statement that a report is presently due. Legal applicability must still be assessed against the product's actual market status and the facts of the event.

## Accountable roles

Until a dedicated security organisation is appointed, the following role ownership applies:

| Function | Accountable role | Responsibility |
|---|---|---|
| Security intake / detection | Founder / Product Authority | ensure reports, monitoring findings and supplier notices are captured and timestamped |
| Incident Commander (IC) | Founder / Product Authority, unless explicitly delegated | owns the clock, severity, containment coordination and reporting decision trail |
| Technical Lead | affected component owner | reproduces, scopes, contains and identifies affected builds/components |
| Evidence Custodian | Incident Commander or named delegate | preserves logs, hashes, SBOMs, release artifacts and chronology |
| Privacy assessment | Privacy/DPO role when appointed | independently assesses GDPR breach obligations |
| Regulatory/legal review | Legal/regulatory counsel when appointed | reviews CRA applicability and notification content; absence of counsel must not stop the clock |

A named human delegate may replace a role during an incident, but the delegation and UTC timestamp must be written into the incident log.

## Trigger

Open this procedure immediately when EMOPET becomes aware of either:

1. a vulnerability that may be **actively exploited** and affects an EMOPET product with digital elements; or
2. an incident that may qualify as a **severe security incident** affecting such a product.

Do not wait for a CVE, perfect reproduction, root cause, or legal certainty before starting the internal clock. Starting the internal clock does **not** mean that CRA notification is automatically required; it preserves the evidence needed to make that decision in time.

## Operational clock

### T+0 — awareness

The person or system that first receives credible information must:

- record the **UTC awareness timestamp**;
- create an incident record using `INCIDENT_LOG_TEMPLATE.md`;
- record the reporter/source and initial evidence;
- notify the Incident Commander;
- preserve relevant logs/artifacts before rotation or cleanup;
- identify whether any product/build has been made available on the EU market.

### T+0 to T+4h — qualification

The Incident Commander and Technical Lead must establish, with explicit `KNOWN / UNKNOWN / NOT_APPLICABLE` values:

- affected product/component;
- first/last known affected versions;
- firmware, software and app versions;
- release commit and artifact hashes;
- SBOM version/hash and implicated package/component where known;
- exploitation status and supporting evidence;
- security impact: confidentiality, integrity, availability and safety;
- known affected users/devices/territories;
- whether the product was made available on the Union market;
- whether the event is a CRA candidate;
- whether GDPR, GPSR, RED/CE, supplier or contractual duties may also apply.

If evidence is incomplete, keep the item open and continue; do not silently downgrade the incident.

### T+4h to T+12h — containment + early-warning draft

For a CRA candidate:

- contain without destroying evidence;
- identify the affected release/SBOM population;
- draft the 24-hour early warning using verified facts only;
- record what remains unknown;
- record whether information disclosure itself could create a cybersecurity risk and requires specialist review under the CRA process.

### T+12h to T+20h — reporting decision checkpoint

The Incident Commander records one decision:

- `CRA_REPORT_REQUIRED`;
- `CRA_REPORT_NOT_REQUIRED` with rationale and evidence;
- `CRA_APPLICABILITY_UNRESOLVED` — escalate immediately and continue preparing the report.

A missing external legal reviewer is not a valid reason to stop preparation.

### By T+24h — early warning

If legally required, submit the CRA early warning through the current Single Reporting Platform process and record:

- submission UTC timestamp;
- submission/reference identifier;
- receiving CSIRT / platform destination shown by the SRP;
- exact version of the information submitted;
- submitter and approver roles.

### T+24h to T+60h — main notification build

Continue investigation and add:

- vulnerability/CVE identifier if available;
- technical description and attack prerequisites;
- exploitation evidence;
- affected versions/components/SBOM entries;
- geographic/product-distribution scope;
- containment and mitigation status;
- available indicators of compromise;
- user/customer impact;
- corrective action plan;
- uncertainty and facts still under investigation.

### T+60h to T+68h — 72-hour review checkpoint

Perform a factual review against preserved evidence. Do not rewrite uncertainty as certainty.

### By T+72h — main notification

If legally required, submit the main CRA notification and preserve the same submission evidence fields as the 24-hour report.

### Final report

- **Actively exploited vulnerability:** final report no later than 14 days after a corrective or mitigating measure is available.
- **Severe security incident:** final report within one month from the 72-hour notification.

The final report must include root cause where established, remediation, affected versions, corrective/preventive actions (CAPA), regression tests and residual risk.

## Severity matrix

| Severity | Example | Response |
|---|---|---|
| SEV-1 Critical | active compromise, signing-key theft, auth bypass exposing private user/dog/location data, malicious firmware/update path | IC immediately; isolate; preserve evidence; CRA/GDPR assessment now |
| SEV-2 High | remotely exploitable vulnerability with material confidentiality/integrity/availability impact | same-day triage; patch/mitigation plan; CRA applicability assessment |
| SEV-3 Medium | exploitable weakness with meaningful constraints or limited blast radius | normal security response; monitor for exploitation; escalate if exploitation evidence appears |
| SEV-4 Low | hardening issue with no demonstrated security impact | backlog and scheduled remediation |

Severity is an internal response aid. CRA reportability is a separate legal classification and must not be inferred solely from SEV level.

## Required incident evidence

Preserve at minimum:

- incident id;
- UTC awareness timestamp and how awareness was established;
- reporter/source;
- product market-availability status;
- affected product/component/version;
- first and last known affected version;
- firmware/software/app version;
- release commit/tag;
- release artifact hash/signature;
- SBOM identifier/hash and relevant component coordinates;
- vulnerability identifier/CVE if assigned;
- exploitation status and evidence;
- affected users/devices/regions where known;
- personal-data impact and GDPR assessment;
- containment/mitigation actions and timestamps;
- patch/firmware release and hashes;
- Incident Commander and delegates;
- CRA SRP / CSIRT reporting status and submission references;
- user/customer communication status;
- supplier communication status;
- root cause;
- corrective/preventive actions;
- regression-test evidence;
- closure date and residual-risk authority.

Never alter or delete historical SBOMs, signed release artifacts or incident evidence in order to make the current state look clean.

## Parallel legal/compliance checks

Assess independently:

- CRA reporting;
- GDPR personal-data breach notification;
- product-safety/GPSR corrective action or recall;
- RED/CE conformity impact;
- contractual/supplier notification duties.

Do not assume one notification satisfies another.

## Readiness actions due before 11 September 2026

These controls are documentary/operational and do not require a Phase 0 architecture redesign:

- [ ] configure and test a monitored EMOPET security mailbox;
- [x] designate the Founder / Product Authority as interim accountable Incident Commander role;
- [ ] nominate a backup Incident Commander / evidence custodian;
- [ ] record privacy/DPO and legal/regulatory escalation contacts when appointed;
- [ ] verify the live ENISA CRA Single Reporting Platform URL/process when published/operational;
- [ ] perform one tabletop exercise from T+0 through mock T+72h;
- [ ] prove that a release can be mapped to firmware/software versions, commit, artifact hashes and SBOM;
- [ ] verify evidence-retention location and access controls;
- [ ] confirm supplier escalation contacts for MAT/TAG manufacturing and critical software/cloud dependencies.

## Contacts registry

- EMOPET security mailbox: `TO_CONFIGURE_AND_TEST`;
- accountable Founder / Product Authority: `ROLE_DESIGNATED — CONTACT_RECORD_TO_CONFIGURE`;
- backup Incident Commander: `TO_NOMINATE`;
- DPO/privacy contact: `TO_CONFIRM`;
- legal/regulatory counsel: `TO_CONFIRM`;
- relevant national CSIRT/contact point: verify current process at incident time;
- ENISA CRA Single Reporting Platform: verify current operational URL/process at incident time.

## Evidence integrity

Preserve timestamps, logs, hashes, release artifacts, SBOMs and relevant configuration. Restrict access on a need-to-know basis. Do not place secrets, exploit material that creates unnecessary risk, or unnecessary personal data in public GitHub issues or public channels.
