/**
 * use-v6-insights — client hook for future v6 ELI projections.
 *
 * No authoritative ELI API endpoint is selected or live at the current
 * repository boundary. The hook deliberately returns an empty state rather
 * than naming a phantom endpoint or substituting local/mock inference.
 *
 * Final endpoint shape and projection semantics are controlled by ELI-API-01
 * (#124) and the canonical runtime gate #118.
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

export const V6_INSIGHTS_RUNTIME_SOURCE = {
  status: 'UNWIRED',
  authoritative: false,
  endpoint: null,
} as const;

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
    // Intentionally fail closed: no backend producer/projection is authoritative
    // yet, so do not invent an endpoint or substitute locally computed values.
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
