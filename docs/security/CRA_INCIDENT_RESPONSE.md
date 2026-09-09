# CRA Incident & Vulnerability Reporting Procedure — EMOPET

Status: `LAUNCH-CRITICAL OPERATIONAL READINESS / OPEN EVIDENCE / NOT LEGAL SIGN-OFF`

Authority date: `2026-09-09`

## Regulatory checkpoint

The Cyber Resilience Act (Regulation (EU) 2024/2847) reporting obligations in Article 14 begin applying to manufacturers on **11 September 2026**. For an in-scope product with digital elements, the reporting clock is anchored to the moment the manufacturer becomes aware of an actively exploited vulnerability or a severe incident:

- early warning without undue delay and in any case within **24 hours of awareness**;
- main notification without undue delay and in any case within **72 hours of awareness**;
- final report for an actively exploited vulnerability no later than **14 days after a corrective or mitigating measure becomes available**;
- final report for a severe security incident within **one month after the 72-hour notification**.

Mandatory Article 14 notifications are submitted through ENISA's CRA **Single Reporting Platform (SRP)**, scheduled to be available from 11 September 2026:

- SRP portal: https://portal.cra-srp.enisa.europa.eu
- ENISA SRP FAQ, updated 8 September 2026: https://www.enisa.europa.eu/topics/product-security/single-reporting-platform-srp/frequently-asked-questions
- ENISA AR registration guidance, updated 8 September 2026: https://www.enisa.europa.eu/topics/product-security/single-reporting-platform-srp/cra-srp-guidance-ar-user-registration
- ENISA list of CSIRTs designated as coordinators: https://www.enisa.europa.eu/topics/product-security/single-reporting-platform-srp/list-of-csirts-designated-as-coordinators
- European Commission CRA reporting guidance: https://digital-strategy.ec.europa.eu/en/policies/cra-reporting

EMOPET is not currently treated by this repository as a commercially released product. This procedure is therefore a readiness control, not a statement that a report is presently due. Legal applicability must still be assessed against the product's actual market status and the facts of the event.

## Launch-critical ENISA operational rules — 8 September 2026

### 1. Prepare EU Login + MFA, but do not pre-register merely to anticipate

ENISA currently advises manufacturers to register on the SRP and initiate CSIRT validation **only when they need to submit a notification**, rather than registering pre-emptively. The readiness requirement before 11 September is therefore:

- identify the intended **Primary Assigned Representative (Primary AR)** internally;
- identify at least one backup / intended **Secondary AR** internally;
- ensure each intended AR has a personal **EU Login account with MFA enabled**;
- identify the correct CSIRT designated as coordinator under CRA Article 14(7);
- keep the manufacturer information needed for the registration flow ready;
- **do not create an SRP manufacturer registration solely for rehearsal or pre-validation**.

The AR–manufacturer association is validated by the designated CSIRT after registration. ENISA states that this validation takes place in parallel with reporting and does not prevent notification submission while validation is pending.

`CRA-SRP-REGISTRATION-POLICY = READY_ACCOUNT_FIRST / REGISTER_ON_NOTIFICATION_NEED`

### 2. Internal T0 is the deadline authority, not the portal counter

The legal clock starts at the actual **awareness timestamp (T0)**. EMOPET must preserve that timestamp independently of the SRP.

For every CRA candidate event, calculate and preserve internally:

```text
T0 = actual UTC awareness timestamp
Early warning deadline = T0 + 24h
72-hour notification deadline = T0 + 72h
```

Do not derive either deadline from the time a previous SRP form was submitted.

ENISA documents a known launch behavior in the current SRP release: the displayed 72-hour counter calculates its due date as **48 hours after submission of the 24-hour Early Warning**. That can cause the portal to display an item as overdue before 72 hours have elapsed from the true awareness time. ENISA states that this counter logic will be corrected in a future release to use the awareness field.

Therefore:

- the SRP counter is **operational assistance only**;
- the incident log's preserved T0 is EMOPET's source of truth for the legal timing calculation;
- any discrepancy between internal T0 deadlines and the SRP display must be captured in the incident evidence;
- do not delay a legally due report because the SRP counter appears to show more time.

`CRA-SRP-DEADLINE-AUTHORITY = INTERNAL_T0_NOT_PORTAL_COUNTER`

### 3. SRP outage procedure

If the SRP is temporarily unavailable:

1. preserve T0 and the internal T0+24h / T0+72h deadlines;
2. preserve evidence of the outage where practical, including UTC timestamp and screenshots/status evidence;
3. continue preparing the notification package;
4. if immediate communication is considered necessary before restoration, contact the designated coordinating CSIRT directly;
5. when the SRP becomes available again, **submit the required notification through the SRP even if the CSIRT was contacted directly**;
6. record both the direct-CSIRT communication and later SRP submission in the incident log.

A direct CSIRT contact does not replace the mandatory SRP submission once the platform is restored.

`CRA-SRP-OUTAGE-FALLBACK = CSIRT_IF_URGENT + SRP_RESUBMISSION_REQUIRED`

### 4. Launch language

ENISA states that the SRP will be available **in English only at launch**. The incident response team must therefore maintain an English-ready factual reporting capability and must not discover this constraint during an active T+20h escalation.

## Accountable roles

Until a dedicated security organisation is appointed, the following role ownership applies:

| Function | Accountable role | Responsibility |
|---|---|---|
| Security intake / detection | Founder / Product Authority | ensure reports, monitoring findings and supplier notices are captured and timestamped |
| Incident Commander (IC) | Founder / Product Authority, unless explicitly delegated | owns the clock, severity, containment coordination and reporting decision trail |
| Technical Lead | affected component owner | reproduces, scopes, contains and identifies affected builds/components |
| Evidence Custodian | Incident Commander or named delegate | preserves logs, hashes, SBOMs, release artifacts and chronology |
| CRA Assigned Representative | Primary AR or available authorised backup designated internally | performs SRP registration/submission when notification is required and preserves submission evidence |
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

- record the **UTC awareness timestamp T0** and how awareness was established;
- calculate and record **T0 + 24h** and **T0 + 72h** immediately;
- create an incident record using `INCIDENT_LOG_TEMPLATE.md`;
- record the reporter/source and initial evidence;
- notify the Incident Commander;
- preserve relevant logs/artifacts before rotation or cleanup;
- identify whether any product/build has been made available on the EU market.

The incident record, not the SRP countdown display, is the deadline source of truth.

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
- draft the 24-hour early warning in **English-ready factual form** using verified facts only;
- record what remains unknown;
- record whether information disclosure itself could create a cybersecurity risk and requires specialist review under the CRA process;
- confirm that the intended AR's EU Login + MFA is operational;
- confirm the correct CSIRT designated as coordinator using the current ENISA list and Article 14(7) decision logic.

### T+12h to T+20h — reporting decision checkpoint

The Incident Commander records one decision:

- `CRA_REPORT_REQUIRED`;
- `CRA_REPORT_NOT_REQUIRED` with rationale and evidence;
- `CRA_APPLICABILITY_UNRESOLVED` — escalate immediately and continue preparing the report.

A missing external legal reviewer is not a valid reason to stop preparation.

### By T+24h — early warning

If legally required:

1. if the manufacturer/AR is not yet registered, complete the SRP registration flow at that time;
2. submit the CRA early warning through the live SRP;
3. record:
   - internal T0;
   - internal T0+24h and T0+72h deadlines;
   - submission UTC timestamp;
   - submission/reference identifier;
   - receiving CSIRT / platform destination shown by the SRP;
   - exact version of the information submitted;
   - submitter and approver roles;
   - AR validation state if still pending;
   - any difference between the SRP counter and the internal T0-derived deadline.

If the SRP is unavailable, follow the outage procedure above.

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

Perform a factual review against preserved evidence. Do not rewrite uncertainty as certainty. Recalculate the 72-hour deadline from internal T0 and explicitly ignore any inconsistent portal countdown.

### By T+72h — main notification

If legally required, submit the main CRA notification and preserve the same submission evidence fields as the 24-hour report.

### Final report

- **Actively exploited vulnerability:** final report no later than 14 days after a corrective or mitigating measure is available.
- **Severe security incident:** final report within one month after the 72-hour notification.

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
- UTC awareness timestamp T0 and how awareness was established;
- internally calculated T0+24h and T0+72h deadlines;
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
- Primary/Secondary AR used for the event and AR validation state;
- CRA SRP / CSIRT reporting status and submission references;
- SRP availability/outage evidence where relevant;
- SRP displayed deadlines and any discrepancy with internal T0-derived deadlines;
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

These controls are documentary/operational and do not require a Phase 0 hardware architecture redesign.

### Access and reporting authority

- [ ] Primary AR candidate designated internally by name/role.
- [ ] Backup / intended Secondary AR designated internally by name/role.
- [ ] Primary AR EU Login exists and MFA is enabled and tested.
- [ ] Backup AR EU Login exists and MFA is enabled and tested.
- [ ] Correct CSIRT designated as coordinator identified under Article 14(7) and recorded with current contact details.
- [x] Live ENISA SRP URL recorded from the 8 September 2026 guidance.
- [x] Procedure explicitly prohibits pre-registration solely for anticipation/testing.

### Internal timing and fallback

- [x] Internal T0 + 24h / T0 + 72h calculation is the documented deadline authority.
- [x] Known SRP 72-hour counter defect is documented and must not override internal timing.
- [x] SRP outage procedure requires later SRP submission even after direct CSIRT contact.
- [ ] Perform one tabletop exercise including an SRP outage and a misleading 72-hour portal counter.

### Security operations

- [ ] configure and test a monitored EMOPET security mailbox;
- [x] designate the Founder / Product Authority as interim accountable Incident Commander role;
- [ ] nominate a backup Incident Commander / evidence custodian;
- [ ] record privacy/DPO and legal/regulatory escalation contacts when appointed;
- [ ] prove that a release can be mapped to firmware/software versions, commit, artifact hashes and SBOM;
- [ ] verify evidence-retention location and access controls;
- [ ] confirm supplier escalation contacts for MAT/TAG manufacturing and critical software/cloud dependencies.

## Contacts registry

- EMOPET security mailbox: `TO_CONFIGURE_AND_TEST`;
- accountable Founder / Product Authority: `ROLE_DESIGNATED — CONTACT_RECORD_TO_CONFIGURE`;
- backup Incident Commander: `TO_NOMINATE`;
- Primary AR: `TO_DESIGNATE_AND_VERIFY_EU_LOGIN_MFA`;
- backup / intended Secondary AR: `TO_DESIGNATE_AND_VERIFY_EU_LOGIN_MFA`;
- DPO/privacy contact: `TO_CONFIRM`;
- legal/regulatory counsel: `TO_CONFIRM`;
- relevant CSIRT designated as coordinator: `TO_IDENTIFY_PER_CRA_ART_14_7`;
- ENISA CRA SRP: `https://portal.cra-srp.enisa.europa.eu` (available from 11 September 2026; English-only at launch according to ENISA guidance current on 8 September 2026).

## Launch gate

`CRA-SRP-LAUNCH-CRITICAL = OPEN_EVIDENCE_REQUIRED`

Do not mark this gate ready solely because this procedure exists. Minimum closure evidence before operational readiness can be claimed:

1. Primary and backup AR roles recorded internally;
2. EU Login + MFA evidence for both intended operators;
3. correct coordinating CSIRT and contact path recorded;
4. monitored security intake path tested;
5. tabletop demonstrating internal T0 deadlines, SRP counter discrepancy handling and outage fallback;
6. release/SBOM evidence mapping demonstrated.

## Evidence integrity

Preserve timestamps, logs, hashes, release artifacts, SBOMs and relevant configuration. Restrict access on a need-to-know basis. Do not place secrets, exploit material that creates unnecessary risk, personal EU Login credentials, MFA recovery material, or unnecessary personal data in public GitHub issues or public channels.
