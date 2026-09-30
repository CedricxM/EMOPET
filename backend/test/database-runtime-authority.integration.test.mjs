import test, { after } from 'node:test';
import assert from 'node:assert/strict';

const enabled = process.env.RUNTIME_DB_AUTHORITY_INTEGRATION === '1';

let sql = null;
let assertRuntimeDatabaseAuthority = null;
let closeDatabase = null;

if (enabled) {
  const [{ default: postgres }, dbModule] = await Promise.all([
    import('postgres'),
    import('../dist/db/index.js'),
  ]);
  sql = postgres(process.env.DATABASE_URL, { max: 1 });
  assertRuntimeDatabaseAuthority = dbModule.assertRuntimeDatabaseAuthority;
  closeDatabase = dbModule.closeDatabase;
}

after(async () => {
  if (sql) await sql.end({ timeout: 5 });
  if (closeDatabase) await closeDatabase();
});

test('disposable runtime role has DML authority without broad DDL/admin privileges', {
  skip: !enabled,
}, async () => {
  await assertRuntimeDatabaseAuthority();

  const [role] = await sql`
    SELECT
      current_user AS role_name,
      rolsuper,
      rolcreaterole,
      rolcreatedb,
      rolreplication,
      rolbypassrls,
      has_schema_privilege(current_user, 'public', 'CREATE') AS can_create_public,
      has_table_privilege(current_user, 'public.users', 'SELECT') AS can_select_users,
      has_table_privilege(current_user, 'public.users', 'INSERT') AS can_insert_users,
      has_table_privilege(current_user, 'public.users', 'UPDATE') AS can_update_users,
      has_table_privilege(current_user, 'public.users', 'DELETE') AS can_delete_users
    FROM pg_roles
    WHERE rolname = current_user
  `;

  assert.equal(role.role_name, 'emopet_runtime_qa');
  assert.equal(role.rolsuper, false);
  assert.equal(role.rolcreaterole, false);
  assert.equal(role.rolcreatedb, false);
  assert.equal(role.rolreplication, false);
  assert.equal(role.rolbypassrls, false);
  assert.equal(role.can_create_public, false);
  assert.equal(role.can_select_users, true);
  assert.equal(role.can_insert_users, true);
  assert.equal(role.can_update_users, true);
  assert.equal(role.can_delete_users, true);

  await assert.rejects(
    sql`CREATE TABLE emopet_runtime_must_not_create_tables (id integer)`,
    /permission denied/i,
  );
});
