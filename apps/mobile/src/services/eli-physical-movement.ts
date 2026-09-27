import type { EliPhysicalMovementApiResponse } from '@emopet/shared';

import { apiRequest } from './api';

export function fetchPhysicalMovementObservation(
  dogId: string,
  token: string,
): Promise<EliPhysicalMovementApiResponse> {
  return apiRequest<EliPhysicalMovementApiResponse>(
    `/api/sensors/eli/${encodeURIComponent(dogId)}/physical-movement`,
    { token },
  );
}
