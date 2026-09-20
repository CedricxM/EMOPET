import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

test('mobile vet sharing cannot fabricate generic bearer-link authority', () => {
  const service = read('../../apps/mobile/src/services/report.ts');
  const screen = read('../../apps/mobile/app/settings/health-vet.tsx');

  for (const forbidden of [
    'createVetReportShareLink',
    '/vet-report-link',
    '/vet-report?days=',
    'expiresInMinutes',
    'share_token',
    'demo-dog',
  ]) {
    assert.equal(service.includes(forbidden), false, `service must not contain ${forbidden}`);
    assert.equal(screen.includes(forbidden), false, `screen must not contain ${forbidden}`);
  }

  assert.equal(screen.includes('Share.share('), false);
  assert.match(service, /PROFESSIONAL_SHARE_STATUS\s*=\s*'RECIPIENT_BOUND_GRANT_REQUIRED'/);
  assert.match(screen, /Elle ne donne acces a aucune clinique/);
  assert.match(screen, /Acces nominatif en preparation/);
  assert.match(screen, /disabled accessibilityState=\{\{ disabled: true \}\}/);
});
