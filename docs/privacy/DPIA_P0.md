# EMOPET Privacy Impact Assessment (AIPD/DPIA) — P0

Status: `CONTROLLED DRAFT / NOT DPO OR LEGAL SIGN-OFF`

## Why EMOPET needs an AIPD workstream

EMOPET combines connected-device data, potentially precise location, longitudinal routines, user account data and AI/derived indicators. The project therefore treats an AIPD as a design requirement rather than waiting for public launch.

## Processing description

### Controllers/processors

- Controller identity: `TO_CONFIRM_LEGAL_ENTITY`
- DPO/privacy contact: `TO_CONFIRM`
- Hosting/processor list: `TO_CONFIRM_BEFORE_PRODUCTION`

### Data flows in scope

1. account/authentication;
2. dog profile;
3. MAT/TAG device metadata;
4. preprocessed sensor summaries;
5. future raw sensor pipeline if approved;
6. ELI derived/inferred outputs;
7. health/veterinary record features;
8. location/map/context;
9. community/Veute;
10. Breiz third-party context providers;
11. support/contact;
12. logs/security/incident evidence;
13. export/deletion/rights requests.

Machine-readable inventory: `config/privacy/data-inventory.json`.

Current repository truth for support/contact: the controlled Product V1 candidate persists support requests in PostgreSQL `contact_requests`, with `requester_user_id` linked to canonical `users.id` and requester identity derived from server authentication. The historical file-backed Contact plane remains non-production/demo-only. This is a technical authority statement only; it does not approve a production retention period, erasure disposition, staff-access model or processor arrangement.

## Core principles

- data minimisation;
- purpose limitation;
- private by default;
- server-side ownership checks;
- no raw audio storage/retention/transmission under current doctrine;
- exact location only where necessary and voluntarily enabled;
- no dog-wellbeing data sent to generic third-party context APIs;
- measured/preprocessed/inferred data remain distinguishable;
- export and erasure are product requirements, not manual afterthoughts;
- source/provider processing must be documented before activation.

## Risk register

| Risk | Initial severity | P0 controls | Residual status |
|---|---|---|---|
| Cross-user dog data access | High | server-side owner checks; negative tests required | OPEN_TEST_COVERAGE |
| Continuous/precise location reveals household routines | High | minimise/coarsen; IP geolocation off by default; consent/retention policy required | OPEN_POLICY |
| Derived indicators interpreted as diagnosis | High | non-medical language, confidence gates, measured/preprocessed/inferred separation | OPEN_UX_VALIDATION |
| Third-party provider receives excess personal data | High | provider registry, server-side keys, minimisation, provider-specific privacy review | OPEN_PROVIDER_AUDIT |
| Raw audio captures household speech | High | no raw audio storage/retention/transmission doctrine | OPEN_NEGATIVE_PROOF |
| Account takeover exposes long-term history | High | auth baseline, refresh/revocation, rate limits, security monitoring | BLOCKED_AUTH_BASELINE |
| Community accidentally publishes private dog/location data | High | public-safe schemas, opt-in/privacy levels, moderation tests | OPEN_END_TO_END_TESTS |
| Data retained indefinitely | Medium/High | machine-readable inventory; retention values explicitly TO_CONFIRM | OPEN_RETENTION_DECISION |
| Deletion misses backups/derived/account-scoped records | High | erasure runbook; canonical subject links mapped where implemented; lifecycle policy and executor required | OPEN_IMPLEMENTATION |
| Supply-chain compromise | High | SBOM, dependency audit, Semgrep, Gitleaks and regression workflow merged as P0 control layer | CONTROL_LAYER_MERGED_RESIDUAL_RISK_REMAINS |

## Legal bases

The codebase must not invent legal bases. Each processing purpose is marked `TO_CONFIRM` in the inventory until the legal entity/product flow is finalised. Candidate bases may include contract, legitimate interests, consent or legal obligation depending on the precise purpose, but selection requires legal/privacy review.

## Necessity and proportionality questions

For each category ask:

- Is the field necessary for the feature?
- Can precision be reduced?
- Can processing occur locally/on-device?
- Can retention be shorter?
- Can a derived feature replace persistent raw data?
- Does a third party need the data at all?
- Can the feature work opt-in rather than always-on?

## Data subject rights

P0 target flows:

- access/portability: dog-scoped machine-readable export exists; account-scoped categories such as support/contact still require an explicit rights projection before production;
- rectification: account/dog profile edit flows;
- deletion: canonical auth/database foundations exist as controlled candidates, but destructive erasure remains fail-closed until the full lifecycle policy and executor are approved and tested;
- objection/withdrawal: category/provider/optional-feature controls where applicable;
- information: privacy notice and AI/provider transparency before production.

The presence of a foreign key such as `contact_requests.requester_user_id -> users.id` is not an instruction to cascade-delete. Delete, anonymise, retain-for-justified-hold, provider cleanup and backup expiry decisions remain governed by PRIV-01.

## International transfers

No provider is presumed safe for transfers merely because it has an API. Each production provider must record hosting/recipient geography, role, DPA/SCC or other transfer mechanism where applicable, and data minimisation.

## Approval gate

Before public launch the AIPD must include:

- final legal entity/controller;
- final purposes/legal bases;
- final retention schedule;
- processor/subprocessor register;
- transfer assessment;
- technical/organisational measures;
- residual-risk owner acceptance;
- DPO/privacy/legal review as applicable.
