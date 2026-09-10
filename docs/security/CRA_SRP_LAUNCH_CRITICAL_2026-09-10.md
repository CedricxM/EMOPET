# CRA SRP Launch-Critical Assigned Representative Continuity — 10 September 2026

Status: `LAUNCH-CRITICAL OPERATIONAL CONTROL / OPEN HUMAN EVIDENCE / NOT LEGAL SIGN-OFF`

Authority date: `2026-09-10`
Source guidance date: `2026-09-09`

This runbook supplements `CRA_INCIDENT_RESPONSE.md` for the 11 September 2026 CRA reporting launch. Where an older pre-launch assumption conflicts with the Assigned Representative registration mechanics below, this runbook controls the operational preparation.

## 1. New ENISA registration constraint

ENISA's Assigned Representative registration guidance updated on 9 September 2026 establishes three launch-critical facts:

1. a **Secondary AR cannot self-register independently** for the manufacturer; registration is completed from an invitation initiated by the Primary AR;
2. the function to invite a Secondary AR is available only once the Primary AR is **Verified** for the manufacturer association;
3. the Secondary AR invitation expires after **7 days** if registration is not completed.

ENISA also confirms that validation of the Primary AR / manufacturer association runs in parallel with reporting and **does not block submission of a mandatory notification while validation is pending**.

Official sources:
- ENISA AR user registration guidance, updated 9 September 2026: https://www.enisa.europa.eu/topics/product-security/single-reporting-platform-srp/cra-srp-guidance-ar-user-registration
- ENISA SRP FAQ, updated 8 September 2026: https://www.enisa.europa.eu/topics/product-security/single-reporting-platform-srp/frequently-asked-questions
- CRA SRP portal, available from 11 September 2026: https://portal.cra-srp.enisa.europa.eu

`CRA-SRP-SECONDARY-REGISTRATION = PRIMARY_INVITATION_ONLY_AFTER_PRIMARY_VERIFIED`
`CRA-SRP-SECONDARY-INVITATION_TTL = 7_DAYS`
`CRA-SRP-PENDING-PRIMARY-VALIDATION = NOT_A_REPORTING_BLOCKER`

## 2. Launch redundancy model

The pre-launch continuity model must **not** claim `Primary + Secondary already active in SRP`.

Until the Primary AR has been verified and the invited backup has accepted the invitation, EMOPET's redundancy is organisational rather than portal-role redundancy.

Before any report is required:

- designate one internal **Primary AR** by name/role;
- ensure the Primary AR has a personal EU Login account with MFA enabled and tested;
- designate one internal **backup operator / intended Secondary AR** by name/role;
- ensure the backup has its own personal EU Login account with MFA enabled and tested;
- do not treat the backup as an active SRP Secondary AR before the invitation/acceptance flow has completed;
- ensure the backup can access the same controlled, non-secret reporting evidence package outside SRP;
- ensure the backup knows the internal T0, T0+24h and T0+72h deadline authority and the coordinating-CSIRT escalation path.

`CRA-SRP-LAUNCH-REDUNDANCY = ORGANISATIONAL_UNTIL_SECONDARY_ACTIVE`

## 3. What the backup must possess outside SRP

The backup must be able to continue preparation without access to the Primary AR's personal account, credentials or MFA factors.

The controlled reporting package must contain, or point to, at minimum:

- manufacturer legal name and address needed by the registration/reporting flow;
- intended coordinating CSIRT and current contact path;
- incident ID and preserved UTC awareness timestamp T0;
- internally calculated T0+24h and T0+72h deadlines;
- affected product/component/build/version;
- firmware/app/backend versions where relevant;
- release commit/tag and artifact hashes;
- SBOM identifier/hash and implicated component coordinates where known;
- exploitation / severe-incident evidence and uncertainty;
- affected users/devices/territories where known;
- containment and mitigation chronology;
- English-ready early-warning and 72-hour factual drafts;
- prior SRP submission/reference IDs for the same incident, if any;
- direct-CSIRT communications and outage evidence, if any;
- approver/Incident Commander contact path.

Never place EU Login credentials, MFA recovery material, bearer secrets, unnecessary personal data or unsafe exploit material into this package.

## 4. Primary verification -> Secondary activation handoff

As soon as the Primary AR becomes `Verified` for the manufacturer:

1. Primary sends the SRP invitation to the designated backup immediately;
2. record invitation-sent UTC;
3. record the calculated invitation-expiry UTC at `sent_at + 7 days`;
4. notify the backup through the internal incident/compliance channel;
5. EMOPET internal target: backup accepts within **24 hours**;
6. if still pending, raise an internal reminder no later than **day 5**;
7. if the invitation expires, record the expiry and require a fresh Primary invitation rather than assuming the old link remains valid;
8. once accepted, record the backup's SRP status as active Secondary / AR Backup User.

The 24-hour acceptance target and day-5 reminder are EMOPET internal controls. ENISA's external hard limit described in the guidance is the 7-day invitation expiry.

`CRA-SRP-SECONDARY-ACTIVATION = INVITE_IMMEDIATELY_AFTER_PRIMARY_VERIFIED`

## 5. Incident during Primary validation

A real report must **not** wait for Primary verification.

If a mandatory CRA notification is due while the Primary AR / manufacturer association remains pending:

- continue the reporting flow using the Primary AR;
- submit within the true T0-derived deadline;
- record the association validation state in the incident log;
- keep the backup preparing and reviewing the same reporting package;
- do not delay the early warning or main notification merely to obtain a `Verified` badge or activate the Secondary AR.

`CRA-SRP-REPORTING-CLOCK > CRA-SRP-AR-VALIDATION-WAIT`

## 6. Primary unavailable before Secondary is active

This is the residual launch continuity gap created by the SRP registration design.

If the Primary becomes unavailable before the Secondary invitation has been accepted:

- preserve and continue the internal reporting clock and package preparation;
- do **not** use or share the Primary's EU Login credentials or MFA factors;
- do **not** assume the intended backup can bypass the invitation requirement or is already an authorised Secondary AR;
- escalate immediately through the designated coordinating CSIRT / ENISA operational support path while preserving the mandatory deadline;
- record the exact portal/account state and every escalation attempt;
- follow any lawful operational route provided by the competent authority without inventing an unsupported SRP role transition.

The backup's off-SRP readiness reduces single-person knowledge dependency, but it does not manufacture portal authority that ENISA has not granted.

`CRA-SRP-PRIMARY-LOSS-BEFORE-BACKUP-ACTIVE = RESIDUAL_OPERATIONAL_RISK`

## 7. Launch checklist for 10-11 September 2026

### Human/access evidence

- [ ] Primary AR designated internally by name/role.
- [ ] Primary EU Login + MFA tested without recording secrets in GitHub.
- [ ] Backup/intended Secondary AR designated internally by name/role.
- [ ] Backup EU Login + MFA tested independently.
- [ ] Correct coordinating CSIRT and escalation contact path recorded.
- [ ] Backup can reach the controlled off-SRP reporting package.

### Portal-state evidence when first notification occurs

- [ ] Primary SRP registration initiated only when required by the live reporting need/current ENISA guidance.
- [ ] Primary association state recorded: `PENDING_VALIDATION | VERIFIED`.
- [ ] Mandatory report submitted without waiting for validation if due.
- [ ] When Primary becomes Verified, Secondary invitation sent immediately.
- [ ] Invitation sent/expiry UTC recorded.
- [ ] Internal day-5 reminder exists while invitation remains pending.
- [ ] Secondary acceptance/active state recorded, or expiry/escalation recorded.

### Tabletop acceptance

One launch tabletop must cover all of these in a single chronology:

1. T0 occurs and the Primary association is still pending validation;
2. the 24-hour report is nevertheless prepared/submitted on time;
3. the backup has all required reporting information but is not falsely represented as an active Secondary AR;
4. Primary verification arrives later and triggers the Secondary invitation;
5. the exercise demonstrates the 7-day expiry control and reminder;
6. a branch scenario makes the Primary unavailable before Secondary activation and exercises authority escalation without credential sharing;
7. the existing SRP outage and misleading-counter scenarios from `CRA_INCIDENT_RESPONSE.md` remain covered.

## 8. Daily regulatory delta note

For the 10 September 2026 change-control pass, no additional EMOPET action is opened here for Data Act, AI Act, Batteries Regulation, GDPR/CNIL, RED/EN 18031, GPSR or DSA. Existing gates and obligations remain governed by their current repository records.

This is a scope decision for today's repository update, not a statement of legal clearance or a guarantee that no external source changed.

## Gate

`CRA-SRP-LAUNCH-CRITICAL = OPEN_EVIDENCE_REQUIRED`

Do not close on documentation alone. Minimum closure evidence remains human and operational: named operators, tested personal EU Login + MFA, coordinating-CSIRT path, monitored intake, off-SRP reporting-package access, and a tabletop that proves the new Primary/Secondary continuity mechanics.
