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

/**
 * Generic bearer-link generation was retired from the mobile release path under
 * #64. Professional sharing must use a recipient-bound durable grant once that
 * backend authority exists.
 */
export const PROFESSIONAL_SHARE_STATUS = 'RECIPIENT_BOUND_GRANT_REQUIRED' as const;
