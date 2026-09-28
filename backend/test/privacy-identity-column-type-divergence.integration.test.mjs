import test, { after } from 'node:test';
import assert from 'node:assert/strict';

/**
 * An identity column that cannot hold a foreign key is an erasure hole, not a detail.
 *
 * config/privacy declares the erasure topology: which tables reference a user or a dog,
 * and what the database does on deletion. Measured after 0014, that declaration held on
 * the Drizzle-generated schema and not on the migration path, where dog-erasure-topology
 * declares eighteen canonical dog foreign keys and nine existed. Deleting a dog there
 * left orphan rows in nine ELI and sensor tables instead of meeting the NO ACTION wall
 * the registry describes.
 *
 * Two of the ten were simply missing constraints; 0015 adds them. The other eight are
 * missing because of what is underneath: migrations 0003 and 0004 create the column as
 * `dog_id TEXT NOT NULL` while the Drizzle schema the application compiles against
 * declares `uuid('dog_id').notNull().references(() => dogs.id)`. A foreign key from text
 * to uuid cannot exist, so the absent constraint is the symptom and the type is the
 * defect. Converting it (`ALTER COLUMN ... TYPE uuid USING col::uuid`) is a data
 * decision on fields the sensor modality contract governs, so it is inventoried here
 * rather than forced through.
 *
 * Two rules, both asserted against whichever build path DATABASE_URL points at:
 *
 *   1. every identity column whose type matches its parent key carries a foreign key —
 *      nothing that CAN be constrained is left unconstrained;
 *   2. every identity column whose type does NOT match is one of the eight already
 *      known and recorded.
 *
 * The inventory is frozen deliberately. A ninth divergence fails, and so does fixing one
 * of the eight without updating this list — which is the point: the list is the record
 * of an open decision, and it should not be able to drift in either direction unnoticed.
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

/**
 * Column names that carry a user or dog identity.
 *
 * Kept as an explicit list rather than a pattern: a pattern would quietly start or stop
 * covering columns as the schema grows, and this test's value depends on knowing exactly
 * what it looked at.
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
 * Identity columns whose type diverges from the key they are meant to reference, per build
 * path. On the hand-written sequence, eight are created as TEXT by migrations 0003 and
 * 0004 while the Drizzle schema declares them uuid with a reference — an open decision,
 * not a defect to fix here; see 0015's header. On the generated schema there are none,
 * and that emptiness is itself asserted, so a divergence appearing there fails too.
 *
 * The path is named by the caller rather than guessed. Inferring it from the schema would
 * mean deriving the expected answer from the observed one, which is no test at all.
 */
const TYPE_DIVERGENCES_BY_PATH = {
  migrations: [
    'anticipation_events.dog_id',
    'baseline_drift_monitor.dog_id',
    'dog_sub_baselines.dog_id',
    'recovery_events.dog_id',
    'routine_stability.dog_id',
    'user_config.dog_id',
    'user_config.user_id',
    'walk_quality.dog_id',
  ],
  generated: [],
};

const schemaPath = process.env.IDENTITY_SCHEMA_PATH ?? '';

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

test('every identity column that can be constrained is constrained', {
  skip: !integrationEnabled,
}, async () => {
  const rows = await identityColumns();
  assert.ok(rows.length > 0, 'no identity column found — the scan itself is broken');

  const unconstrained = rows
    .filter((row) => row.data_type === row.parent_type && row.constrained === false)
    .map((row) => `${row.table_name}.${row.column_name} -> ${row.parent_table}.id`);

  assert.deepEqual(
    unconstrained,
    [],
    'These columns have the right type and no foreign key, so erasing the parent leaves '
      + 'orphans instead of being refused:\n  ' + unconstrained.join('\n  '),
  );
});

test('the identity columns that cannot be constrained are exactly those on record for this path', {
  skip: !integrationEnabled,
}, async () => {
  assert.ok(
    Object.hasOwn(TYPE_DIVERGENCES_BY_PATH, schemaPath),
    `IDENTITY_SCHEMA_PATH must be one of ${Object.keys(TYPE_DIVERGENCES_BY_PATH).join(', ')} `
      + `(got ${schemaPath ? `"${schemaPath}"` : 'nothing'}). The expected set differs per `
      + 'build path, so the caller has to say which one it pointed DATABASE_URL at.',
  );

  const rows = await identityColumns();

  const diverging = rows
    .filter((row) => row.data_type !== row.parent_type)
    .map((row) => `${row.table_name}.${row.column_name}`)
    .sort();

  const known = [...TYPE_DIVERGENCES_BY_PATH[schemaPath]].sort();
  const unexpected = diverging.filter((name) => !known.includes(name));
  const resolved = known.filter((name) => !diverging.includes(name));

  // A new divergence is a new erasure hole. A resolved one means the open decision was
  // taken somewhere and this record went stale; either way the list must move with it.
  assert.deepEqual(
    unexpected,
    [],
    `Identity columns whose type diverges on the ${schemaPath} path and are not on record:\n  `
      + unexpected.join('\n  '),
  );
  assert.deepEqual(
    resolved,
    [],
    `These divergences are on record for the ${schemaPath} path but no longer present. If `
      + 'the type was converted, remove them from TYPE_DIVERGENCES_BY_PATH and add the '
      + 'foreign key in a migration:\n  ' + resolved.join('\n  '),
  );
});
