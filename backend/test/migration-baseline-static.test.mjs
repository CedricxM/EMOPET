import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const dbDir = join(here, '..', 'db');
const schemaDir = join(dbDir, 'schema');
const migrationsDir = join(dbDir, 'migrations');
const draftDir = join(dbDir, 'baseline-draft');
const p0WorkflowPath = join(here, '..', '..', '.github', 'workflows', 'p0-db-baseline.yml');

function read(path) {
  return readFileSync(path, 'utf8');
}

function schemaTableNames() {
  const names = new Set();
  for (const file of readdirSync(schemaDir).filter((name) => name.endsWith('.ts'))) {
    const source = read(join(schemaDir, file));
    const re = /pgTable\(\s*['"]([^'"]+)['"]/g;
    for (const match of source.matchAll(re)) names.add(match[1]);
  }
  return names;
}

function sqlEvents(sql) {
  const events = [];
  const createRe = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?([a-zA-Z0-9_]+)"?)/gi;
  const alterRe = /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:"?([a-zA-Z0-9_]+)"?)/gi;

  for (const match of sql.matchAll(createRe)) {
    events.push({ index: match.index ?? 0, type: 'create', table: match[1] });
  }
  for (const match of sql.matchAll(alterRe)) {
    events.push({ index: match.index ?? 0, type: 'alter', table: match[1] });
  }

  return events.sort((a, b) => a.index - b.index);
}


function activeMigrationPrefixes() {
  return readdirSync(migrationsDir)
    .filter((name) => /^\d+.*\.sql$/.test(name))
    .sort()
    .map((name) => ({
      name,
      path: join(migrationsDir, name),
      prefix: Number.parseInt(name.match(/^(\d+)/)?.[1] ?? '', 10),
    }));
}

function orderedSqlSources() {
  const draftFiles = readdirSync(draftDir)
    .filter((name) => /^\d+.*\.sql$/.test(name))
    .sort();
  const migrationFiles = readdirSync(migrationsDir)
    .filter((name) => /^\d+.*\.sql$/.test(name))
    .sort();

  return [
    ...draftFiles.map((name) => ({ name: `DRAFT:${name}`, path: join(draftDir, name) })),
    ...migrationFiles.map((name) => ({ name, path: join(migrationsDir, name) })),
  ];
}

test('draft baseline plus historical migrations define every current Drizzle table name', () => {
  const expected = schemaTableNames();
  const created = new Set();

  for (const source of orderedSqlSources()) {
    for (const event of sqlEvents(read(source.path))) {
      if (event.type === 'create') created.add(event.table);
    }
  }

  const missing = [...expected].filter((table) => !created.has(table)).sort();
  assert.deepEqual(
    missing,
    [],
    `Current Drizzle tables without any CREATE TABLE in draft+history: ${missing.join(', ')}`,
  );
});

test('every ALTER TABLE target exists earlier in the draft+historical SQL sequence', () => {
  const created = new Set();
  const violations = [];

  for (const source of orderedSqlSources()) {
    for (const event of sqlEvents(read(source.path))) {
      if (event.type === 'create') {
        created.add(event.table);
        continue;
      }

      if (!created.has(event.table)) {
        violations.push(`${source.name}: ALTER TABLE ${event.table} before CREATE TABLE`);
      }
    }
  }

  assert.deepEqual(violations, [], violations.join('\n'));
});

test('all candidate draft SQL stays outside the active migrations directory', () => {
  const activeFiles = new Set(readdirSync(migrationsDir));
  const draftFiles = readdirSync(draftDir).filter((name) => name.endsWith('.sql'));

  for (const file of draftFiles) {
    assert.equal(activeFiles.has(file), false, `${file} must remain outside db/migrations`);
  }
});


test('active migration numeric prefixes are unique', () => {
  const migrations = activeMigrationPrefixes();
  const seen = new Map();
  const duplicates = [];

  for (const migration of migrations) {
    const previous = seen.get(migration.prefix);
    if (previous) duplicates.push(`${previous} and ${migration.name} share prefix ${migration.prefix}`);
    else seen.set(migration.prefix, migration.name);
  }

  assert.deepEqual(duplicates, [], duplicates.join('\n'));
});

test('active migration numeric prefixes are contiguous from 0001', () => {
  const migrations = activeMigrationPrefixes();
  const actual = migrations.map((migration) => migration.prefix);
  const expected = Array.from({ length: actual.length }, (_, index) => index + 1);

  assert.deepEqual(
    actual,
    expected,
    `Active migration prefixes must be contiguous from 0001; found: ${migrations.map((migration) => migration.name).join(', ')}`,
  );
});


test('replayed or renumbered active migrations retain frozen-source provenance', () => {
  const marker = /^-- EMOPET-REPLAY-PROVENANCE:\s*original=(\d+_[^;\s]+\.sql);\s*source_commit=([0-9a-f]{40});\s*source_blob=([0-9a-f]{40})\s*$/m;

  for (const migration of activeMigrationPrefixes()) {
    const source = read(migration.path);
    const mentionsReplay = /^-- EMOPET-REPLAY-PROVENANCE:/m.test(source);

    if (!mentionsReplay) continue;

    const match = source.match(marker);
    assert.ok(
      match,
      `${migration.name}: replay provenance must record original filename, 40-char source commit, and 40-char source blob`,
    );

    const originalPrefix = Number.parseInt(match[1].match(/^(\d+)/)?.[1] ?? '', 10);
    assert.notEqual(
      originalPrefix,
      migration.prefix,
      `${migration.name}: replay provenance is only for a migration whose active number differs from its frozen source number`,
    );
  }
});

test('P0 database workflow replays the complete active migration directory on both disposable databases', () => {
  const workflow = read(p0WorkflowPath);
  const dynamicReplay = "find backend/db/migrations -maxdepth 1 -type f -name '*.sql' | sort";
  const occurrences = workflow.split(dynamicReplay).length - 1;

  assert.equal(
    occurrences,
    2,
    'P0 workflow must dynamically replay every active migration on both disposable databases',
  );
  assert.equal(
    /-f backend\/db\/migrations\/000\d_/.test(workflow),
    false,
    'P0 workflow must not freeze migration coverage to a hard-coded prefix list',
  );
});
