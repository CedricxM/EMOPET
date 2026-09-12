import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

function key(entry) {
  return `${entry.table}.${entry.column}`;
}

function queryRegex(symbol) {
  return new RegExp(`\\.from\\(${symbol}\\)`);
}

test('dog export coverage stays aligned with dog lineage and route implementation truth', async () => {
  const [lineage, coverage, route] = await Promise.all([
    readFile(new URL('../../config/privacy/dog-subject-lineage.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('../../config/privacy/dog-export-coverage.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('../api/routes/data-export.ts', import.meta.url), 'utf8'),
  ]);

  assert.equal(coverage.status, 'PARTIAL_CURRENT_DOG_EXPORT_NOT_COMPLETE_DOG_DATA_PACKAGE');
  assert.equal(coverage.claimsCompleteDogExport, false);
  assert.equal(coverage.capabilitySignal, 'PARTIAL_CURRENT_BACKEND_PROJECTION');
  assert.match(coverage.promotionGate, /^BLOCK_COMPLETE_DOG_EXPORT_CLAIM_/);
  assert.match(coverage.rootDogProjection.status, /PARTIAL_FIELD_LEVEL_PROJECTION/);

  const canonicalLineageKeys = lineage.canonicalForeignKeys.map(key).sort();
  const canonicalCoverageKeys = coverage.canonicalForeignKeys.map(key).sort();
  assert.deepEqual(
    canonicalCoverageKeys,
    canonicalLineageKeys,
    'every canonical dogs.id relation must have an explicit dog-export coverage state',
  );
  assert.equal(new Set(canonicalCoverageKeys).size, canonicalCoverageKeys.length);

  const unconstrainedLineageKeys = lineage.unconstrainedDogIdentifiers.map(key).sort();
  const unconstrainedCoverageKeys = coverage.unconstrainedDogIdentifiers.map(key).sort();
  assert.deepEqual(
    unconstrainedCoverageKeys,
    unconstrainedLineageKeys,
    'every unconstrained dog identifier must have an explicit dog-export coverage state',
  );
  assert.equal(new Set(unconstrainedCoverageKeys).size, unconstrainedCoverageKeys.length);

  for (const entry of [...coverage.canonicalForeignKeys, ...coverage.unconstrainedDogIdentifiers]) {
    assert.ok(entry.routeSymbol, `${key(entry)} must declare routeSymbol`);
    assert.ok(entry.implementationStatus, `${key(entry)} must declare implementationStatus`);
    assert.ok(entry.projectionAuthority, `${key(entry)} must declare projectionAuthority`);
  }

  const includedCanonical = coverage.canonicalForeignKeys.filter((entry) =>
    entry.implementationStatus.startsWith('INCLUDED_CURRENT_DOG_EXPORT'),
  );
  assert.deepEqual(
    includedCanonical.map(key).sort(),
    ['baselines.dog_id', 'devices.dog_id', 'eli_states.dog_id', 'sensor_summaries.dog_id'],
  );

  for (const entry of coverage.canonicalForeignKeys) {
    const queried = queryRegex(entry.routeSymbol).test(route);
    if (entry.implementationStatus.startsWith('INCLUDED_CURRENT_DOG_EXPORT')) {
      assert.equal(queried, true, `${key(entry)} is marked included but its table is not read by data-export.ts`);
    } else {
      assert.equal(queried, false, `${key(entry)} is read by data-export.ts but coverage still says it is not included`);
    }
  }

  for (const entry of coverage.unconstrainedDogIdentifiers) {
    assert.match(entry.implementationStatus, /^NOT_IN_CURRENT_DOG_EXPORT_UNCONSTRAINED_IDENTIFIER$/);
    assert.equal(
      queryRegex(entry.routeSymbol).test(route),
      false,
      `${key(entry)} is an unconstrained dog identifier unexpectedly read by the current dog export`,
    );
  }

  assert.match(route, /dogPersistenceCoverage:\s*'PARTIAL_CURRENT_BACKEND_PROJECTION'/);
  assert.match(route, /not a complete dump of every dog-linked PostgreSQL relation/i);
  assert.match(route, /\.from\(dogs\)/);

  for (const field of coverage.rootDogProjection.includedSourceFields) {
    assert.match(route, new RegExp(`ownedDog\\.${field}\\b`), `root dog projection must still include ${field}`);
  }
  for (const field of coverage.rootDogProjection.notProjectedSourceFields) {
    assert.doesNotMatch(route, new RegExp(`ownedDog\\.${field}\\b`), `root dog coverage must be updated if ${field} becomes projected`);
  }

  const serialized = JSON.stringify(coverage);
  for (const scopeGap of ['backups', 'provider-held copies', 'object/media storage']) {
    assert.ok(serialized.includes(scopeGap), `dog export coverage must preserve known scope gap: ${scopeGap}`);
  }
});
