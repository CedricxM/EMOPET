# CRA SRP Operator Handoff Checklist — EMOPET

Status: `LAUNCH-CRITICAL HUMAN EVIDENCE CHECKLIST / NOT LEGAL SIGN-OFF`

Date: `2026-09-10`

This checklist is the human-evidence companion to `CRA_SRP_LAUNCH_CRITICAL_2026-09-10.md`. It is intentionally operational and must not contain EU Login passwords, MFA recovery material, bearer tokens, exploit payloads or unnecessary personal data.

## Before 11 September 2026

- [ ] Primary AR named internally.
- [ ] Primary AR EU Login + MFA tested.
- [ ] Backup / intended Secondary AR named internally.
- [ ] Backup EU Login + MFA tested independently.
- [ ] Correct CSIRT Designated as Coordinator identified under CRA Article 14(7).
- [ ] Current CSIRT contact path recorded outside GitHub if it contains personal data.
- [ ] Monitored EMOPET security intake mailbox configured and tested.
- [ ] Backup Incident Commander / Evidence Custodian nominated.
- [ ] Controlled off-SRP reporting package location recorded.
- [ ] Backup can reach the reporting package without using Primary credentials.
- [ ] Release -> firmware/software version -> commit -> artifact hash -> SBOM mapping demonstrated on one release candidate.

## Reporting package availability test

The backup must be able to locate, without access to the Primary AR account:

- [ ] manufacturer legal identity/address used for SRP registration;
- [ ] coordinating CSIRT identity/contact path;
- [ ] incident log template;
- [ ] T0 / T0+24h / T0+72h calculation method;
- [ ] current product/build/version identifiers;
- [ ] release commit/tag and artifact hashes;
- [ ] SBOM identifier/hash;
- [ ] English-ready early-warning template/work area;
- [ ] English-ready 72-hour notification work area;
- [ ] prior SRP reference IDs and outage/CSIRT communications when applicable.

## First real SRP registration/report

- [ ] Primary registration is initiated only when a real reporting need exists under current ENISA guidance.
- [ ] Primary association state recorded: `PENDING_VALIDATION | VERIFIED`.
- [ ] A due notification is submitted without waiting for Primary validation.
- [ ] Internal T0 remains the deadline source of truth.
- [ ] SRP displayed deadline discrepancy, if any, is captured as evidence.
- [ ] SRP outage, if any, follows direct-CSIRT-if-urgent plus later SRP submission procedure.

## Secondary AR activation

Only after the Primary is `Verified`:

- [ ] Primary sends the Secondary invitation immediately.
- [ ] Invitation-sent UTC recorded.
- [ ] Invitation-expiry UTC recorded at sent time + 7 days.
- [ ] Backup notified through the internal channel.
- [ ] Internal acceptance target set to 24 hours.
- [ ] Day-5 reminder scheduled if still pending.
- [ ] Acceptance UTC recorded and Secondary state confirmed active, or expiry/escalation recorded.

## Tabletop required before readiness claim

The exercise must demonstrate one chronology containing all of the following:

1. T0 occurs while Primary validation is pending.
2. Reporting preparation continues and the due notification is not delayed for validation.
3. Backup has the reporting package but is not falsely represented as an active Secondary AR.
4. Primary verification later triggers immediate Secondary invitation.
5. Seven-day invitation expiry and day-5 reminder are exercised.
6. A branch scenario makes Primary unavailable before Secondary activation, without credential/MFA sharing.
7. SRP outage fallback is exercised.
8. The known portal-counter discrepancy is handled using internal T0 authority.

## Evidence references

- Primary AR readiness evidence reference:
- Backup AR readiness evidence reference:
- Coordinating CSIRT record reference:
- Security mailbox test reference:
- Off-SRP reporting package reference:
- Release/SBOM mapping evidence reference:
- Tabletop date / record reference:
- Outstanding blocker owner:
- Next review date:

`CRA-SRP-OPERATOR-HANDOFF = OPEN_EVIDENCE_REQUIRED`
