# EMOPET Security Policy

Status: `P0 SECURITY INTAKE ACTIVE / PRODUCT NOT RELEASED`

## Reporting a vulnerability

Please do not publish a suspected EMOPET vulnerability before coordinated disclosure.

Preferred intake address: `security@emopet.example`

`security@emopet.example` is a placeholder until the founder configures the final monitored security mailbox. Do not advertise it externally until the mailbox exists.

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

- acknowledge: 2 business days;
- initial triage: 5 business days;
- critical/actively exploited: immediate incident process;
- coordinated disclosure timing: case-by-case based on user risk and remediation readiness.

## CRA incident path

Potential actively exploited vulnerabilities or severe incidents affecting a product with digital elements must be escalated into the CRA incident-readiness procedure in `docs/security/CRA_INCIDENT_RESPONSE.md`.

## Secrets

Never send production secrets, raw user exports or unnecessary personal data in a vulnerability report.
