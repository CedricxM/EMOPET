import { readFileSync } from 'node:fs';

const runbookPath = 'docs/security/CRA_SRP_LAUNCH_CRITICAL_2026-09-10.md';
const incidentPath = 'docs/security/INCIDENT_LOG_TEMPLATE.md';
const procedurePath = 'docs/security/CRA_INCIDENT_RESPONSE.md';

const runbook = readFileSync(runbookPath, 'utf8');
const incident = readFileSync(incidentPath, 'utf8');
const procedure = readFileSync(procedurePath, 'utf8');

const requiredRunbookMarkers = [
  'Source guidance date: `2026-09-09`',
  'PRIMARY_INVITATION_ONLY_AFTER_PRIMARY_VERIFIED',
  'CRA-SRP-SECONDARY-INVITATION_TTL = 7_DAYS',
  'CRA-SRP-PENDING-PRIMARY-VALIDATION = NOT_A_REPORTING_BLOCKER',
  'CRA-SRP-LAUNCH-REDUNDANCY = ORGANISATIONAL_UNTIL_SECONDARY_ACTIVE',
  'INVITE_IMMEDIATELY_AFTER_PRIMARY_VERIFIED',
  'RESIDUAL_OPERATIONAL_RISK',
  'do **not** use or share the Primary\'s EU Login credentials or MFA factors',
  'internal target: backup accepts within **24 hours**',
  'internal reminder no later than **day 5**',
];

const requiredIncidentMarkers = [
  'Primary AR internal designation:',
  'Primary AR SRP state:',
  'Backup / intended Secondary AR internal designation:',
  'Secondary invitation state:',
  'Secondary invitation sent at UTC:',
  'Secondary invitation expires at UTC:',
  'Off-SRP reporting package reference:',
  'Submitted while AR association validation pending?',
];

const requiredProcedureMarkers = [
  'CRA-SRP-DEADLINE-AUTHORITY = INTERNAL_T0_NOT_PORTAL_COUNTER',
  'CRA-SRP-OUTAGE-FALLBACK = CSIRT_IF_URGENT + SRP_RESUBMISSION_REQUIRED',
  'CRA-SRP-LAUNCH-CRITICAL = OPEN_EVIDENCE_REQUIRED',
];

const failures = [];

for (const marker of requiredRunbookMarkers) {
  if (!runbook.includes(marker)) failures.push(`${runbookPath}: missing required marker: ${marker}`);
}
for (const marker of requiredIncidentMarkers) {
  if (!incident.includes(marker)) failures.push(`${incidentPath}: missing required field: ${marker}`);
}
for (const marker of requiredProcedureMarkers) {
  if (!procedure.includes(marker)) failures.push(`${procedurePath}: missing existing deadline/outage gate: ${marker}`);
}

// Reject only affirmative operational instructions. Safety text is expected to
// quote the forbidden assumptions while explicitly negating them, so broad
// substring regexes would create false positives on the very controls we need.
const forbiddenAffirmativeLines = [
  /^\s*[-*]\s*Secondary AR (?:is|must be|should be) pre-registered\b/im,
  /^\s*[-*]\s*Primary \+ Secondary already (?:ready|active|registered) in SRP\b/im,
  /^\s*[-*]\s*wait for (?:Primary )?verification before (?:submitting|reporting)\b/im,
  /^\s*[-*]\s*(?:use|share) the Primary(?: AR)?['’]s (?:EU Login|MFA|credentials)\b/im,
];

for (const pattern of forbiddenAffirmativeLines) {
  if (pattern.test(runbook)) failures.push(`${runbookPath}: forbidden affirmative launch instruction matched ${pattern}`);
}

if (failures.length) {
  console.error('CRA SRP readiness authority audit FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('CRA SRP readiness authority audit PASS');
console.log('- Secondary registration remains invitation-only after Primary verification.');
console.log('- Seven-day invitation expiry and internal follow-up controls are preserved.');
console.log('- Pending Primary validation is not treated as a reporting blocker.');
console.log('- Launch backup remains organisational until SRP Secondary activation completes.');
console.log('- Incident log carries portal-state and off-SRP continuity evidence fields.');
console.log('- Existing internal-T0 and SRP-outage controls remain present.');
