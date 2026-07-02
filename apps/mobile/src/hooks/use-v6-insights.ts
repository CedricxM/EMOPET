/**
 * use-v6-insights — client hook returning the v6 additions of the latest
 * InferenceResult for display on the home and ELI detail screens.
 *
 * For now this reads from local state only; once the inference API is
 * live, swap the body for a TanStack Query call against /api/eli/latest.
 */

import { useEffect, useState } from 'react';

import type { AnticipationDetected, RecoverySpeedCurrent } from '@emopet/shared';

export interface V6Insights {
  dogName: string;
  anticipation: AnticipationDetected | null;
  recoverySpeed: RecoverySpeedCurrent | null;
  recoveryBaselineMinutes: number | null;
  firmwareVersionMat: string;
  firmwareVersionTag: string;
}

const EMPTY: V6Insights = {
  dogName: '',
  anticipation: null,
  recoverySpeed: null,
  recoveryBaselineMinutes: null,
  firmwareVersionMat: 'unknown',
  firmwareVersionTag: 'unknown',
};

export function useV6Insights(): V6Insights {
  const [insights, setInsights] = useState<V6Insights>(EMPTY);

  useEffect(() => {
    // Placeholder wiring: real impl will call the backend. Kept side-effect
    // free so snapshot tests stay deterministic.
    setInsights(EMPTY);
  }, []);

  return insights;
}

/** Minimum recovery deviation (%) to surface the tooltip in the UI. */
export const RECOVERY_TOOLTIP_MIN_DEVIATION_PCT = 15;

/**
 * True when the anticipation card should be visible on home:
 *   detection_threshold_met AND user has not dismissed it in the last 7 days.
 */
export function shouldShowAnticipationCard(
  insights: V6Insights,
  lastDismissedAt: Date | null,
): boolean {
  if (!insights.anticipation?.detection_threshold_met) return false;
  if (lastDismissedAt == null) return true;
  const ageDays = (Date.now() - lastDismissedAt.getTime()) / 86_400_000;
  return ageDays > 7;
}

/** True when the recovery tooltip should be surfaced on the ELI card. */
export function shouldShowRecoveryTooltip(insights: V6Insights): boolean {
  const rs = insights.recoverySpeed;
  if (rs == null) return false;
  return Math.abs(rs.deviation_from_baseline_pct) > RECOVERY_TOOLTIP_MIN_DEVIATION_PCT;
}
