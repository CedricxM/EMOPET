import test, { after } from 'node:test';
import assert from 'node:assert/strict';

/**
 * A second foreign key on the same column silently re-blocks an approved detach.
 *
 * Migrations 0006, 0008 and 0009 implemented the approved D1-D4 decision that identity
 * references detach on account erasure instead of blocking it. Each dropped the
 * constraint under its Drizzle-convention name and re-added it with ON DELETE SET NULL.
 * The draft baseline had created those foreign keys under PostgreSQL's own generated
 * name, so the DROP matched nothing, the ADD created a second constraint, and both
 * survived: one NO ACTION, one SET NULL.
 *
 * PostgreSQL enforces every foreign key. The residual NO ACTION constraint therefore
 * refuses the very deletion SET NULL was added to permit — measured on a database built
 * from the migration sequence, erasing a user who is a respondent on a behavioural
 * assessment was rejected outright. Migration 0014 retires the five duplicates.
 *
 * This test is the guard, not the fix. A duplicate foreign key produces no error, no
 * warning and no schema-diff noise; it only shows up the day an erasure is refused. It
 * is invisible to the registry-comparison tests too, which check that the relations the
 * privacy configuration lists are present with the delete action it states — an extra
 * constraint on top of a correct one can pass that reading. So the rule is asserted
 * directly against the catalogue: at most one foreign key per (child columns -> parent
 * columns) pair, on whichever build path the caller points DATABASE_URL at.
 */

const integrationEnabled = process.env.PRIVACY_DUPLICATE_FK_DB_INTEGRATION === '1';
let sql = null;

if (integrationEnabled) {
  const { default: postgresModule } = await import('postgres');
  sql = postgresModule(process.env.DATABASE_URL, { max: 1 });
}

after(async () => {
  if (sql) await sql.end({ timeout: 5 });
});

/** Groups every public foreign key by the exact column pair it constrains. */
async function foreignKeyGroups() {
  return sql`
    SELECT
      child.relname AS child_table,
      string_agg(DISTINCT child_att.attname, ',' ORDER BY child_att.attname) AS child_columns,
      parent.relname AS parent_table,
      count(DISTINCT con.oid) AS constraint_count,
      string_agg(
        DISTINCT con.conname || ' (' || (
          CASE con.confdeltype
            WHEN 'a' THEN 'NO ACTION'
            WHEN 'r' THEN 'RESTRICT'
            WHEN 'c' THEN 'CASCADE'
            WHEN 'n' THEN 'SET NULL'
            WHEN 'd' THEN 'SET DEFAULT'
            ELSE con.confdeltype::text
          END
        ) || ')',
        ', '
      ) AS constraints,
      count(DISTINCT con.confdeltype) AS distinct_delete_actions
    FROM pg_constraint con
    JOIN pg_class child ON child.oid = con.conrelid
    JOIN pg_namespace child_ns ON child_ns.oid = child.relnamespace
    JOIN pg_class parent ON parent.oid = con.confrelid
    JOIN pg_namespace parent_ns ON parent_ns.oid = parent.relnamespace
    JOIN LATERAL unnest(con.conkey) child_key(attnum) ON true
    JOIN pg_attribute child_att
      ON child_att.attrelid = child.oid
     AND child_att.attnum = child_key.attnum
    WHERE con.contype = 'f'
      AND child_ns.nspname = 'public'
      AND parent_ns.nspname = 'public'
    GROUP BY child.relname, parent.relname, con.conkey, con.confkey
    ORDER BY child.relname, parent.relname
  `;
}

test('no column carries two foreign keys to the same target', {
  skip: !integrationEnabled,
}, async () => {
  const duplicates = (await foreignKeyGroups())
    .filter((row) => Number(row.constraint_count) > 1)
    .map((row) => `${row.child_table}(${row.child_columns}) -> ${row.parent_table}: ${row.constraints}`);

  assert.deepEqual(
    duplicates,
    [],
    'Duplicate foreign keys. The strictest delete action wins, so a residual NO ACTION '
      + 'constraint next to a SET NULL one blocks the detach the SET NULL was added for:\n  '
      + duplicates.join('\n  '),
  );
});

test('the identity references the privacy decisions detach really detach', {
  skip: !integrationEnabled,
}, async () => {
  // These four are the D1-D4 relations that migrations 0006, 0008 and 0009 converted, and
  // the ones a duplicate constraint silently reverted. Asserting the effective action
  // rather than the presence of a named constraint is the point: a correct constraint
  // plus a wrong one reads as correct if you only look for the correct one.
  const expected = [
    ['auth_refresh_sessions', 'user_id'],
    ['behavioral_assessments', 'respondent_user_id'],
    ['communities', 'created_by'],
    ['community_events', 'created_by'],
    ['community_reports', 'reporter_user_id'],
  ];

  const groups = await foreignKeyGroups();
  const failures = [];

  for (const [table, column] of expected) {
    const matching = groups.filter(
      (row) => row.child_table === table
        && row.child_columns === column
        && row.parent_table === 'users',
    );

    if (matching.length === 0) {
      failures.push(`${table}.${column} has no foreign key to users at all`);
      continue;
    }

    for (const row of matching) {
      if (!row.constraints.includes('(SET NULL)') || Number(row.distinct_delete_actions) > 1) {
        failures.push(`${table}.${column} -> users: ${row.constraints}`);
      }
    }
  }

  assert.deepEqual(
    failures,
    [],
    `Approved detach semantics are not in force:\n  ${failures.join('\n  ')}`,
  );
});
