import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('transitive subject persistence has explicit privacy classification state', async () => {
  const [lineage, inventory, coverage] = await Promise.all([
    readFile(new URL('../../config/privacy/subject-transitive-lineage.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('../../config/privacy/data-inventory.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('../../config/privacy/subject-transitive-privacy-coverage.json', import.meta.url), 'utf8').then(JSON.parse),
  ]);

  assert.equal(
    coverage.status,
    'INCOMPLETE_TRANSITIVE_SUBJECT_PERSISTENCE_PRIVACY_CLASSIFICATION',
  );
  assert.equal(coverage.mappingAuthority, 'TECHNICAL_TOPICAL_MAPPING_NOT_LEGAL_SIGNOFF');

  const expected = lineage.directChildrenOfFirstOrder.map((entry) => entry.childTable).sort();
  const covered = coverage.tables.map((entry) => entry.table).sort();
  assert.deepEqual(
    covered,
    expected,
    'every transitive subject descendant must have exactly one privacy classification state',
  );
  assert.equal(new Set(covered).size, covered.length, 'transitive privacy coverage rows must be unique');

  const parentByChild = new Map(
    lineage.directChildrenOfFirstOrder.map((entry) => [entry.childTable, entry.parentTable]),
  );
  const inventoryCategories = new Set(inventory.categories.map((category) => category.id));

  for (const entry of coverage.tables) {
    assert.equal(
      entry.parentTable,
      parentByChild.get(entry.table),
      `${entry.table} must retain its mechanical transitive parent`,
    );
    assert.ok(Array.isArray(entry.inventoryCategories));

    if (entry.classificationStatus === 'MAPPED_TO_EXISTING_PRIVACY_CATEGORY') {
      assert.ok(entry.inventoryCategories.length > 0);
      for (const category of entry.inventoryCategories) {
        assert.ok(inventoryCategories.has(category), `${entry.table} references unknown category ${category}`);
      }
      continue;
    }

    assert.equal(
      entry.classificationStatus,
      'UNCLASSIFIED_REQUIRES_PRIVACY_CLASSIFICATION',
      `${entry.table} has unsupported classification status`,
    );
    assert.deepEqual(entry.inventoryCategories, []);
    assert.ok(Array.isArray(entry.candidateAreas) && entry.candidateAreas.length > 0);
  }

  for (const table of ['behavioral_responses', 'behavioral_factor_scores']) {
    const entry = coverage.tables.find((row) => row.table === table);
    assert.equal(entry?.classificationStatus, 'UNCLASSIFIED_REQUIRES_PRIVACY_CLASSIFICATION');
    assert.equal(entry?.parentTable, 'behavioral_assessments');
  }

  assert.match(coverage.scope, /direct children/i);
  assert.ok(coverage.scopeLimitations.some((item) => item.includes('visibility state')));
  assert.ok(coverage.scopeLimitations.some((item) => item.includes('navigation hints')));
});
