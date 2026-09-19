import type { ProfessionalShareScope } from '@emopet/shared';

import type { VetReportSummary } from './vet-report.js';

export interface ProfessionalShareProjectionAuthority {
  dogId: string;
  scopes: readonly ProfessionalShareScope[];
}

export interface ProfessionalShareVeterinarySummaryProjection {
  dogId: string;
  dogName: string;
  days: number;
  generatedAt: string;
}

export interface ProfessionalShareLongitudinalProjection {
  trends: Array<{
    label: string;
    value: string;
    coverage: string;
  }>;
}

export interface ProfessionalShareCoverageProjection {
  validDays: number;
  totalDays: number;
  coverageRatio: number;
}

export interface ProfessionalShareProjectedData {
  veterinarySummary?: ProfessionalShareVeterinarySummaryProjection;
  qualifiedLongitudinalObservations?: ProfessionalShareLongitudinalProjection;
  dataCoverageAndConfidence?: ProfessionalShareCoverageProjection;
}

/**
 * Projection failures are authority failures, not a reason to fall back to a
 * broader payload. The recipient-read boundary catches this and fails closed.
 */
export class ProfessionalShareProjectionUnavailableError extends Error {
  constructor(
    readonly scope: ProfessionalShareScope | null,
    readonly reason: 'DOG_SCOPE_MISMATCH' | 'SCOPE_POLICY_NOT_READY',
  ) {
    super(`Professional-share projection unavailable: ${reason}`);
    this.name = 'ProfessionalShareProjectionUnavailableError';
  }
}

/**
 * Central field-level publication whitelist for professional sharing.
 *
 * VetReportSummary is an internal snapshot and may contain fields that are not
 * authorized for the recipient. Never return the snapshot directly and never
 * copy it wholesale. Each authorized semantic scope is rebuilt field-by-field.
 */
export function projectProfessionalShareSnapshot(
  authority: ProfessionalShareProjectionAuthority,
  snapshot: VetReportSummary,
): ProfessionalShareProjectedData {
  if (snapshot.dogId !== authority.dogId) {
    throw new ProfessionalShareProjectionUnavailableError(null, 'DOG_SCOPE_MISMATCH');
  }

  const projected: ProfessionalShareProjectedData = {};

  for (const scope of authority.scopes) {
    switch (scope) {
      case 'VETERINARY_SUMMARY':
        projected.veterinarySummary = {
          dogId: snapshot.dogId,
          dogName: snapshot.dogName,
          days: snapshot.days,
          generatedAt: snapshot.generatedAt.toISOString(),
        };
        break;

      case 'QUALIFIED_LONGITUDINAL_OBSERVATIONS':
        projected.qualifiedLongitudinalObservations = {
          trends: snapshot.trends.map((trend) => ({
            label: trend.label,
            value: trend.value,
            coverage: trend.coverage,
          })),
        };
        break;

      case 'DATA_COVERAGE_AND_CONFIDENCE':
        projected.dataCoverageAndConfidence = {
          validDays: snapshot.coverage.validDays,
          totalDays: snapshot.coverage.totalDays,
          coverageRatio: snapshot.coverage.coverageRatio,
        };
        break;

      case 'OWNER_SELECTED_NOTES':
      case 'DECLARED_CONTEXT':
        throw new ProfessionalShareProjectionUnavailableError(scope, 'SCOPE_POLICY_NOT_READY');
    }
  }

  return projected;
}
