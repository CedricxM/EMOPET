#!/usr/bin/env node

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

requireText('packages/shared/src/types/user.ts', [
  'Coarse preference only',
  'scoped, recipient-bound, revocable grant entity',
]);

const shareTypes = requireText('packages/shared/src/types/professional-share.ts', [
  'ProfessionalShareGrant',
  'ownerUserId: string',
  'recipient: ProfessionalShareRecipient',
  'scopes: ProfessionalShareScope[]',
  'accessExpiresAt',
  "actorType: 'OWNER' | 'RECIPIENT' | 'SYSTEM'",
  'REVOKED',
]);
if (shareTypes.includes('guardianUserId: string')) {
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
    shareValidators.includes('guardianUserId: z.string()')) {
  failures.push('active professional-share validators still expose Guardian terminology');
}

const dogRoutes = requireText('backend/api/routes/dogs.ts', [
  'EMOPET_ALLOW_LEGACY_GENERIC_VET_SHARE',
  'RECIPIENT_BOUND_GRANT_REQUIRED',
  // Historical gate identifier remains stable for evidence compatibility.
  'G-GUARDIAN-PROFESSIONAL-SHARE-01',
  "'/:id/professional-shares'",
  "'/:id/professional-shares/:grantId/revoke'",
  "recipientPrincipalId: null",
  "status: 'PENDING'",
  "activation: 'REQUIRES_VERIFIED_PROFESSIONAL_IDENTITY'",
  'withOwnerProfessionalShareAuthority',
  "db.transaction(async (tx)",
  ".for('share')",
  ".for('update')",
  "'Cache-Control', 'private, no-store'",
]);

if (!dogRoutes.includes("process.env['NODE_ENV'] !== 'production'")) {
  failures.push('legacy generic vet share must be impossible in production');
}
if (dogRoutes.includes("'/:id/professional-shares/:grantId/activate'")) {
  failures.push('professional-share activation route exists before verified recipient identity authority is approved');
}

const shareSchema = requireText('backend/db/schema/professional-sharing.ts', [
  "pgTable('professional_share_grants'",
  "pgTable('professional_share_access_audits'",
  "uuid('owner_user_id')",
  'idx_prof_share_grant_owner_dog',
  'recipientPrincipalId',
  'accessExpiresAt',
  "'PENDING','ACTIVE','EXPIRED','REVOKED','SUSPENDED'",
]);
if (shareSchema.includes("uuid('guardian_user_id')") ||
    shareSchema.includes('idx_prof_share_grant_guardian_dog')) {
  failures.push('current professional-share schema still maps legacy Guardian persistence identifiers');
}

requireText('backend/db/migrations/0006_professional_share_authority.sql', [
  'CREATE TABLE IF NOT EXISTS professional_share_grants',
  'CREATE TABLE IF NOT EXISTS professional_share_access_audits',
  'guardian_user_id',
  'access_expires_at',
]);
requireText('backend/db/migrations/0009_professional_share_owner_terminology.sql', [
  'RENAME COLUMN guardian_user_id TO owner_user_id',
  'idx_prof_share_grant_owner_dog',
]);

const dbAuthority = requireText('backend/api/services/professional-share-db-authority.ts', [
  'createProfessionalShareDbAuthority',
  'professionalShareAccessAudits',
  'ownerUserId: row.guardianUserId',
  'hasCurrentOwnerAuthority',
  'eq(dogs.ownerId, ownerUserId)',
  'resolveVerifiedRecipient',
]);
if (dbAuthority.includes('hasCurrentGuardianAuthority') ||
    dbAuthority.includes('guardianUserId: row.guardianUserId')) {
  failures.push('DB authority leaks Guardian terminology beyond the explicit Drizzle compatibility bridge');
}

const accessPolicy = requireText('backend/api/services/professional-share-access.ts', [
  'hasCurrentOwnerAuthority',
  'grant.ownerUserId',
  'OWNER_AUTHORITY_MISMATCH',
]);
if (accessPolicy.includes('hasCurrentGuardianAuthority') ||
    accessPolicy.includes('grant.guardianUserId') ||
    accessPolicy.includes('GUARDIAN_AUTHORITY_MISMATCH')) {
  failures.push('active professional-share access policy still exposes Guardian terminology');
}

requireText('backend/api/services/professional-share-recipient-read.ts', [
  'createProfessionalShareRecipientReadBoundary',
  'lockPublicationAuthority',
  "await collect({ tx, authorization: preflight })",
  ".for('share')",
  'createProfessionalShareAccessChecker(finalAuthority, clock)',
  'hasCurrentOwnerAuthority',
  'ownerUserId: row.guardianUserId',
  'recordUnavailableAudit',
]);

// The recipient-read primitive is deliberately internal until professional
// identity/binding and the concrete semantic report projection are approved.
for (const routePath of filesBelow('backend/api/routes').filter((path) => path.endsWith('.ts'))) {
  const content = read(routePath);
  if (content.includes('professional-share-recipient-read')) {
    failures.push(`${routePath}: recipient-read boundary is wired to a route before identity/report authority is approved`);
  }
}

const mobileService = read('apps/mobile/src/services/report.ts');
if (mobileService.includes('createVetReportShareLink')) {
  failures.push('mobile service still exposes createVetReportShareLink');
}

const mobileScreen = read('apps/mobile/app/settings/health-vet.tsx');
if (mobileScreen.includes('Share.share(') || mobileScreen.includes('createVetReportShareLink')) {
  failures.push('health-vet screen still exposes generic bearer-link sharing');
}
if (!mobileScreen.includes('Elle ne donne acces a aucune clinique')) {
  failures.push('health-vet screen does not explain that coarse preference is non-authorizing');
}

requireText('docs/control/EMOPET_OWNER_PROFESSIONAL_SHARING_v0.1.md', [
  'LEGACY_GENERIC_VET_REPORT_LINK = HOLD_FOR_RELEASE',
  'recipient-bound',
  'revocable',
  'G-GUARDIAN-PROFESSIONAL-SHARE-01 = OPEN',
]);

if (failures.length > 0) {
  console.error('Professional sharing authority audit FAILED:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('Professional sharing authority audit PASS.');
console.log('PASS proves static authority invariants only; it is not security/privacy validation.');
