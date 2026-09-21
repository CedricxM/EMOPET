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

export type ErasureRelationType =
  | 'DIRECT_FK'
  | 'TRANSITIVE_FK'
  | 'UNCONSTRAINED_IDENTIFIER';

export interface ErasureMatrixEntry {
  subjectRoot: ErasureSubjectRoot;
  relationType: ErasureRelationType;
  table: string;
  column: string;
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

export interface ErasureTechnicalRelation {
  subjectRoot: ErasureSubjectRoot;
  relationType: ErasureRelationType;
  table: string;
  column: string;
  databaseDeleteAction: DatabaseDeleteAction;
}

export interface ErasureReadinessReport {
  ok: true;
  mode: 'PREFLIGHT_ONLY';
  destructiveActionAuthorized: false;
  subjectRoot: ErasureSubjectRoot;
  status: 'BLOCKED' | 'CONTROL_PLANE_READY';
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
    databaseMechanics: Record<DatabaseDeleteAction, number>;
    rootDeleteBlockers: Array<{
      table: string;
      column: string;
      relationType: ErasureRelationType;
      databaseDeleteAction: DatabaseDeleteAction;
      disposition: ErasureDisposition;
      executionStatus: ErasureExecutionStatus;
    }>;
    automaticCascadeRelations: Array<{
      table: string;
      column: string;
      relationType: ErasureRelationType;
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
    | 'invalid_technical_topology'
    | 'unsupported_subject_root'
    | 'topology_matrix_mismatch';
}

export type ErasureReadinessResult = ErasureReadinessReport | ErasureReadinessFailure;

const SUBJECT_ROOTS = new Set<ErasureSubjectRoot>(['users.id', 'dogs.id']);
const RELATION_TYPES = new Set<ErasureRelationType>([
  'DIRECT_FK',
  'TRANSITIVE_FK',
  'UNCONSTRAINED_IDENTIFIER',
]);
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

function relationKey(
  subjectRoot: ErasureSubjectRoot,
  relationType: ErasureRelationType,
  table: string,
  column: string,
): string {
  return `${subjectRoot}|${relationType}|${table}|${column}`;
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

  const relationKeys = new Set<string>();
  for (const row of value.entries) {
    if (
      !SUBJECT_ROOTS.has(row.subjectRoot)
      || !RELATION_TYPES.has(row.relationType)
      || typeof row.table !== 'string'
      || row.table.length === 0
      || typeof row.column !== 'string'
      || row.column.length === 0
      || !DISPOSITIONS.has(row.disposition)
      || !EXECUTION_STATUSES.has(row.executionStatus)
    ) {
      return false;
    }

    const key = relationKey(row.subjectRoot, row.relationType, row.table, row.column);
    if (relationKeys.has(key)) return false;
    relationKeys.add(key);
  }

  const surfaces = new Set<string>();
  for (const surface of value.nonSqlSurfaces) {
    if (
      typeof surface.surface !== 'string'
      || surface.surface.length === 0
      || surfaces.has(surface.surface)
      || !DISPOSITIONS.has(surface.disposition)
      || !EXECUTION_STATUSES.has(surface.executionStatus)
    ) {
      return false;
    }
    surfaces.add(surface.surface);
  }

  return true;
}

function validTechnicalRelations(relations: ErasureTechnicalRelation[]): boolean {
  if (!Array.isArray(relations)) return false;

  const keys = new Set<string>();
  for (const row of relations) {
    if (
      !SUBJECT_ROOTS.has(row.subjectRoot)
      || !RELATION_TYPES.has(row.relationType)
      || typeof row.table !== 'string'
      || row.table.length === 0
      || typeof row.column !== 'string'
      || row.column.length === 0
      || !DELETE_ACTIONS.has(row.databaseDeleteAction)
    ) {
      return false;
    }

    const key = relationKey(row.subjectRoot, row.relationType, row.table, row.column);
    if (keys.has(key)) return false;
    keys.add(key);
  }

  return true;
}

/**
 * Pure PRIV erasure-readiness preflight.
 *
 * This function composes the policy matrix with verified database mechanics,
 * but never executes, plans, authorises or implies a destructive mutation.
 */
export function buildErasureReadinessReport(
  matrix: ErasureDispositionMatrix,
  subjectRoot: ErasureSubjectRoot,
  technicalRelations: ErasureTechnicalRelation[],
): ErasureReadinessResult {
  if (!isMatrix(matrix)) return fail('invalid_matrix');
  if (!SUBJECT_ROOTS.has(subjectRoot)) return fail('unsupported_subject_root');
  if (!validTechnicalRelations(technicalRelations)) return fail('invalid_technical_topology');

  const matrixRows = matrix.entries.filter((row) => row.subjectRoot === subjectRoot);
  const technicalRows = technicalRelations.filter((row) => row.subjectRoot === subjectRoot);

  const matrixKeys = matrixRows
    .map((row) => relationKey(row.subjectRoot, row.relationType, row.table, row.column))
    .sort();
  const topologyKeys = technicalRows
    .map((row) => relationKey(row.subjectRoot, row.relationType, row.table, row.column))
    .sort();

  if (
    matrixKeys.length !== topologyKeys.length
    || matrixKeys.some((key, index) => key !== topologyKeys[index])
  ) {
    return fail('topology_matrix_mismatch');
  }

  const mechanics: Record<DatabaseDeleteAction, number> = {
    NO_ACTION: 0,
    RESTRICT: 0,
    CASCADE: 0,
    SET_NULL: 0,
    SET_DEFAULT: 0,
  };

  const mechanicsByKey = new Map(
    technicalRows.map((row) => [
      relationKey(row.subjectRoot, row.relationType, row.table, row.column),
      row.databaseDeleteAction,
    ]),
  );

  for (const row of technicalRows) {
    mechanics[row.databaseDeleteAction] += 1;
  }

  const rootDeleteBlockers = matrixRows
    .filter((row) => {
      if (row.relationType !== 'DIRECT_FK') return false;
      const action = mechanicsByKey.get(
        relationKey(row.subjectRoot, row.relationType, row.table, row.column),
      );
      return action === 'NO_ACTION' || action === 'RESTRICT';
    })
    .map((row) => ({
      table: row.table,
      column: row.column,
      relationType: row.relationType,
      databaseDeleteAction: mechanicsByKey.get(
        relationKey(row.subjectRoot, row.relationType, row.table, row.column),
      ) as DatabaseDeleteAction,
      disposition: row.disposition,
      executionStatus: row.executionStatus,
    }));

  const automaticCascadeRelations = technicalRows
    .filter((row) => row.databaseDeleteAction === 'CASCADE')
    .map((row) => ({
      table: row.table,
      column: row.column,
      relationType: row.relationType,
    }));

  const unresolvedRelational = matrixRows.filter((row) => row.disposition === 'TO_CONFIRM').length;
  const unimplementedRelational = matrixRows.filter((row) => row.executionStatus !== 'IMPLEMENTED').length;
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
    status: reasons.length > 0 ? 'BLOCKED' : 'CONTROL_PLANE_READY',
    reasons,
    relational: {
      total: matrixRows.length,
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
