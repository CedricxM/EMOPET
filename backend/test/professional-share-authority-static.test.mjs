import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

test('INT-05 backend authority guard stays independent of client composition', () => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const guard = 'scripts/security/professional-share-authority-audit.mjs';
  const result = spawnSync(process.execPath, [guard], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const source = readFileSync(new URL('../../' + guard, import.meta.url), 'utf8');
  assert.doesNotMatch(source, /apps\/mobile|apps\/web/);
});

test('INT-05 fresh-only table declaration preserves both frozen SQL provenance records', () => {
  const manifest = JSON.parse(readFileSync(new URL('../db/fresh-baseline-only-tables.json', import.meta.url)));
  assert.equal(manifest.status, 'FRESH_BASELINE_ONLY_NO_ACTIVE_MIGRATION');
  assert.equal(manifest.claimsExistingDatabaseUpgradeReady, false);
  assert.deepEqual(manifest.tables, ['professional_share_access_audits', 'professional_share_grants']);
  assert.deepEqual(manifest.historicalSqlProvenance.map((row) => row.path), [
    'backend/db/migrations/0006_professional_share_authority.sql',
    'backend/db/migrations/0009_professional_share_owner_terminology.sql',
  ]);
  for (const row of manifest.historicalSqlProvenance) {
    assert.match(row.blob, /^[a-f0-9]{40}$/);
    assert.equal(row.disposition, 'PROVENANCE_ONLY_NOT_REPLAYED');
  }
});
