#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
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

requireText('packages/shared/src/validators/professional-share.ts', [
  'ProfessionalShareGrantCreateSchema',
  'Recipient must be bound to an email or verified professional principal.',
  'accessExpiresAt must be in the future.',
]);

const dogRoutes = read('backend/api/routes/dogs.ts');
for (const marker of [
  'EMOPET_ALLOW_LEGACY_GENERIC_VET_SHARE',
  'RECIPIENT_BOUND_GRANT_REQUIRED',
  'G-GUARDIAN-PROFESSIONAL-SHARE-01',
]) {
  if (!dogRoutes.includes(marker)) failures.push(`backend/api/routes/dogs.ts: missing ${marker}`);
}

if (!dogRoutes.includes("process.env['NODE_ENV'] !== 'production'")) {
  failures.push('legacy generic vet share must be impossible in production');
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
