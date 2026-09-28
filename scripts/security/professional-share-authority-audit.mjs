#!/usr/bin/env node
// INT-05 backend/shared guard; client hold checks remain owned by INT-09/#265.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const failures = [];

function read(path) {
  const absolute = resolve(path);
  if (!existsSync(absolute)) {
    failures.push(`missing file: ${path}`);
    return '';
  }
  return readFileSync(absolute, 'utf8');
}

function requireText(path, values) {
  const content = read(path);
  for (const value of values) {
    if (!content.includes(value)) failures.push(`${path}: missing ${value}`);
  }
  return content;
}

function filesBelow(path) {
  const absolute = resolve(path);
  if (!existsSync(absolute)) return [];
  const results = [];
  for (const entry of readdirSync(absolute)) {
    const child = `${path}/${entry}`;
    const childAbsolute = resolve(child);
    if (statSync(childAbsolute).isDirectory()) results.push(...filesBelow(child));
    else results.push(child);
  }
  return results;
}

const shareTypes = requireText('packages/shared/src/types/professional-share.ts', [
  'ProfessionalShareGrant',
  'ownerUserId: string',
  'recipient: ProfessionalShareRecipient',
  'scopes: ProfessionalShareScope[]',
  'accessExpiresAt',
  "actorType: 'OWNER' | 'RECIPIENT' | 'SYSTEM'",
  'REVOKED',
]);
if (shareTypes.includes('guardianUserId')) {
  failures.push('active shared professional-share types must not expose guardianUserId');
}

const shareValidators = requireText('packages/shared/src/validators/professional-share.ts', [
  'ProfessionalShareGrantCreateSchema',
  'OwnerProfessionalShareGrantCreateSchema',
  'OwnerProfessionalShareGrantRevokeSchema',
  'ownerUserId: z.string()',
  'Recipient must be bound to an email or verified professional principal.',
  'accessExpiresAt must be in the future.',
  'Research sharing is unavailable until separate consent authority is implemented.',
  'OWNER_SELECTED_NOTES',
  'DECLARED_CONTEXT',
]);

if (!shareValidators.includes('const OwnerProfessionalShareRecipientSchema')) {
  failures.push('Owner professional-share creation must use a dedicated client-facing recipient schema');
}
if (shareValidators.includes("const OwnerProfessionalShareRecipientSchema = z.object({\n  displayName: z.string().trim().min(1).max(160),\n  type: ProfessionalShareRecipientTypeSchema,\n  organizationName: z.string().trim().min(1).max(200).optional(),\n  email: z.string().email().max(254),\n  principalId:")) {
  failures.push('Owner client-facing recipient schema must not accept principalId');
}
if (shareValidators.includes('GuardianProfessionalShareGrantCreateSchema') ||
    shareValidators.includes('GuardianProfessionalShareGrantRevokeSchema') ||
    shareValidators.includes('guardianUserId')) {
  failures.push('active professional-share validators still expose Guardian terminology');
}

const dogRoutes = requireText('backend/api/routes/dogs.ts', [
  'EMOPET_ALLOW_LEGACY_GENERIC_VET_SHARE',
  'RECIPIENT_BOUND_GRANT_REQUIRED',
  // Historical gate identifier remains stable for evidence compatibility.
  'G-GUARDIAN-PROFESSIONAL-SHARE-01',
  "'/:id/professional-shares'",
  "'/:id/professional-shares/:grantId/revoke'",
  'ownerUserId: userId',
  'professionalShareGrants.ownerUserId',
  "recipientPrincipalId: null",
  "status: 'PENDING'",
  "activation: 'REQUIRES_VERIFIED_PROFESSIONAL_IDENTITY'",
  'withOwnerProfessionalShareAuthority',
  "db.transaction(async (tx)",
  ".for('share')",
  ".for('update')",
  "'Cache-Control', 'private, no-store'",
]);
if (dogRoutes.includes('professionalShareGrants.guardianUserId') ||
    dogRoutes.includes('guardianUserId: userId')) {
  failures.push('dog professional-share lifecycle still uses Guardian persistence property');
}

if (!dogRoutes.includes("process.env['NODE_ENV'] !== 'production'")) {
  failures.push('legacy generic vet share must be impossible in production');
}
if (dogRoutes.includes("'/:id/professional-shares/:grantId/activate'")) {
  failures.push('professional-share activation route exists before verified recipient identity authority is approved');
}

const shareSchema = requireText('backend/db/schema/professional-sharing.ts', [
  "pgTable('professional_share_grants'",
  "pgTable('professional_share_access_audits'",
  "ownerUserId: uuid('owner_user_id')",
  'idx_prof_share_grant_owner_dog',
  'table.ownerUserId',
  'recipientPrincipalId',
  'accessExpiresAt',
  'jsonb_array_length',
  'ELSE false END',
  '${table.scopes} <@',
  '${table.recipientPrincipalId} IS NOT NULL AND ${table.activatedAt} IS NOT NULL',
  "'PENDING','ACTIVE','EXPIRED','REVOKED','SUSPENDED'",
]);
if (shareSchema.includes('guardianUserId') ||
    shareSchema.includes("uuid('guardian_user_id')") ||
    shareSchema.includes('idx_prof_share_grant_guardian_dog')) {
  failures.push('current professional-share schema still exposes legacy Guardian persistence identifiers');
}

const dbAuthority = requireText('backend/api/services/professional-share-db-authority.ts', [
  'createProfessionalShareDbAuthority',
  'professionalShareAccessAudits',
  'ownerUserId: row.ownerUserId',
  'hasCurrentOwnerAuthority',
  'eq(dogs.ownerId, ownerUserId)',
  'resolveVerifiedRecipient',
  'VerifiedProfessionalRecipient',
  'provider-neutral',
]);
if (dbAuthority.includes('guardianUserId') || dbAuthority.includes('hasCurrentGuardianAuthority')) {
  failures.push('DB authority still exposes Guardian terminology');
}

const accessPolicy = requireText('backend/api/services/professional-share-access.ts', [
  'hasCurrentOwnerAuthority',
  'grant.ownerUserId',
  'OWNER_AUTHORITY_MISMATCH',
  'VerifiedProfessionalRecipient',
  "status: 'VERIFIED'",
  "method: 'PROVIDER_ASSERTION'",
  'issuer: string',
  'evidenceId: string',
  'verifiedAt: string',
  'expiresAt: string',
  'parseVerifiedProfessionalRecipient',
  'RECIPIENT_VERIFICATION_NOT_READY',
]);
if (accessPolicy.includes('hasCurrentGuardianAuthority') ||
    accessPolicy.includes('grant.guardianUserId') ||
    accessPolicy.includes('GUARDIAN_AUTHORITY_MISMATCH')) {
  failures.push('active professional-share access policy still exposes Guardian terminology');
}
if (!accessPolicy.includes('expiresAt <= now') || !accessPolicy.includes('verifiedAt > now')) {
  failures.push('professional recipient evidence must be time-bounded and reject future verification timestamps');
}
if (!accessPolicy.includes('resolveVerifiedRecipient(): Promise<unknown>')) {
  failures.push('provider identity output must cross an explicit runtime-validation boundary');
}

const accessTests = requireText('backend/test/professional-share-access.test.mjs', [
  'fixture-professional-idp',
  'RECIPIENT_VERIFICATION_NOT_READY',
  'invalid provider evidence must fail before durable grant reads',
  'recipient verification expiry is re-evaluated after asynchronous audit',
]);
if (!accessTests.includes("method: 'PROVIDER_ASSERTION'")) {
  failures.push('professional-share policy tests do not exercise the provider evidence envelope');
}

const projection = requireText('backend/api/services/professional-share-projection.ts', [
  'projectProfessionalShareSnapshot',
  "case 'VETERINARY_SUMMARY'",
  "case 'QUALIFIED_LONGITUDINAL_OBSERVATIONS'",
  "case 'DATA_COVERAGE_AND_CONFIDENCE'",
  "case 'OWNER_SELECTED_NOTES'",
  "case 'DECLARED_CONTEXT'",
  'ProfessionalShareProjectionUnavailableError',
  'snapshot.dogId !== authority.dogId',
  'generatedAt: snapshot.generatedAt.toISOString()',
]);
for (const forbidden of ['...snapshot', '...trend', 'ownerNotes: snapshot.ownerNotes']) {
  if (projection.includes(forbidden)) {
    failures.push(`professional-share projection must remain field-whitelisted: ${forbidden}`);
  }
}

const boundedSnapshot = requireText('backend/api/services/professional-share-vet-snapshot.ts', [
  'collectProfessionalShareVetSnapshot',
  'authorization.dataFrom',
  'authorization.dataTo',
  'eq(sensorSummaries.dogId, authorization.dogId)',
  'gte(sensorSummaries.timestamp, from)',
  'lte(sensorSummaries.timestamp, to)',
  'ownerNotes: []',
]);
for (const forbidden of [
  'healthEntries',
  'listHealthEntries',
  'loadVetReportSummary',
  'createVetReportSummaryLoader',
]) {
  if (boundedSnapshot.includes(forbidden)) {
    failures.push(`bounded professional-share collector must not read legacy/unapproved data source: ${forbidden}`);
  }
}

const recipientRead = requireText('backend/api/services/professional-share-recipient-read.ts', [
  'createProfessionalShareRecipientReadBoundary',
  'collectProfessionalShareVetSnapshot',
  'const collect = options.collect ?? collectProfessionalShareVetSnapshot',
  'lockPublicationAuthority',
  'const collectedSnapshot = await collect({ tx, authorization: preflight })',
  ".for('share')",
  'createProfessionalShareAccessChecker(finalAuthority, clock)',
  'hasCurrentOwnerAuthority',
  'ownerUserId: row.ownerUserId',
  'recordUnavailableAudit',
  'projectProfessionalShareSnapshot(finalDecision, collectedSnapshot)',
]);
if (recipientRead.includes('guardianUserId') || recipientRead.includes('hasCurrentGuardianAuthority')) {
  failures.push('recipient-read authority still exposes Guardian terminology');
}
if (recipientRead.includes('loadVetReportSummary') || recipientRead.includes('createVetReportSummaryLoader')) {
  failures.push('recipient-read boundary must not fall back to the legacy unbounded veterinary report loader');
}
const finalGuardIndex = recipientRead.indexOf('if (!finalDecision.allowed) return finalDecision;');
const projectionIndex = recipientRead.indexOf('projectProfessionalShareSnapshot(finalDecision, collectedSnapshot)');
if (finalGuardIndex < 0 || projectionIndex <= finalGuardIndex) {
  failures.push('recipient-read projection must happen only after final durable authority succeeds');
}

// The recipient-read primitive is deliberately internal until professional
// identity/binding and the concrete semantic report projection are approved.
for (const routePath of filesBelow('backend/api/routes').filter((path) => path.endsWith('.ts'))) {
  const content = read(routePath);
  if (content.includes('professional-share-recipient-read')) {
    failures.push(`${routePath}: recipient-read boundary is wired to a route before identity/report authority is approved`);
  }
}

if (failures.length > 0) {
  console.error('Professional sharing authority audit FAILED:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('Professional sharing authority audit PASS.');
console.log('PASS proves static authority invariants only; it is not identity-provider, credential-proofing, security or privacy validation.');
