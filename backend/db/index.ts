import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';
import {
  evaluateRuntimeDatabaseAuthority,
  resolveRuntimeDatabaseUrl,
  type RuntimeDatabaseRoleEvidence,
} from './database-authority.js';

const connectionString = resolveRuntimeDatabaseUrl();

// Disposable integration tests must not keep the Node test runner alive on an
// idle PostgreSQL socket. Production keeps the driver's normal pool settings.
const client = postgres(
  connectionString,
  process.env['NODE_ENV'] === 'test' ? { idle_timeout: 1 } : {},
);
export const db = drizzle(client, { schema });
export type Database = typeof db;

/**
 * Verify that the production application connection is not using a broad
 * PostgreSQL administration role. This is deliberately narrower than a full
 * deployment attestation: provider IAM, password custody and object-level
 * grants remain external evidence.
 */
export async function assertRuntimeDatabaseAuthority(): Promise<void> {
  const [row] = await client<RuntimeDatabaseRoleEvidence[]>`
    SELECT
      current_user AS "roleName",
      role.rolsuper AS "superuser",
      role.rolcreaterole AS "createRole",
      role.rolcreatedb AS "createDb",
      role.rolreplication AS "replication",
      role.rolbypassrls AS "bypassRls",
      has_schema_privilege(current_user, 'public', 'CREATE') AS "canCreatePublicSchema"
    FROM pg_roles AS role
    WHERE role.rolname = current_user
  `;

  if (!row) {
    throw new Error('Unable to inspect PostgreSQL runtime role authority');
  }

  const evaluation = evaluateRuntimeDatabaseAuthority(row);
  if (!evaluation.ok) {
    throw new Error(
      `PostgreSQL runtime role is over-privileged: ${evaluation.violations.join(', ')}`,
    );
  }
}


/**
 * Close the shared PostgreSQL client during controlled process shutdown or
 * integration-test teardown. Runtime request handlers should not call this.
 */
export async function closeDatabase(): Promise<void> {
  await client.end({ timeout: 5 });
}
