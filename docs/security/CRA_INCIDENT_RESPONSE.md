# CRA Incident Response — EMOPET

Status: `P0 READINESS / NOT LEGAL SIGN-OFF`

## Trigger

Use this runbook when EMOPET becomes aware of either:

1. an actively exploited vulnerability affecting an EMOPET product with digital elements; or
2. a severe incident affecting the security of such a product.

The legal applicability and reporting channel must be confirmed against the Cyber Resilience Act and current ENISA/CSIRT procedures at incident time.

## Clock

- **T+0**: awareness recorded, incident commander assigned, evidence preservation begins.
- **Within 24 hours**: prepare/submit the CRA early warning when legally required.
- **Within 72 hours**: prepare/submit the CRA vulnerability/incident notification when legally required.
- **Final report**: complete after root cause/remediation according to the applicable CRA process.

Do not delay containment merely to perfect a report.

## Severity matrix

| Severity | Example | Response |
|---|---|---|
| SEV-1 Critical | active compromise, signing-key theft, auth bypass exposing private user/dog/location data, malicious firmware path | incident commander immediately; isolate; preserve evidence; legal/CRA assessment now |
| SEV-2 High | remotely exploitable vulnerability with material confidentiality/integrity/availability impact | same-day triage; patch/mitigation plan; CRA applicability assessment |
| SEV-3 Medium | exploitable weakness with meaningful constraints or limited blast radius | normal security response; monitor for exploitation |
| SEV-4 Low | hardening issue, no demonstrated security impact | backlog and scheduled remediation |

## Required incident record

- incident id;
- UTC awareness timestamp;
- reporter/source;
- affected product/component/version;
- vulnerability identifier/CVE if assigned;
- exploitation status and evidence;
- affected users/regions where known;
- personal-data impact and GDPR breach assessment;
- mitigations taken;
- firmware/software release hashes;
- SBOM/component references;
- responsible incident commander;
- ENISA/CSIRT/authority reporting status;
- user/customer communication status;
- root cause;
- corrective/preventive actions;
- closure date.

## Parallel legal/compliance checks

An incident may trigger multiple regimes. Assess independently:

- CRA reporting;
- GDPR personal-data breach notification;
- product-safety/GPSR corrective action or recall;
- RED/CE conformity impact;
- contractual/supplier notification duties.

Do not assume one notification satisfies another.

## Contacts registry

Maintain current operational contacts before launch:

- EMOPET security mailbox: `TO_CONFIGURE`;
- founder/product authority: `TO_CONFIGURE`;
- DPO/privacy contact: `TO_CONFIRM`;
- legal/regulatory counsel: `TO_CONFIRM`;
- relevant national CSIRT/contact point: verify at incident time;
- ENISA CRA Single Reporting Platform: verify operational URL/process at incident time.

## Evidence integrity

Preserve timestamps, logs, hashes, release artifacts and relevant configuration. Do not place secrets or unnecessary personal data in GitHub issues or public channels.
