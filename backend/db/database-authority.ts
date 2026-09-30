export interface DatabaseAuthorityEnv {
  NODE_ENV?: string;
  DATABASE_URL?: string;
  MIGRATION_DATABASE_URL?: string;
}

const LOCAL_DATABASE_URL = 'postgres://localhost:5432/emopet';

function readNonEmpty(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function resolveRuntimeDatabaseUrl(
  env: DatabaseAuthorityEnv = process.env,
): string {
  const runtimeUrl = readNonEmpty(env.DATABASE_URL);
  if (runtimeUrl) return runtimeUrl;

  if (env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL must be configured for the production runtime');
  }

  return LOCAL_DATABASE_URL;
}

export function resolveMigrationDatabaseUrl(
  env: DatabaseAuthorityEnv = process.env,
): string {
  const migrationUrl = readNonEmpty(env.MIGRATION_DATABASE_URL);
  if (migrationUrl) return migrationUrl;

  if (env.NODE_ENV === 'production') {
    throw new Error(
      'MIGRATION_DATABASE_URL must be configured separately for production migrations',
    );
  }

  return readNonEmpty(env.DATABASE_URL) ?? LOCAL_DATABASE_URL;
}

export interface RuntimeDatabaseRoleEvidence {
  roleName: string;
  superuser: boolean;
  createRole: boolean;
  createDb: boolean;
  replication: boolean;
  bypassRls: boolean;
  canCreatePublicSchema: boolean;
}

export interface RuntimeDatabaseAuthorityEvaluation {
  ok: boolean;
  violations: string[];
}

export function evaluateRuntimeDatabaseAuthority(
  evidence: RuntimeDatabaseRoleEvidence,
): RuntimeDatabaseAuthorityEvaluation {
  const violations: string[] = [];

  if (!evidence.roleName.trim()) violations.push('EMPTY_ROLE_NAME');
  if (evidence.superuser) violations.push('SUPERUSER');
  if (evidence.createRole) violations.push('CREATEROLE');
  if (evidence.createDb) violations.push('CREATEDB');
  if (evidence.replication) violations.push('REPLICATION');
  if (evidence.bypassRls) violations.push('BYPASSRLS');
  if (evidence.canCreatePublicSchema) violations.push('PUBLIC_SCHEMA_CREATE');

  return {
    ok: violations.length === 0,
    violations,
  };
}
