import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import postgres from 'postgres';

const integrationEnabled = process.env.PRIVACY_TOPOLOGY_DB_INTEGRATION === '1';
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

const userLineage = readJson('user-subject-lineage.json');
const dogLineage = readJson('dog-subject-lineage.json');
const accountTopology = readJson('account-erasure-topology.json');
const dogTopology = readJson('dog-erasure-topology.json');
const matrix = readJson('erasure-disposition-matrix.json');
const residue = readJson('erasure-residue-verification-contract.json');
const coverage = readJson('subject-persistence-privacy-coverage.json');
const inventory = readJson('data-inventory.json');

function sorted(values) {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function relationKey(root, type, row) {
  return `${root}|${type}|${row.table}|${row.column}`;
}

test('PRIV-ERASURE-TOPOLOGY static controls remain fail closed', () => {
  assert.equal(accountTopology.claimsCompleteAccountErasure, false);
  assert.equal(accountTopology.claimsExecutableErasure, false);
  assert.equal(dogTopology.claimsCompleteDogErasure, false);
  assert.equal(dogTopology.claimsExecutableErasure, false);
  assert.equal(matrix.claimsCompleteErasure, false);
  assert.equal(matrix.claimsExecutableErasure, false);
  assert.equal(residue.claimsCompleteErasure, false);
  assert.equal(residue.claimsExecutableErasure, false);

  assert.equal(
    residue.status,
    'RELATIONAL_NEGATIVE_RESIDUE_IMPLEMENTED_NON_SQL_PENDING',
  );
  for (const key of residue.snapshotKeys) {
    assert.equal(key.captureStatus, 'IMPLEMENTED_READ_ONLY');
  }
  for (const route of residue.relationProbeRoutes) {
    assert.equal(route.probeStatus, 'IMPLEMENTED_READ_ONLY');
  }
  assert.equal(
    residue.implementationEvidence.service,
    'backend/api/services/erasure-residue-verification.ts',
  );
  assert.equal(
    residue.implementationEvidence.integrationTest,
    'backend/test/privacy-erasure-residue-verification.integration.test.mjs',
  );

  assert.deepEqual(
    userLineage.directReferences.map((row) => `${row.table}.${row.column}`).sort(),
    accountTopology.directUserReferences.map((row) => `${row.table}.${row.column}`).sort(),
    'user lineage and account topology must enumerate the same direct relations',
  );
  assert.deepEqual(
    dogLineage.canonicalForeignKeys.map((row) => `${row.table}.${row.column}`).sort(),
    dogTopology.canonicalForeignKeys.map((row) => `${row.table}.${row.column}`).sort(),
    'dog lineage and dog topology must enumerate the same canonical relations',
  );
  assert.deepEqual(
    dogLineage.unconstrainedDogIdentifiers.map((row) => `${row.table}.${row.column}`).sort(),
    dogTopology.unconstrainedDogIdentifiers.map((row) => `${row.table}.${row.column}`).sort(),
    'dog lineage and topology must enumerate the same unconstrained dog identifiers',
  );

  assert.deepEqual(
    (dogLineage.unconstrainedGrantIdentifiers ?? []).map((row) => `${row.table}.${row.column}`).sort(),
    (dogTopology.unconstrainedGrantIdentifiers ?? []).map((row) => `${row.table}.${row.column}`).sort(),
    'dog lineage and topology must enumerate the same unconstrained grant identifiers',
  );

  const approvedDetaches = new Set([
    'users.id|DIRECT_FK|behavioral_assessments|respondent_user_id',
    'users.id|DIRECT_FK|communities|created_by',
    'users.id|DIRECT_FK|community_events|created_by',
    'users.id|DIRECT_FK|community_reports|reporter_user_id',
  ]);
  for (const row of matrix.entries) {
    const key = relationKey(row.subjectRoot, row.relationType, row);
    if (approvedDetaches.has(key)) {
      assert.equal(row.disposition, 'DETACH');
      assert.equal(row.executionStatus, 'IMPLEMENTED');
      assert.notEqual(row.testEvidence, 'NONE');
    } else {
      assert.equal(row.disposition, 'TO_CONFIRM');
      assert.equal(row.executionStatus, 'NOT_IMPLEMENTED');
      assert.equal(row.testEvidence, 'NONE');
    }
  }
  for (const surface of matrix.nonSqlSurfaces) {
    assert.equal(surface.disposition, 'TO_CONFIRM');
    assert.equal(surface.executionStatus, 'NOT_IMPLEMENTED');
  }
  for (const probe of residue.nonSqlProbes) {
    assert.equal(probe.probeStatus, 'NOT_IMPLEMENTED');
  }

  const expectedMatrix = [
    ...accountTopology.directUserReferences.map((row) => relationKey('users.id', 'DIRECT_FK', row)),
    ...dogTopology.canonicalForeignKeys.map((row) => relationKey('dogs.id', 'DIRECT_FK', row)),
    ...dogTopology.unconstrainedDogIdentifiers.map((row) => relationKey('dogs.id', 'UNCONSTRAINED_IDENTIFIER', row)),
    ...(dogTopology.unconstrainedGrantIdentifiers ?? []).map((row) => (
      relationKey(row.references, 'UNCONSTRAINED_IDENTIFIER', row)
    )),
    ...dogTopology.transitiveDescendants.map((row) => relationKey('dogs.id', 'TRANSITIVE_FK', row)),
  ];
  const actualMatrix = matrix.entries.map((row) => relationKey(row.subjectRoot, row.relationType, row));
  assert.deepEqual(sorted(actualMatrix), sorted(expectedMatrix), 'disposition matrix must exactly cover relational topology');

  const inventoryIds = new Set(inventory.categories.map((category) => category.id));
  const expectedFirstOrderTables = new Set([
    'users',
    'dogs',
    ...accountTopology.directUserReferences.map((row) => row.table),
    ...dogTopology.canonicalForeignKeys.map((row) => row.table),
    ...dogTopology.unconstrainedDogIdentifiers.map((row) => row.table),
  ]);
  assert.deepEqual(
    sorted(coverage.tables.map((row) => row.table)),
    sorted(expectedFirstOrderTables),
    'privacy coverage must exactly cover first-order subject persistence',
  );

  const unclassified = [];
  for (const row of coverage.tables) {
    assert.ok(
      ['MAPPED_TO_EXISTING_PRIVACY_CATEGORY', 'UNCLASSIFIED_REQUIRES_PRIVACY_CLASSIFICATION'].includes(row.classificationStatus),
    );
    if (row.classificationStatus === 'MAPPED_TO_EXISTING_PRIVACY_CATEGORY') {
      assert.ok(row.inventoryCategories.length > 0);
      for (const category of row.inventoryCategories) {
        assert.ok(inventoryIds.has(category), `unknown privacy category ${category} for ${row.table}`);
      }
    } else {
      unclassified.push(row.table);
      assert.deepEqual(row.inventoryCategories, []);
    }
  }
  assert.deepEqual(
    sorted(unclassified),
    sorted([
      'research_data_consents',
      'subscriptions',
    ]),
    'only genuinely ambiguous product/legal lifecycle classifications should remain open',
  );

  const mappedByTable = Object.fromEntries(coverage.tables.map((row) => [row.table, row]));
  for (const [table, category] of [
    ['baselines', 'sensor_preprocessed'],
    ['dog_sub_baselines', 'sensor_preprocessed'],
    ['baseline_drift_monitor', 'sensor_preprocessed'],
    ['anticipation_events', 'eli_inferred'],
    ['recovery_events', 'eli_inferred'],
    ['routine_stability', 'eli_inferred'],
    ['walk_quality', 'eli_inferred'],
    ['eli_behavioral_priors', 'eli_inferred'],
    ['achievements', 'account'],
    ['auth_refresh_sessions', 'account'],
    ['copresence_events', 'location'],
    ['ai_messages', 'ai_messages'],
  ]) {
    assert.equal(mappedByTable[table].classificationStatus, 'MAPPED_TO_EXISTING_PRIVACY_CATEGORY');
    assert.deepEqual(mappedByTable[table].inventoryCategories, [category]);
    assert.equal(typeof mappedByTable[table].mappingRationale, 'string');
    assert.ok(mappedByTable[table].mappingRationale.length > 0);
  assert.equal(mappedByTable.behavioral_assessments.classificationStatus, 'MAPPED_TO_EXISTING_PRIVACY_CATEGORY');
  assert.deepEqual(
    mappedByTable.behavioral_assessments.inventoryCategories,
    ['behavioral_assessment_product', 'research_validation'],
  );
  assert.match(mappedByTable.behavioral_assessments.mappingRationale, /administration_mode='research'/);
  assert.match(mappedByTable.behavioral_assessments.mappingRationale, /product rows/);

  assert.equal(mappedByTable.professional_share_grants.classificationStatus, 'MAPPED_TO_EXISTING_PRIVACY_CATEGORY');
  assert.deepEqual(mappedByTable.professional_share_grants.inventoryCategories, ['professional_sharing']);
  assert.match(mappedByTable.professional_share_grants.mappingRationale, /recipient binding\/contact/);

  assert.equal(mappedByTable.professional_share_access_audits.classificationStatus, 'MAPPED_TO_EXISTING_PRIVACY_CATEGORY');
  assert.deepEqual(
    mappedByTable.professional_share_access_audits.inventoryCategories,
    ['professional_sharing', 'security_logs'],
  );
  assert.match(mappedByTable.professional_share_access_audits.mappingRationale, /security-log/);

  assert.equal(mappedByTable.user_config.classificationStatus, 'MAPPED_TO_EXISTING_PRIVACY_CATEGORY');
  assert.deepEqual(mappedByTable.user_config.inventoryCategories, ['account', 'dog_profile']);
  assert.equal(typeof mappedByTable.user_config.mappingRationale, 'string');

  }
});

test('PRIV-ERASURE-TOPOLOGY matches generated PostgreSQL FK/delete mechanics', {
  skip: !integrationEnabled,
}, async () => {
  const directFkRows = await sql`
    SELECT
      parent.relname AS parent_table,
      parent_att.attname AS parent_column,
      child.relname AS child_table,
      child_att.attname AS child_column,
      CASE con.confdeltype
        WHEN 'a' THEN 'NO_ACTION'
        WHEN 'r' THEN 'RESTRICT'
        WHEN 'c' THEN 'CASCADE'
        WHEN 'n' THEN 'SET_NULL'
        WHEN 'd' THEN 'SET_DEFAULT'
        ELSE con.confdeltype::text
      END AS delete_action
    FROM pg_constraint con
    JOIN pg_class child ON child.oid = con.conrelid
    JOIN pg_namespace child_ns ON child_ns.oid = child.relnamespace
    JOIN pg_class parent ON parent.oid = con.confrelid
    JOIN pg_namespace parent_ns ON parent_ns.oid = parent.relnamespace
    JOIN LATERAL unnest(con.conkey) WITH ORDINALITY child_key(attnum, ord) ON true
    JOIN LATERAL unnest(con.confkey) WITH ORDINALITY parent_key(attnum, ord)
      ON parent_key.ord = child_key.ord
    JOIN pg_attribute child_att
      ON child_att.attrelid = child.oid
     AND child_att.attnum = child_key.attnum
    JOIN pg_attribute parent_att
      ON parent_att.attrelid = parent.oid
     AND parent_att.attnum = parent_key.attnum
    WHERE con.contype = 'f'
      AND child_ns.nspname = 'public'
      AND parent_ns.nspname = 'public'
      AND (
        (parent.relname = 'users' AND parent_att.attname = 'id')
        OR
        (parent.relname = 'dogs' AND parent_att.attname = 'id')
      )
    ORDER BY parent.relname, child.relname, child_att.attname
  `;

  const actualUsers = directFkRows
    .filter((row) => row.parent_table === 'users')
    .map((row) => `${row.child_table}|${row.child_column}|${row.delete_action}`);
  const expectedUsers = accountTopology.directUserReferences
    .map((row) => `${row.table}|${row.column}|${row.databaseDeleteAction}`);
  assert.deepEqual(sorted(actualUsers), sorted(expectedUsers), 'account topology drifted from generated PostgreSQL');

  const actualDogs = directFkRows
    .filter((row) => row.parent_table === 'dogs')
    .map((row) => `${row.child_table}|${row.child_column}|${row.delete_action}`);
  const expectedDogs = dogTopology.canonicalForeignKeys
    .map((row) => `${row.table}|${row.column}|${row.databaseDeleteAction}`);
  assert.deepEqual(sorted(actualDogs), sorted(expectedDogs), 'dog topology drifted from generated PostgreSQL');

  const unconstrainedDogRows = await sql`
    SELECT c.table_name, c.column_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name <> 'dogs'
      AND c.column_name IN ('dog_id', 'dog_a_id', 'dog_b_id')
      AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint con
        JOIN pg_class child ON child.oid = con.conrelid
        JOIN pg_namespace ns ON ns.oid = child.relnamespace
        JOIN pg_class parent ON parent.oid = con.confrelid
        JOIN LATERAL unnest(con.conkey) child_key(attnum) ON true
        JOIN pg_attribute child_att
          ON child_att.attrelid = child.oid
         AND child_att.attnum = child_key.attnum
        WHERE con.contype = 'f'
          AND ns.nspname = 'public'
          AND child.relname = c.table_name
          AND child_att.attname = c.column_name
          AND parent.relname = 'dogs'
      )
    ORDER BY c.table_name, c.column_name
  `;

  assert.deepEqual(
    unconstrainedDogRows.map((row) => `${row.table_name}|${row.column_name}`),
    dogTopology.unconstrainedDogIdentifiers.map((row) => `${row.table}|${row.column}`).sort(),
    'unconstrained dog identifiers drifted from generated PostgreSQL',
  );

  const unconstrainedUserRows = await sql`
    SELECT c.table_name, c.column_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name <> 'users'
      AND (
        c.column_name = 'user_id'
        OR c.column_name LIKE '%\\_user_id' ESCAPE '\\'
        OR c.column_name IN ('author_id', 'created_by', 'owner_id')
      )
      AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint con
        JOIN pg_class child ON child.oid = con.conrelid
        JOIN pg_namespace ns ON ns.oid = child.relnamespace
        JOIN pg_class parent ON parent.oid = con.confrelid
        JOIN LATERAL unnest(con.conkey) child_key(attnum) ON true
        JOIN pg_attribute child_att
          ON child_att.attrelid = child.oid
         AND child_att.attnum = child_key.attnum
        WHERE con.contype = 'f'
          AND ns.nspname = 'public'
          AND child.relname = c.table_name
          AND child_att.attname = c.column_name
          AND parent.relname = 'users'
      )
    ORDER BY c.table_name, c.column_name
  `;

  assert.deepEqual(
    unconstrainedUserRows.map((row) => `${row.table_name}|${row.column_name}`),
    userLineage.unconstrainedUserIdentifiers.map((row) => `${row.table}|${row.column}`).sort(),
    'unconstrained user identifiers drifted from generated PostgreSQL',
  );

  for (const expected of dogTopology.transitiveDescendants) {
    const [parentTable, parentColumn] = expected.references.split('.');
    const [row] = await sql`
      SELECT
        CASE con.confdeltype
          WHEN 'a' THEN 'NO_ACTION'
          WHEN 'r' THEN 'RESTRICT'
          WHEN 'c' THEN 'CASCADE'
          WHEN 'n' THEN 'SET_NULL'
          WHEN 'd' THEN 'SET_DEFAULT'
          ELSE con.confdeltype::text
        END AS delete_action
      FROM pg_constraint con
      JOIN pg_class child ON child.oid = con.conrelid
      JOIN pg_namespace child_ns ON child_ns.oid = child.relnamespace
      JOIN pg_class parent ON parent.oid = con.confrelid
      JOIN LATERAL unnest(con.conkey) WITH ORDINALITY child_key(attnum, ord) ON true
      JOIN LATERAL unnest(con.confkey) WITH ORDINALITY parent_key(attnum, ord)
        ON parent_key.ord = child_key.ord
      JOIN pg_attribute child_att
        ON child_att.attrelid = child.oid
       AND child_att.attnum = child_key.attnum
      JOIN pg_attribute parent_att
        ON parent_att.attrelid = parent.oid
       AND parent_att.attnum = parent_key.attnum
      WHERE con.contype = 'f'
        AND child_ns.nspname = 'public'
        AND child.relname = ${expected.table}
        AND child_att.attname = ${expected.column}
        AND parent.relname = ${parentTable}
        AND parent_att.attname = ${parentColumn}
      LIMIT 1
    `;
    assert.ok(row, `missing transitive FK ${expected.table}.${expected.column}`);
    assert.equal(row.delete_action, expected.databaseDeleteAction);
  }
});
