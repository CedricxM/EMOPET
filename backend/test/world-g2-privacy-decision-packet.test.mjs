import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const packet = JSON.parse(
  await readFile(
    new URL('../../config/world/world-g2-privacy-decision-packet-v1.json', import.meta.url),
    'utf8',
  ),
);

test('G2 privacy decision packet cannot silently promote authority', () => {
  assert.equal(packet.status, 'HUMAN_DECISION_REQUIRED_NOT_APPROVED');
  assert.equal(packet.productionAuthority, false);
  assert.equal(packet.privacyLegalAuthority, false);

  for (const decision of packet.decisions) {
    assert.equal(decision.required, true);
    assert.equal(decision.approved, false);
    assert.ok(decision.options.length >= 2, `${decision.id} must expose real alternatives`);
    assert.ok(
      decision.options.some((option) => option.value === decision.technicalRecommendation),
      `${decision.id} technical recommendation must remain one explicit option, not hidden policy`,
    );
  }

  for (const value of Object.values(packet.claims)) {
    assert.equal(value, false);
  }
});

test('decision packet covers erasure, export, retention and legacy non-SQL cutover', () => {
  assert.deepEqual(
    packet.decisions.map((decision) => decision.id).sort(),
    [
      'legacy-browser-cutover',
      'world-erasure-disposition',
      'world-owner-export-treatment',
      'world-retention',
    ],
  );

  assert.deepEqual(
    [...packet.auditedScope].sort(),
    [
      'world_owned_items',
      'world_progression_events',
      'world_resource_spends',
    ],
  );
});

test('technical recommendation does not invent a post-account retention duration', () => {
  assert.equal(
    packet.technicalRecommendation.retention,
    'WHILE_ACTIVE_ACCOUNT_NO_SEPARATE_POST_ACCOUNT_ARCHIVE_BY_DEFAULT',
  );

  const retention = packet.decisions.find((decision) => decision.id === 'world-retention');
  assert.ok(retention);
  assert.equal(
    retention.technicalRecommendation,
    'WHILE_ACTIVE_ACCOUNT_THEN_ERASURE_DISPOSITION',
  );

  const fixed = retention.options.find((option) => option.value === 'FIXED_POST_ACCOUNT_WINDOW');
  assert.ok(fixed);
  assert.match(fixed.technicalImpact, /specific justified duration/i);
});

test('legacy localStorage is never accepted as direct reward evidence', () => {
  const legacy = packet.decisions.find((decision) => decision.id === 'legacy-browser-cutover');
  assert.ok(legacy);

  assert.equal(
    legacy.technicalRecommendation,
    'EXCLUDE_FROM_G2_AND_RETIRE_SEPARATELY',
  );

  const migration = legacy.options.find(
    (option) => option.value === 'MIGRATE_VERIFIED_ELIGIBLE_ACTIONS_ONLY',
  );
  assert.ok(migration);
  assert.match(migration.technicalImpact, /canonical server-side evidence/i);
  assert.match(migration.technicalImpact, /localStorage alone is insufficient evidence/i);
});

test('approval maps to concrete active privacy surfaces rather than vague follow-up', () => {
  const files = Object.values(packet.implementationFilesAfterApproval).flat();

  for (const required of [
    'config/privacy/erasure-disposition-matrix.json',
    'config/privacy/account-erasure-topology.json',
    'backend/api/services/erasure-residue-verification.ts',
    'backend/api/services/data-export-policy.ts',
    'config/privacy/data-inventory.json',
    'config/privacy/retention-schedule.json',
    'backend/api/services/subject-discovery.ts',
    'config/privacy/non-sql-erasure-surface-inventory.json',
  ]) {
    assert.equal(files.includes(required), true, `missing implementation target ${required}`);
  }
});
