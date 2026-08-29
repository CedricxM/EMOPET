import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const dbDir = join(here, '..', 'db');
const schemaDir = join(dbDir, 'schema');
const migrationsDir = join(dbDir, 'migrations');
const draftBaseline = join(dbDir, 'baseline-draft', '0000_core_baseline.sql');

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

function orderedSqlSources() {
  const migrationFiles = readdirSync(migrationsDir)
    .filter((name) => /^\d+.*\.sql$/.test(name))
    .sort();

  return [
    { name: 'DRAFT:0000_core_baseline.sql', path: draftBaseline },
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

test('draft baseline stays outside the active migrations directory', () => {
  const activeFiles = readdirSync(migrationsDir);
  assert.equal(activeFiles.includes('0000_core_baseline.sql'), false);
});
