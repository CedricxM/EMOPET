# EMOPET Security Policy

Status: `P0 SECURITY INTAKE ACTIVE / PRODUCT NOT RELEASED`

## Reporting a vulnerability

Please do not publish a suspected EMOPET vulnerability before coordinated disclosure.

Preferred intake address: `security@emopet.example`

`security@emopet.example` is a placeholder until the founder configures the final monitored security mailbox. Do not advertise it externally until the mailbox exists. Configuring and testing a monitored mailbox is a readiness action before the CRA reporting obligations begin applying on 11 September 2026.

Include, when possible:

- affected component (web, mobile, backend, MAT, TAG, firmware, update infrastructure);
- affected version/commit/firmware build;
- reproduction steps;
- impact and prerequisites;
- proof-of-concept that avoids unnecessary access to personal data;
- whether exploitation appears active in the wild;
- contact information for coordinated follow-up.

## Safe-harbor intent

Good-faith research that avoids privacy harm, service disruption, persistence, extortion, social engineering and access beyond what is needed to demonstrate the issue will be handled as coordinated vulnerability disclosure. A formal legal safe-harbor statement remains `TO_CONFIRM` before public launch.

## Response targets

Internal targets, not a guarantee:

- acknowledge ordinary reports: 2 business days;
- initial triage for ordinary reports: 5 business days;
- suspected active exploitation or severe security incident: **immediate incident process**;
- coordinated disclosure timing: case-by-case based on user risk and remediation readiness.

The ordinary 2/5-business-day targets do **not** override statutory reporting clocks. A credible report suggesting active exploitation or a severe security incident must be timestamped and escalated immediately so the CRA 24-hour / 72-hour process can be assessed in time.

## CRA incident path

From 11 September 2026, CRA reporting obligations apply to in-scope actively exploited vulnerabilities and severe security incidents affecting products with digital elements that have been made available on the Union market. The controlled operational procedure is:

`docs/security/CRA_INCIDENT_RESPONSE.md`

The procedure owns the UTC awareness timestamp, role assignment, 24-hour early-warning checkpoint, 72-hour main-notification checkpoint, final-report deadlines, affected-version/SBOM evidence and parallel GDPR/product-safety assessments.

EMOPET is not represented by this repository as a commercially released product today; the procedure is maintained now so the reporting mechanism exists before market availability.

## Secrets

Never send production secrets, raw user exports or unnecessary personal data in a vulnerability report.
