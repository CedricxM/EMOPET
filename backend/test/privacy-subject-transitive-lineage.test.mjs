import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const schemaDir = new URL('../db/schema/', import.meta.url);

function firstOrderTables(userLineage, dogLineage) {
  return new Set([
    userLineage.subject.table,
    ...userLineage.directReferences.map((entry) => entry.table),
    ...(userLineage.unconstrainedUserIdentifiers ?? []).map((entry) => entry.table),
    dogLineage.subject.table,
    ...dogLineage.canonicalForeignKeys.map((entry) => entry.table),
    ...dogLineage.unconstrainedDogIdentifiers.map((entry) => entry.table),
  ]);
}

function latestMatchBefore(source, pattern, endIndex, label) {
  const prefix = source.slice(0, endIndex);
  const matches = [...prefix.matchAll(pattern)];
  assert.ok(matches.length > 0, `unable to resolve ${label} before FK reference`);
  return matches.at(-1)[1];
}

function sortEntries(entries) {
  return [...entries].sort((a, b) =>
    `${a.parentTable}.${a.childTable}.${a.column}.${a.source}`
      .localeCompare(`${b.parentTable}.${b.childTable}.${b.column}.${b.source}`),
  );
}

async function scanDirectChildrenOfFirstOrder(firstOrder) {
  const fileNames = (await readdir(schemaDir)).filter((name) => name.endsWith('.ts')).sort();
  const files = await Promise.all(fileNames.map(async (fileName) => ({
    fileName,
    source: await readFile(new URL(fileName, schemaDir), 'utf8'),
  })));

  const symbolToTable = new Map();
  for (const { source } of files) {
    for (const match of source.matchAll(/export const\s+(\w+)\s*=\s*pgTable\('([^']+)'/g)) {
      symbolToTable.set(match[1], match[2]);
    }
  }

  const descendants = [];
  for (const { fileName, source } of files) {
    for (const match of source.matchAll(/\.references\(\(\)\s*=>\s*(\w+)\.id(?:\s*,\s*\{[^}]*\})?\)/g)) {
      const parentTable = symbolToTable.get(match[1]);
      if (!parentTable || !firstOrder.has(parentTable)) continue;

      const childTable = latestMatchBefore(source, /pgTable\('([^']+)'/g, match.index, 'child table');
      if (firstOrder.has(childTable)) continue;

      const column = latestMatchBefore(
        source,
        /\b\w+:\s*\w+\('([^']+)'/g,
        match.index,
        'child FK column',
      );
      descendants.push({
        parentTable,
        childTable,
        column,
        source: `backend/db/schema/${fileName}`,
      });
    }
  }

  return sortEntries(descendants);
}

test('transitive subject lineage captures every direct FK child of first-order subject persistence', async () => {
  const [userLineage, dogLineage, registry] = await Promise.all([
    readFile(new URL('../../config/privacy/user-subject-lineage.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('../../config/privacy/dog-subject-lineage.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('../../config/privacy/subject-transitive-lineage.json', import.meta.url), 'utf8').then(JSON.parse),
  ]);

  assert.equal(
    registry.status,
    'TECHNICAL_TRANSITIVE_SUBJECT_LINEAGE_NOT_ERASURE_OR_DISCLOSURE_POLICY',
  );

  const firstOrder = firstOrderTables(userLineage, dogLineage);
  const declared = await scanDirectChildrenOfFirstOrder(firstOrder);
  assert.deepEqual(
    sortEntries(registry.directChildrenOfFirstOrder),
    declared,
    'every non-first-order table with a direct FK to first-order subject persistence must be registered and no stale descendant may remain',
  );

  const keys = registry.directChildrenOfFirstOrder.map((entry) =>
    `${entry.parentTable}.${entry.childTable}.${entry.column}`,
  );
  assert.equal(new Set(keys).size, keys.length, 'transitive lineage entries must be unique');

  for (const child of ['behavioral_responses', 'behavioral_factor_scores']) {
    assert.ok(
      registry.directChildrenOfFirstOrder.some((entry) =>
        entry.parentTable === 'behavioral_assessments' && entry.childTable === child,
      ),
      `${child} must remain visible as a transitive behavioral-assessment descendant`,
    );
  }

  const serialized = JSON.stringify(registry);
  assert.ok(serialized.includes('one FK hop'));
  assert.ok(serialized.includes('does not establish disclosure'));
});
