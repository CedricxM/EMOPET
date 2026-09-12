import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

function firstOrderSubjectTables(userLineage, dogLineage) {
  return [...new Set([
    userLineage.subject.table,
    ...userLineage.directReferences.map((entry) => entry.table),
    ...(userLineage.unconstrainedUserIdentifiers ?? []).map((entry) => entry.table),
    dogLineage.subject.table,
    ...dogLineage.canonicalForeignKeys.map((entry) => entry.table),
    ...dogLineage.unconstrainedDogIdentifiers.map((entry) => entry.table),
  ])].sort();
}

test('first-order subject persistence has explicit privacy inventory classification or visible unclassified status', async () => {
  const [userLineage, dogLineage, inventory, coverage] = await Promise.all([
    readFile(new URL('../../config/privacy/user-subject-lineage.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('../../config/privacy/dog-subject-lineage.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('../../config/privacy/data-inventory.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('../../config/privacy/subject-persistence-privacy-coverage.json', import.meta.url), 'utf8').then(JSON.parse),
  ]);

  assert.equal(
    coverage.status,
    'INCOMPLETE_FIRST_ORDER_SUBJECT_PERSISTENCE_PRIVACY_CLASSIFICATION',
  );
  assert.equal(coverage.mappingAuthority, 'TECHNICAL_TOPICAL_MAPPING_NOT_LEGAL_SIGNOFF');
  assert.match(coverage.promotionGate, /^BLOCK_PRIVACY_INVENTORY_COMPLETENESS_CLAIM_/);

  const expectedTables = firstOrderSubjectTables(userLineage, dogLineage);
  const coveredTables = coverage.tables.map((entry) => entry.table).sort();
  assert.deepEqual(
    coveredTables,
    expectedTables,
    'every first-order user/dog subject-linked persistence table must have exactly one privacy classification state',
  );
  assert.equal(new Set(coveredTables).size, coveredTables.length, 'coverage table rows must be unique');

  const inventoryCategories = new Set(inventory.categories.map((category) => category.id));
  let mapped = 0;
  let unclassified = 0;

  for (const entry of coverage.tables) {
    assert.ok(Array.isArray(entry.inventoryCategories), `${entry.table} must declare inventoryCategories`);

    if (entry.classificationStatus === 'MAPPED_TO_EXISTING_PRIVACY_CATEGORY') {
      mapped += 1;
      assert.ok(entry.inventoryCategories.length > 0, `${entry.table} mapped status requires an inventory category`);
      for (const category of entry.inventoryCategories) {
        assert.ok(
          inventoryCategories.has(category),
          `${entry.table} references unknown privacy inventory category ${category}`,
        );
      }
      assert.equal(
        Object.hasOwn(entry, 'candidateAreas'),
        false,
        `${entry.table} is already mapped and must not carry speculative candidateAreas`,
      );
      continue;
    }

    assert.equal(
      entry.classificationStatus,
      'UNCLASSIFIED_REQUIRES_PRIVACY_CLASSIFICATION',
      `${entry.table} has an unsupported classificationStatus`,
    );
    unclassified += 1;
    assert.deepEqual(entry.inventoryCategories, [], `${entry.table} must not smuggle an unapproved category mapping`);
    assert.ok(
      Array.isArray(entry.candidateAreas) && entry.candidateAreas.length > 0,
      `${entry.table} must explain the technical area that still needs privacy classification`,
    );
  }

  assert.ok(mapped > 0, 'coverage must retain already mapped persistence families');
  assert.ok(unclassified > 0, 'coverage must remain visibly incomplete while privacy classification gaps exist');

  const byTable = new Map(coverage.tables.map((entry) => [entry.table, entry]));
  for (const [table, category] of [
    ['users', 'account'],
    ['dogs', 'dog_profile'],
    ['devices', 'device_metadata'],
    ['sensor_summaries', 'sensor_preprocessed'],
    ['eli_states', 'eli_inferred'],
    ['health_entries', 'health_records'],
    ['contact_requests', 'support_contact'],
    ['posts', 'community'],
  ]) {
    assert.equal(byTable.get(table)?.classificationStatus, 'MAPPED_TO_EXISTING_PRIVACY_CATEGORY');
    assert.ok(byTable.get(table)?.inventoryCategories.includes(category), `${table} must remain mapped to ${category}`);
  }

  for (const table of [
    'subscriptions',
    'auth_refresh_sessions',
    'behavioral_assessments',
    'research_data_consents',
    'professional_share_grants',
    'baselines',
    'eli_behavioral_priors',
  ]) {
    assert.equal(
      byTable.get(table)?.classificationStatus,
      'UNCLASSIFIED_REQUIRES_PRIVACY_CLASSIFICATION',
      `${table} must remain an explicit inventory gap until privacy classification is approved`,
    );
  }

  const serialized = JSON.stringify(coverage);
  assert.ok(serialized.includes('transitive descendants'));
  assert.ok(serialized.includes('does not establish legal basis'));
});
