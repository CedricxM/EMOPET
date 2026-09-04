# P0 PRIV-SEC discovery matrix

Status: `PRIV-SEC-DISC / CANDIDATE`

Parent: #154
Discovery issue: #155
Authority date: 2026-09-04

This document records repository-observed security-control authority after the 2026-09-03 CNIL enforcement signal captured in #154. It is an evidence map, not a GDPR compliance declaration and not a production-security certification.

## Classification key

- `PRESENT` — repository evidence establishes the control for the stated scope.
- `PARTIAL` — useful control/evidence exists but does not satisfy the full readiness gate.
- `ABSENT` — no repository-owned implementation/evidence was found for the gate.
- `EXTERNAL/UNVERIFIED` — the control would depend on provider/console/infrastructure evidence not represented in this repository.

## Principal inventory

### Interactive human principals

- `Guardian / account user` — represented by canonical `users.id` and bearer-authenticated backend identity candidates.
- `Community member/moderator/admin` — a Community membership schema contains a role field, but no reviewed repository-wide privileged authority model proves that those role values govern privileged product/admin access.
- `Founder / Product Authority` — appears as an accountable operational incident role in the CRA incident-response procedure; this is not the same thing as an authenticated runtime admin principal.
- `Privacy/DPO`, `legal/regulatory counsel`, `Technical Lead`, `Evidence Custodian`, `Incident Commander` — documentary/operational roles in the incident procedure, not runtime authorization identities.

### Privileged human runtime principals

No canonical repository-wide `admin`, `support`, or `operator` identity model was established by this discovery pass.

The historical web security audit mentions admin web routes protected by an `ADMIN_TOKEN`. That token gate is a separate prototype/admin-route mechanism and does not establish named privileged identities, MFA, RBAC, least privilege, or per-admin accountability.

### Machine/service identities

Repository configuration and CI use service secrets/tokens, but this pass does not treat them as interactive principals and does not claim MFA applies to them. Provider/CI/database identities require separate credential and least-privilege evidence.

## Access-path inventory

| Access path | Authority state | Discovery note |
|---|---|---|
| Guardian backend API | `PARTIAL` | AUTH-01 candidates provide canonical bearer identity/session machinery; owner-scoped authorization exists on dog routes. |
| Web admin API routes | `PARTIAL / PROTOTYPE` | Historical audit records `ADMIN_TOKEN` fail-closed behavior and rate limiting. No named admin identity or MFA evidence. |
| Support/operator tooling | `ABSENT` | No canonical support/operator access plane established. |
| Database/provider consoles | `EXTERNAL/UNVERIFIED` | No repository evidence can prove console MFA or provider-side RBAC. |
| CI/CD privileged access | `EXTERNAL/UNVERIFIED` | Repository workflows exist, but human account MFA/organization permission evidence is external. |
| Observability/security console | `ABSENT` or `EXTERNAL/UNVERIFIED` | No repository-owned production monitoring/alerting pipeline is established. |
| Production shell/runtime console | `EXTERNAL/UNVERIFIED` | No authoritative repository evidence for production console access policy. |

## Authorization inventory

Observed repository-owned authorization evidence:

1. `backend/api/middleware/authorization.ts` derives the current authenticated `userId`, validates dog UUIDs, reads `dogs.owner_id`, and returns `404 not_found` when the dog is absent or belongs to another user. This is meaningful horizontal-access isolation for covered dog-scoped routes.
2. Dog, sensor, health and selected community/copresence routes use the dog-ownership helper on the observed baseline.
3. Community membership schema contains a role value, but schema presence alone is not runtime RBAC authority.
4. Historical web admin token protection is a shared-secret gate, not least-privilege RBAC.

Discovery conclusion: repository authority is largely `authenticated identity + owner equality`, not a complete privileged role/permission model.

## Sensitive/account-linked data-plane inventory

At minimum, the following planes can become personal data when linked to an identifiable Guardian/account:

- core user/account identity;
- dog records through `owner_id`;
- dog-scoped sensor summaries/events and derived outputs;
- veterinary-report access/share-token flows;
- health/journal records where linked to a Guardian/dog;
- Community authorship/membership and moderation state;
- feature opt-in/consent-like prototype state;
- presence/copresence-related state;
- support/contact submissions and any future support/admin annotations;
- incident/security records if they contain account identifiers, IP/device metadata or affected-person evidence.

The existence of dog telemetry does not by itself make it human health data. The PRIV-SEC boundary is whether the dataset is personal data or linkable to an identifiable natural person.

## Audit / telemetry inventory

`PARTIAL` at best.

Positive evidence:

- CRA incident procedure requires UTC awareness timestamps, reporter/source, affected versions, hashes, SBOM evidence, roles/delegation and preservation of relevant logs/artifacts.
- Security and supply-chain workflows retain some CI security artefacts.

Missing evidence:

- no canonical sensitive-access audit-event model with actor/action/target/scope/outcome;
- no demonstrated append-only/integrity control for privileged access logs;
- no selected retention/access policy for a production audit trail;
- historical security audit explicitly lists a monitoring/logging pipeline with secret redaction as future infrastructure work.

Plain application logs or CI logs must not be promoted as a privileged-access audit trail without these controls.

## Detection / alert inventory

`ABSENT` for PRIV-SEC-G5/G6 repository-owned readiness.

Repository security work includes rate limiting, SAST, secret scanning, dependency audit and incident procedure, but this pass found no executable production detection covering suspicious authentication, account enumeration, abnormal cross-account access, bulk export, or exfiltration patterns, and no proven actionable alert-routing/acknowledgement path.

Rate limiting is preventive/abuse-control evidence, not a substitute for anomaly detection. The historical audit also records the backend rate limiter as in-memory and unsuitable as the final multi-instance production boundary.

## Breach-recipient graph

`PARTIAL`.

Useful existing relationships include:

- `users.id` -> owned `dogs.owner_id`;
- Community memberships/authorship -> `users.id` where durable/canonical schema is used;
- dog-scoped health/sensor/report relationships;
- feature opt-in and other account-linked state where a canonical user binding exists.

However, Article 34 recipient completeness cannot assume that the primary account holder is the only affected natural person. A future breach-scope enumerator must inspect the compromised data plane for every identifiable natural-person relationship actually present, including contact/support submitters, Community participants, delegated/share-linked identities if introduced, and other third-party identifiers stored in the affected dataset.

The CRA incident procedure already requires affected-user and personal-data-impact assessment, but it does not yet implement/test complete Article 34 recipient enumeration.

## PRIV-SEC readiness evidence matrix

| Parent gate | Status | Repository evidence | Missing authority / next proof |
|---|---|---|---|
| `PRIV-SEC-G1` Privileged MFA | `ABSENT / EXTERNAL-UNVERIFIED` | No MFA implementation found for privileged humans. | Define privileged principal model; provider-console MFA remains external evidence; repository-owned privileged login must enforce MFA if introduced. |
| `PRIV-SEC-G2` RBAC / least privilege | `PARTIAL` | Dog ownership checks prove some horizontal isolation; Community role column exists; admin token gate exists historically. | Canonical privileged roles/permissions and negative vertical/horizontal tests. Shared admin token is not sufficient. |
| `PRIV-SEC-G3` Data-access minimisation | `PARTIAL` | Owner-qualified dog access and selected fail-closed route candidates reduce blast radius. | Full data-plane permission matrix; bulk/admin/support scope controls; service-principal minimisation evidence. |
| `PRIV-SEC-G4` Sensitive access audit trail | `PARTIAL` | Incident evidence preservation exists. | Structured privileged/data-access audit events, integrity, destination, access and retention evidence. |
| `PRIV-SEC-G5` Anomaly detection | `ABSENT` | No qualifying executable production detection found. | Detect suspicious auth, enumeration, bulk access/export and exfiltration patterns. |
| `PRIV-SEC-G6` Alerting / response latency | `ABSENT` | Incident roles/runbook exist but no proven alert pipeline. | Actionable alert routing, ownership, acknowledgement/escalation and simulation evidence. |
| `PRIV-SEC-G7` Breach-recipient completeness | `PARTIAL` | Data relationships and incident personal-data assessment provide building blocks. | Executable/testable affected-person enumeration beyond primary account holder. |
| `PRIV-SEC-G8` Breach exercise | `PARTIAL` | CRA procedure already requires a tabletop before 2026-09-11. | Run and retain a bounded exercise that includes GDPR affected-person scoping and Article 34 decision path. |

## Smallest safe implementation slices

### Slice A — privileged authority model discovery/contract

Before adding MFA, define a canonical repository-owned privileged principal/role contract. The first code slice should not create production admin powers; it should establish explicit role semantics and fail closed when privileged authority is absent.

Candidate evidence:

- typed privileged role enum/contract;
- no `admin` fallback or shared implicit privileged principal;
- negative tests proving Guardian tokens cannot cross into privileged routes;
- explicit separation of human privileged roles and machine/service identities.

### Slice B — structured security audit event contract

Introduce a bounded security-event schema and test only for high-value authentication/privileged-access events. Do not claim durable auditability until a destination, integrity model and retention/access policy exist.

### Slice C — breach-recipient enumerator dry-run

Build a non-notifying, test-only/dry-run enumerator that accepts a compromised data-plane scope and returns the canonical affected natural-person references that repository relationships can prove. Unknown/external relationships must stay explicit rather than being silently dropped.

### Slice D — anomaly/alert control after telemetry authority exists

Do not invent an alerting vendor. First establish event authority, then add provider-neutral detection rules/contracts and simulation tests. External delivery evidence remains `EXTERNAL/UNVERIFIED` until supplied.

## Coordination constraints

- Do not merge or retarget AUTH-01, PRIV-01 or Community stacks from this discovery candidate.
- Do not represent `ADMIN_TOKEN` as privileged MFA or RBAC.
- Do not mark provider-console MFA as implemented without external evidence.
- Do not interpret rate limiting as anomaly detection.
- Do not put secrets, real breach data or identifiable incident evidence in repository fixtures.
- Do not close #154 from this document alone.

## Discovery status

`DISC-G1 = PARTIAL`
`DISC-G2 = PARTIAL`
`DISC-G3 = PARTIAL`
`DISC-G4 = PARTIAL`
`DISC-G5 = PARTIAL`
`DISC-G6 = COMPLETE_FOR_REPOSITORY_BASELINE (ABSENT FOUND)`
`DISC-G7 = PARTIAL`
`DISC-G8 = COMPLETE_FOR_INITIAL MATRIX`

`G-PRIV-SEC-DISCOVERY-01 = OPEN`

Reason: the initial matrix is now recorded, but external privileged-access evidence and exact runtime role surface remain unresolved. This candidate does not authorize release or merge.
