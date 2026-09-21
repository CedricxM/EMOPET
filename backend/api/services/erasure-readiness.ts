export type ErasureSubjectRoot = 'users.id' | 'dogs.id';

export type DatabaseDeleteAction =
  | 'NO_ACTION'
  | 'RESTRICT'
  | 'CASCADE'
  | 'SET_NULL'
  | 'SET_DEFAULT';

export type ErasureDisposition =
  | 'TO_CONFIRM'
  | 'DELETE'
  | 'ANONYMIZE'
  | 'DETACH'
  | 'RETAIN_WITH_JUSTIFICATION';

export type ErasureExecutionStatus = 'NOT_IMPLEMENTED' | 'IMPLEMENTED';

export interface ErasureMatrixEntry {
  subjectRoot: ErasureSubjectRoot;
  relationType: 'DIRECT_FK' | 'TRANSITIVE_FK' | 'UNCONSTRAINED_IDENTIFIER';
  table: string;
  column: string;
  databaseDeleteAction?: DatabaseDeleteAction;
  disposition: ErasureDisposition;
  executionStatus: ErasureExecutionStatus;
  testEvidence?: string;
}

export interface ErasureNonSqlSurface {
  surface: string;
  disposition: ErasureDisposition;
  executionStatus: ErasureExecutionStatus;
}

export interface ErasureDispositionMatrix {
  schemaVersion: string;
  status: string;
  claimsExecutableErasure: boolean;
  claimsCompleteErasure: boolean;
  entries: ErasureMatrixEntry[];
  nonSqlSurfaces: ErasureNonSqlSurface[];
}

export interface ErasureReadinessReport {
  ok: true;
  mode: 'PREFLIGHT_ONLY';
  destructiveActionAuthorized: false;
  subjectRoot: ErasureSubjectRoot;
  status: 'BLOCKED';
  reasons: Array<
    | 'POLICY_DISPOSITIONS_UNRESOLVED'
    | 'RELATIONAL_EXECUTION_NOT_IMPLEMENTED'
    | 'NON_SQL_DISPOSITIONS_UNRESOLVED'
    | 'NON_SQL_EXECUTION_NOT_IMPLEMENTED'
    | 'ROOT_DELETE_BLOCKED_BY_DATABASE_REFERENCES'
    | 'MATRIX_DOES_NOT_CLAIM_EXECUTABLE_ERASURE'
    | 'MATRIX_DOES_NOT_CLAIM_COMPLETE_ERASURE'
  >;
  relational: {
    total: number;
    unresolvedDisposition: number;
    notImplemented: number;
    databaseMechanics: Record<DatabaseDeleteAction | 'UNKNOWN', number>;
    rootDeleteBlockers: Array<{
      table: string;
      column: string;
      relationType: ErasureMatrixEntry['relationType'];
      databaseDeleteAction: DatabaseDeleteAction | 'UNKNOWN';
      disposition: ErasureDisposition;
      executionStatus: ErasureExecutionStatus;
    }>;
    automaticCascadeRelations: Array<{
      table: string;
      column: string;
      relationType: ErasureMatrixEntry['relationType'];
    }>;
  };
  nonSql: {
    total: number;
    unresolvedDisposition: number;
    notImplemented: number;
    surfaces: Array<{
      surface: string;
      disposition: ErasureDisposition;
      executionStatus: ErasureExecutionStatus;
    }>;
  };
}

export interface ErasureReadinessFailure {
  ok: false;
  mode: 'PREFLIGHT_ONLY';
  destructiveActionAuthorized: false;
  error:
    | 'invalid_matrix'
    | 'unsupported_subject_root';
}

export type ErasureReadinessResult = ErasureReadinessReport | ErasureReadinessFailure;

const DELETE_ACTIONS = new Set<DatabaseDeleteAction>([
  'NO_ACTION',
  'RESTRICT',
  'CASCADE',
  'SET_NULL',
  'SET_DEFAULT',
]);

const DISPOSITIONS = new Set<ErasureDisposition>([
  'TO_CONFIRM',
  'DELETE',
  'ANONYMIZE',
  'DETACH',
  'RETAIN_WITH_JUSTIFICATION',
]);

const EXECUTION_STATUSES = new Set<ErasureExecutionStatus>([
  'NOT_IMPLEMENTED',
  'IMPLEMENTED',
]);

function fail(error: ErasureReadinessFailure['error']): ErasureReadinessFailure {
  return {
    ok: false,
    mode: 'PREFLIGHT_ONLY',
    destructiveActionAuthorized: false,
    error,
  };
}

function isMatrix(value: ErasureDispositionMatrix): boolean {
  if (
    value?.schemaVersion !== 'emopet-erasure-disposition-matrix-v1'
    || typeof value?.status !== 'string'
    || typeof value?.claimsExecutableErasure !== 'boolean'
    || typeof value?.claimsCompleteErasure !== 'boolean'
    || !Array.isArray(value?.entries)
    || !Array.isArray(value?.nonSqlSurfaces)
  ) {
    return false;
  }

  for (const row of value.entries) {
    if (
      !['users.id', 'dogs.id'].includes(row.subjectRoot)
      || !['DIRECT_FK', 'TRANSITIVE_FK', 'UNCONSTRAINED_IDENTIFIER'].includes(row.relationType)
      || typeof row.table !== 'string'
      || row.table.length === 0
      || typeof row.column !== 'string'
      || row.column.length === 0
      || !DISPOSITIONS.has(row.disposition)
      || !EXECUTION_STATUSES.has(row.executionStatus)
      || (
        row.databaseDeleteAction !== undefined
        && !DELETE_ACTIONS.has(row.databaseDeleteAction)
      )
    ) {
      return false;
    }
  }

  for (const surface of value.nonSqlSurfaces) {
    if (
      typeof surface.surface !== 'string'
      || surface.surface.length === 0
      || !DISPOSITIONS.has(surface.disposition)
      || !EXECUTION_STATUSES.has(surface.executionStatus)
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Pure PRIV erasure-readiness preflight.
 *
 * This does not execute, plan, authorise or imply any destructive mutation.
 * It only summarizes the current matrix and database mechanics.
 */
export function buildErasureReadinessReport(
  matrix: ErasureDispositionMatrix,
  subjectRoot: ErasureSubjectRoot,
): ErasureReadinessResult {
  if (!isMatrix(matrix)) return fail('invalid_matrix');
  if (subjectRoot !== 'users.id' && subjectRoot !== 'dogs.id') {
    return fail('unsupported_subject_root');
  }

  const rows = matrix.entries.filter((row) => row.subjectRoot === subjectRoot);

  const mechanics: Record<DatabaseDeleteAction | 'UNKNOWN', number> = {
    NO_ACTION: 0,
    RESTRICT: 0,
    CASCADE: 0,
    SET_NULL: 0,
    SET_DEFAULT: 0,
    UNKNOWN: 0,
  };

  for (const row of rows) {
    mechanics[row.databaseDeleteAction ?? 'UNKNOWN'] += 1;
  }

  const rootDeleteBlockers = rows
    .filter((row) =>
      row.relationType === 'DIRECT_FK'
      && ['NO_ACTION', 'RESTRICT'].includes(row.databaseDeleteAction ?? 'UNKNOWN'))
    .map((row) => ({
      table: row.table,
      column: row.column,
      relationType: row.relationType,
      databaseDeleteAction: row.databaseDeleteAction ?? 'UNKNOWN',
      disposition: row.disposition,
      executionStatus: row.executionStatus,
    }));

  const automaticCascadeRelations = rows
    .filter((row) => row.databaseDeleteAction === 'CASCADE')
    .map((row) => ({
      table: row.table,
      column: row.column,
      relationType: row.relationType,
    }));

  const unresolvedRelational = rows.filter((row) => row.disposition === 'TO_CONFIRM').length;
  const unimplementedRelational = rows.filter((row) => row.executionStatus !== 'IMPLEMENTED').length;
  const unresolvedNonSql = matrix.nonSqlSurfaces.filter((row) => row.disposition === 'TO_CONFIRM').length;
  const unimplementedNonSql = matrix.nonSqlSurfaces.filter((row) => row.executionStatus !== 'IMPLEMENTED').length;

  const reasons: ErasureReadinessReport['reasons'] = [];
  if (unresolvedRelational > 0) reasons.push('POLICY_DISPOSITIONS_UNRESOLVED');
  if (unimplementedRelational > 0) reasons.push('RELATIONAL_EXECUTION_NOT_IMPLEMENTED');
  if (unresolvedNonSql > 0) reasons.push('NON_SQL_DISPOSITIONS_UNRESOLVED');
  if (unimplementedNonSql > 0) reasons.push('NON_SQL_EXECUTION_NOT_IMPLEMENTED');
  if (rootDeleteBlockers.length > 0) reasons.push('ROOT_DELETE_BLOCKED_BY_DATABASE_REFERENCES');
  if (!matrix.claimsExecutableErasure) reasons.push('MATRIX_DOES_NOT_CLAIM_EXECUTABLE_ERASURE');
  if (!matrix.claimsCompleteErasure) reasons.push('MATRIX_DOES_NOT_CLAIM_COMPLETE_ERASURE');

  return {
    ok: true,
    mode: 'PREFLIGHT_ONLY',
    destructiveActionAuthorized: false,
    subjectRoot,
    status: 'BLOCKED',
    reasons,
    relational: {
      total: rows.length,
      unresolvedDisposition: unresolvedRelational,
      notImplemented: unimplementedRelational,
      databaseMechanics: mechanics,
      rootDeleteBlockers,
      automaticCascadeRelations,
    },
    nonSql: {
      total: matrix.nonSqlSurfaces.length,
      unresolvedDisposition: unresolvedNonSql,
      notImplemented: unimplementedNonSql,
      surfaces: matrix.nonSqlSurfaces.map((row) => ({ ...row })),
    },
  };
}
