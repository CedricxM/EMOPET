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

test('INT-05 active 0013 migration preserves Model A replay provenance and final constraints', () => {
  const source = readFileSync(
    new URL('../db/migrations/0013_professional_share_authority.sql', import.meta.url),
    'utf8',
  );

  assert.match(
    source,
    /^-- EMOPET-REPLAY-PROVENANCE: original=0006_professional_share_authority\.sql; source_commit=20c8c494ecb91ea3699da38430478027288f1e35; source_blob=9ec1ebabc87c3048feb3029a9f1ac96441f4b312$/m,
  );
  assert.match(
    source,
    /^-- EMOPET-ADDITIONAL-PROVENANCE: original=0009_professional_share_owner_terminology\.sql; source_commit=37507fe3bb10dfae3a492e9eb895531cf8ebc0f9; source_blob=9ec91d597bd6cbdf3fa97591d61788a297b208b9$/m,
  );

  assert.match(source, /CREATE TABLE professional_share_grants/);
  assert.match(source, /CREATE TABLE professional_share_access_audits/);
  assert.match(source, /owner_user_id UUID NOT NULL REFERENCES users\(id\)/);
  assert.match(source, /dog_id UUID NOT NULL REFERENCES dogs\(id\)/);
  assert.match(
    source,
    /status <> 'ACTIVE' OR \(recipient_principal_id IS NOT NULL AND activated_at IS NOT NULL\)/,
  );
  assert.match(source, /jsonb_array_length\(scopes\) BETWEEN 1 AND 5/);
  assert.match(source, /VETERINARY_SUMMARY/);
  assert.match(source, /DATA_COVERAGE_AND_CONFIDENCE/);

  assert.doesNotMatch(
    source,
    /CREATE TABLE IF NOT EXISTS professional_share_/,
    'Model A migration must not silently accept a pre-existing divergent professional-share schema',
  );
  assert.doesNotMatch(source, /guardian_user_id/);
});
