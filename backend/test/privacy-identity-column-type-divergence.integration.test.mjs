import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * An identity column that cannot hold a foreign key is an erasure hole, not a detail.
 *
 * config/privacy declares the erasure topology: which tables reference a user or a dog,
 * what the database does on deletion, and — separately — which identifiers are carried
 * deliberately without a constraint. The declaration only means something if the database
 * actually looks like it, on both build paths.
 *
 * It did not. Measured on the hand-written migration sequence, dog-erasure-topology
 * declared eighteen canonical dog foreign keys and nine existed; nine dog identifiers were
 * unconstrained where the registry declared none. Deleting a dog left orphan rows in nine
 * ELI and sensor tables instead of meeting the NO ACTION wall the registry describes. The
 * cause was not a forgotten constraint but the column type: 0003 and 0004 created them as
 * `dog_id TEXT` while the Drizzle schema declares `uuid('dog_id').references(...)`, and a
 * foreign key from text to uuid cannot exist. Migration 0024 converted them and added the
 * constraints; 0021 and 0023 fixed the related name and copresence gaps.
 *
 * Two rules, asserted against whichever build path DATABASE_URL points at:
 *
 *   1. an identity column whose type matches its parent key either carries a foreign key
 *      or is declared unconstrained in the privacy registries — an exception has to be
 *      written down to pass, and nothing else is left unconstrained by accident;
 *   2. no identity column diverges in type from the key it references, because such a
 *      column cannot carry the constraint the topology gives it whatever anyone declares.
 *
 * The declaration is read from config/privacy rather than restated here. Restating it
 * would mean the guard agrees with itself instead of with the registry that governs.
 */

const integrationEnabled = process.env.PRIVACY_IDENTITY_COLUMN_TYPE_DB_INTEGRATION === '1';
let sql = null;

if (integrationEnabled) {
  const { default: postgresModule } = await import('postgres');
  sql = postgresModule(process.env.DATABASE_URL, { max: 1 });
}

after(async () => {
  if (sql) await sql.end({ timeout: 5 });
});

const privacyDir = resolve(process.cwd(), '..', 'config', 'privacy');
const readJson = (name) => JSON.parse(readFileSync(resolve(privacyDir, name), 'utf8'));

/**
 * Column names that carry a user or dog identity.
 *
 * An explicit list rather than a pattern: a pattern would quietly start or stop covering
 * columns as the schema grows, and this guard's worth depends on knowing what it looked at.
 */
const IDENTITY_COLUMNS = [
  'dog_id',
  'dog_a_id',
  'dog_b_id',
  'user_id',
  'owner_id',
  'respondent_user_id',
  'reporter_user_id',
  'target_user_id',
  'author_id',
  'created_by',
];

/**
 * Identity columns the registries declare as deliberately unconstrained.
 *
 * Read from both the lineage and the topology files, which a separate test already holds
 * to agreement, so an entry has to exist in the governing registry to be tolerated here.
 */
function declaredUnconstrained() {
  const files = [
    ['dog-subject-lineage.json', ['unconstrainedDogIdentifiers', 'unconstrainedGrantIdentifiers']],
    ['dog-erasure-topology.json', ['unconstrainedDogIdentifiers', 'unconstrainedGrantIdentifiers']],
    ['user-subject-lineage.json', ['unconstrainedUserIdentifiers']],
    ['account-erasure-topology.json', ['unconstrainedUserIdentifiers']],
  ];

  const declared = new Set();
  for (const [name, fields] of files) {
    const doc = readJson(name);
    for (const field of fields) {
      for (const row of doc[field] ?? []) declared.add(`${row.table}.${row.column}`);
    }
  }
  return declared;
}

/** Every identity column, with its type, its parent's key type and whether it is constrained. */
async function identityColumns() {
  return sql`
    SELECT
      c.table_name,
      c.column_name,
      c.data_type,
      CASE WHEN c.column_name IN ('dog_id', 'dog_a_id', 'dog_b_id') THEN 'dogs' ELSE 'users' END
        AS parent_table,
      (
        SELECT p.data_type
        FROM information_schema.columns p
        WHERE p.table_schema = 'public'
          AND p.table_name = CASE
            WHEN c.column_name IN ('dog_id', 'dog_a_id', 'dog_b_id') THEN 'dogs' ELSE 'users'
          END
          AND p.column_name = 'id'
      ) AS parent_type,
      EXISTS (
        SELECT 1
        FROM pg_constraint con
        JOIN pg_class child ON child.oid = con.conrelid
        JOIN pg_namespace ns ON ns.oid = child.relnamespace
        JOIN LATERAL unnest(con.conkey) child_key(attnum) ON true
        JOIN pg_attribute att
          ON att.attrelid = child.oid
         AND att.attnum = child_key.attnum
        WHERE con.contype = 'f'
          AND ns.nspname = 'public'
          AND child.relname = c.table_name
          AND att.attname = c.column_name
      ) AS constrained
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name NOT IN ('dogs', 'users')
      AND c.column_name = ANY(${IDENTITY_COLUMNS})
    ORDER BY c.table_name, c.column_name
  `;
}

test('an identity column is constrained unless the registries declare it unconstrained', {
  skip: !integrationEnabled,
}, async () => {
  const rows = await identityColumns();
  assert.ok(rows.length > 0, 'no identity column found — the scan itself is broken');

  const declared = declaredUnconstrained();
  const undeclared = rows
    .filter((row) => row.data_type === row.parent_type && row.constrained === false)
    .map((row) => `${row.table_name}.${row.column_name}`)
    .filter((name) => !declared.has(name))
    .sort();

  assert.deepEqual(
    undeclared,
    [],
    'These columns have the right type, no foreign key, and no entry in config/privacy '
      + 'declaring them unconstrained. Erasing the parent leaves orphans instead of being '
      + 'refused, and no registry says so:\n  ' + undeclared.join('\n  '),
  );
});

test('no identity column diverges in type from the key it references', {
  skip: !integrationEnabled,
}, async () => {
  const rows = await identityColumns();

  const diverging = rows
    .filter((row) => row.data_type !== row.parent_type)
    .map((row) => `${row.table_name}.${row.column_name} is ${row.data_type} `
      + `while ${row.parent_table}.id is ${row.parent_type}`)
    .sort();

  // No declaration can excuse this one. A type mismatch makes the constraint impossible,
  // so a registry that gives the column a canonical foreign key is simply wrong about the
  // database — which is exactly how nine dog references went unenforced on path A.
  assert.deepEqual(
    diverging,
    [],
    'Identity columns that cannot hold the foreign key the declared topology gives them:\n  '
      + diverging.join('\n  '),
  );
});
