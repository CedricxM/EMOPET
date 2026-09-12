import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const schemaDir = new URL('../db/schema/', import.meta.url);

function latestMatchBefore(source, pattern, endIndex, label) {
  const prefix = source.slice(0, endIndex);
  const matches = [...prefix.matchAll(pattern)];
  assert.ok(matches.length > 0, `unable to resolve ${label} before users.id reference`);
  return matches.at(-1)[1];
}

async function declaredDirectUserReferences() {
  const fileNames = (await readdir(schemaDir)).filter((name) => name.endsWith('.ts')).sort();
  const references = [];

  for (const fileName of fileNames) {
    const source = await readFile(new URL(fileName, schemaDir), 'utf8');
    for (const match of source.matchAll(/\.references\(\(\)\s*=>\s*users\.id(?:\s*,\s*\{[^}]*\})?\)/g)) {
      const table = latestMatchBefore(source, /pgTable\('([^']+)'/g, match.index, 'table');
      const column = latestMatchBefore(source, /\b\w+:\s*uuid\('([^']+)'\)/g, match.index, 'column');
      references.push({ table, column, source: `backend/db/schema/${fileName}` });
    }
  }

  return references.sort((a, b) => `${a.table}.${a.column}`.localeCompare(`${b.table}.${b.column}`));
}

test('machine-readable user subject lineage covers every direct users.id foreign key', async () => {
  const registry = JSON.parse(await readFile(
    new URL('../../config/privacy/user-subject-lineage.json', import.meta.url),
    'utf8',
  ));

  assert.equal(
    registry.status,
    'TECHNICAL_DIRECT_FK_TOPOLOGY_NOT_ERASURE_OR_DISCLOSURE_POLICY',
  );
  assert.equal(registry.subject.table, 'users');
  assert.equal(registry.subject.column, 'id');
  assert.match(registry.lifecyclePolicyStatus, /TO_CONFIRM/);

  const declared = await declaredDirectUserReferences();
  const registered = [...registry.directReferences]
    .sort((a, b) => `${a.table}.${a.column}`.localeCompare(`${b.table}.${b.column}`));

  assert.deepEqual(
    registered,
    declared,
    'every schema FK to users.id must be present in the privacy subject-lineage registry and no stale link may remain',
  );

  for (const required of [
    'auth_refresh_sessions.user_id',
    'contact_requests.requester_user_id',
    'dogs.owner_id',
    'professional_share_grants.owner_user_id',
    'research_data_consents.user_id',
  ]) {
    assert.ok(
      registered.some((entry) => `${entry.table}.${entry.column}` === required),
      `direct user lineage must include ${required}`,
    );
  }
});
