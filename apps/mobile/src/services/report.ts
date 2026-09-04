import { apiRequest } from './api';

export interface AbsenceComparisonPayload {
  dogId: string;
  days: number;
  comparison: {
    present_vocal_events_per_hour: number;
    absent_vocal_events_per_hour: number;
    present_imu_agitation_index_mean: number;
    absent_imu_agitation_index_mean: number;
    present_mat_rest_min: number;
    absent_mat_rest_min: number;
    effect_size: number;
    confidence: number;
    gate: 'PUBLISH' | 'DEGRADE' | 'REJECT';
  };
  message: string;
}

export interface VetReportLinkPayload {
  dogId: string;
  days: number;
  expiresInMinutes: number;
  url: string;
}

export type VetReportSharePrerequisiteCode =
  | 'vet_report_authentication_required'
  | 'vet_report_dog_selection_required';

export class VetReportSharePrerequisiteError extends Error {
  constructor(readonly code: VetReportSharePrerequisiteCode) {
    super(code);
    this.name = 'VetReportSharePrerequisiteError';
  }
}

export async function fetchAbsenceComparison(
  dogId: string,
  token?: string | null,
): Promise<AbsenceComparisonPayload> {
  if (!token) {
    return {
      dogId,
      days: 14,
      comparison: {
        present_vocal_events_per_hour: 2.1,
        absent_vocal_events_per_hour: 4.8,
        present_imu_agitation_index_mean: 1.3,
        absent_imu_agitation_index_mean: 3.7,
        present_mat_rest_min: 34,
        absent_mat_rest_min: 18,
        effect_size: 2.03,
        confidence: 0.62,
        gate: 'DEGRADE',
      },
      message: 'Mode demo: comparaison presence / absence construite localement.',
    };
  }

  return apiRequest<AbsenceComparisonPayload>(`/api/dogs/${dogId}/absence-comparison?days=14`, {
    token,
  });
}

export async function createVetReportShareLink(
  dogId: string,
  token?: string | null,
): Promise<VetReportLinkPayload> {
  const normalizedToken = token?.trim();
  if (!normalizedToken) {
    throw new VetReportSharePrerequisiteError('vet_report_authentication_required');
  }

  const normalizedDogId = dogId.trim();
  if (!normalizedDogId) {
    throw new VetReportSharePrerequisiteError('vet_report_dog_selection_required');
  }

  return apiRequest<VetReportLinkPayload>(
    `/api/dogs/${normalizedDogId}/vet-report-link?days=14`,
    { token: normalizedToken },
  );
}
