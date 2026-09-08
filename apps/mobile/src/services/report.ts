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
  if (!dogId.trim()) {
    throw new Error('Aucun chien selectionne.');
  }
  if (!token) {
    throw new Error('Connexion requise pour charger une comparaison reelle.');
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
