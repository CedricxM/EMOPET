/**
 * Regional source readiness.
 *
 * Most Regional Pack bindings are source-scoped and use the generic Breiz
 * source-rights gate. Catalogue-style sources may instead bind exact resources
 * whose rights are governed below the portal level.
 */

import {
  BRETAGNE_OPEN_DATA_ALLOWLIST,
  evaluateBretagneOpenDataDatasetRights,
  getBretagneOpenDataDataset,
  type BretagneDatasetRightsBlocker,
} from '../data/breiz/bretagneOpenDataAllowlist';
import {
  evaluateBreizSourceRights,
  getBreizSource,
  isBreizSourceReleaseReady,
  type BreizSourceRightsBlocker,
} from '../data/breiz/sourceRegistry';

export type RegionalSourceReadinessScope =
  | { kind: 'SOURCE' }
  | {
      kind: 'BRETAGNE_OPEN_DATA_DATASETS';
      datasetIds: readonly string[];
    };

export interface RegionalSourceReadinessRequest {
  sourceId: string;
  readinessScope?: RegionalSourceReadinessScope;
}

type SourceLookup = (id: string) => ReturnType<typeof getBreizSource>;

export type RegionalSourceEffectiveBlocker =
  | 'UNKNOWN_SOURCE'
  | 'NO_SCOPED_RESOURCE'
  | 'SCOPED_SOURCE_MISMATCH'
  | `UNKNOWN_DATASET:${string}`
  | `DATASET_BLOCKER:${string}:${BretagneDatasetRightsBlocker}`
  | `SOURCE_BLOCKER:${BreizSourceRightsBlocker}`;

export interface RegionalSourceReadinessVerdict {
  sourceId: string;
  sourceKnown: boolean;
  readinessKind: RegionalSourceReadinessScope['kind'];
  effectiveIngestionPermitted: boolean;
  releaseReady: boolean;
  sourceRightsBlockers: readonly BreizSourceRightsBlocker[];
  scopedResourceIds: readonly string[];
  readyScopedResourceIds: readonly string[];
  effectiveBlockers: readonly RegionalSourceEffectiveBlocker[];
}

function sourceScopedVerdict(
  sourceId: string,
  nowMs: number,
  lookup: SourceLookup,
): RegionalSourceReadinessVerdict {
  const source = lookup(sourceId);

  if (!source) {
    return {
      sourceId,
      sourceKnown: false,
      readinessKind: 'SOURCE',
      effectiveIngestionPermitted: false,
      releaseReady: false,
      sourceRightsBlockers: [],
      scopedResourceIds: [],
      readyScopedResourceIds: [],
      effectiveBlockers: ['UNKNOWN_SOURCE'],
    };
  }

  const rights = evaluateBreizSourceRights(source, nowMs);

  return {
    sourceId,
    sourceKnown: true,
    readinessKind: 'SOURCE',
    effectiveIngestionPermitted: rights.ingestionPermitted,
    releaseReady: isBreizSourceReleaseReady(source, nowMs),
    sourceRightsBlockers: rights.blockers,
    scopedResourceIds: [],
    readyScopedResourceIds: [],
    effectiveBlockers: rights.blockers.map(
      (blocker) => `SOURCE_BLOCKER:${blocker}` as const,
    ),
  };
}

function bretagneDatasetScopedVerdict(
  sourceId: string,
  datasetIds: readonly string[],
  nowMs: number,
  lookup: SourceLookup,
): RegionalSourceReadinessVerdict {
  const source = lookup(sourceId);
  const sourceRights = source ? evaluateBreizSourceRights(source, nowMs) : null;
  const effectiveBlockers: RegionalSourceEffectiveBlocker[] = [];

  if (!source) {
    effectiveBlockers.push('UNKNOWN_SOURCE');
  }

  if (sourceId !== 'region-bretagne-open-data') {
    effectiveBlockers.push('SCOPED_SOURCE_MISMATCH');
  }

  if (datasetIds.length === 0) {
    effectiveBlockers.push('NO_SCOPED_RESOURCE');
  }

  const uniqueDatasetIds = [...new Set(datasetIds)];
  const readyScopedResourceIds: string[] = [];

  for (const datasetId of uniqueDatasetIds) {
    const dataset = getBretagneOpenDataDataset(datasetId);

    if (!dataset) {
      effectiveBlockers.push(`UNKNOWN_DATASET:${datasetId}`);
      continue;
    }

    const verdict = evaluateBretagneOpenDataDatasetRights(
      dataset,
      nowMs,
      source,
    );

    if (verdict.ingestionPermitted) {
      readyScopedResourceIds.push(datasetId);
      continue;
    }

    for (const blocker of verdict.blockers) {
      effectiveBlockers.push(
        `DATASET_BLOCKER:${datasetId}:${blocker}`,
      );
    }
  }

  const structurallyValid =
    source != null &&
    sourceId === 'region-bretagne-open-data' &&
    uniqueDatasetIds.length > 0;

  const releaseReady =
    structurallyValid && readyScopedResourceIds.length > 0;

  return {
    sourceId,
    sourceKnown: source != null,
    readinessKind: 'BRETAGNE_OPEN_DATA_DATASETS',
    effectiveIngestionPermitted: releaseReady,
    releaseReady,
    sourceRightsBlockers: sourceRights?.blockers ?? [],
    scopedResourceIds: uniqueDatasetIds,
    readyScopedResourceIds,
    effectiveBlockers,
  };
}

export function evaluateRegionalSourceReadiness(
  request: RegionalSourceReadinessRequest,
  nowMs: number = Date.now(),
  lookup: SourceLookup = getBreizSource,
): RegionalSourceReadinessVerdict {
  const scope = request.readinessScope ?? { kind: 'SOURCE' as const };

  if (scope.kind === 'BRETAGNE_OPEN_DATA_DATASETS') {
    return bretagneDatasetScopedVerdict(
      request.sourceId,
      scope.datasetIds,
      nowMs,
      lookup,
    );
  }

  return sourceScopedVerdict(request.sourceId, nowMs, lookup);
}

/**
 * Exported for inventory/reporting only. Runtime readiness still evaluates the
 * exact IDs declared by each Regional Pack binding.
 */
export function listBretagneOpenDataDatasetIds(): readonly string[] {
  return BRETAGNE_OPEN_DATA_ALLOWLIST.map((dataset) => dataset.datasetId);
}
