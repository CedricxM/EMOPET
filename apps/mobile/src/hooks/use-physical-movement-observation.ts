import { useEffect, useState } from 'react';

import type { EliPhysicalMovementApiResponse } from '@emopet/shared';

import { fetchPhysicalMovementObservation } from '../services/eli-physical-movement';

export interface PhysicalMovementObservationState {
  response: EliPhysicalMovementApiResponse | null;
  loading: boolean;
  error: string | null;
}

export function usePhysicalMovementObservation(
  dogId: string | null,
  token: string | null,
): PhysicalMovementObservationState {
  const [response, setResponse] = useState<EliPhysicalMovementApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setResponse(null);
    setError(null);

    if (!dogId || !token) {
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    setLoading(true);
    fetchPhysicalMovementObservation(dogId, token)
      .then((value) => {
        if (mounted) setResponse(value);
      })
      .catch((reason: unknown) => {
        if (mounted) {
          setError(reason instanceof Error ? reason.message : 'Observation indisponible.');
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [dogId, token]);

  return { response, loading, error };
}
