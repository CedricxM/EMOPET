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

requireText('packages/shared/src/types/professional-share.ts', [
  'ProfessionalShareGrant',
  'recipient: ProfessionalShareRecipient',
  'scopes: ProfessionalShareScope[]',
  'accessExpiresAt',
  'REVOKED',
]);

const shareValidators = requireText('packages/shared/src/validators/professional-share.ts', [
  'ProfessionalShareGrantCreateSchema',
  'OwnerProfessionalShareGrantCreateSchema',
  'OwnerProfessionalShareGrantRevokeSchema',
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

const dogRoutes = requireText('backend/api/routes/dogs.ts', [
  'EMOPET_ALLOW_LEGACY_GENERIC_VET_SHARE',
  'RECIPIENT_BOUND_GRANT_REQUIRED',
  // Historical gate identifier remains stable until the evidence/docs migration in #245 Phase C/D.
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

requireText('backend/db/schema/professional-sharing.ts', [
  "pgTable('professional_share_grants'",
  "pgTable('professional_share_access_audits'",
  'recipientPrincipalId',
  'accessExpiresAt',
  "'PENDING','ACTIVE','EXPIRED','REVOKED','SUSPENDED'",
]);

requireText('backend/db/migrations/0006_professional_share_authority.sql', [
  'CREATE TABLE IF NOT EXISTS professional_share_grants',
  'CREATE TABLE IF NOT EXISTS professional_share_access_audits',
  'recipient_principal_id',
  'access_expires_at',
]);

requireText('backend/api/services/professional-share-db-authority.ts', [
  'createProfessionalShareDbAuthority',
  'professionalShareAccessAudits',
  // Legacy persisted identifier; #245 Phase C owns its eventual schema migration.
  'eq(dogs.ownerId, guardianUserId)',
  'resolveVerifiedRecipient',
]);

requireText('backend/api/services/professional-share-recipient-read.ts', [
  'createProfessionalShareRecipientReadBoundary',
  'lockPublicationAuthority',
  "await collect({ tx, authorization: preflight })",
  ".for('share')",
  'createProfessionalShareAccessChecker(finalAuthority, clock)',
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

// Historical control filename/gate ID are retained until #245 Phase D migrates
// evidence references without rewriting the historical record.
requireText('docs/control/EMOPET_GUARDIAN_PROFESSIONAL_SHARING_v0.1.md', [
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
