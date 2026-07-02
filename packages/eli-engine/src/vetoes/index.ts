/**
 * Context veto pipeline — V1 through V11.
 *
 * Each veto inspects a FeatureVector + VetoContext and returns a
 * VetoDecision. A `DENY` short-circuits the pipeline and suppresses
 * the inference update entirely; a `MODIFY` lets the inference proceed
 * but with adjusted modality suppression/weights; `ALLOW` is a no-op.
 *
 * v5 foundation: V1 Post-exercise, V2 Heat panting, V3 Return-home,
 * V4 Body-shake, V5 Collar misposition, V6 Ambient noise, V7 Multi-dog
 * MAT, V8 Recent meal, V9 Estrous cycle, V10 Brachy heat.
 *
 * v6 addition: V11 High animal interaction (Siguín et al. 2025, F10).
 *
 * The pipeline returns the decision chain for audit; V11 is always run
 * LAST so it cannot hide earlier structural issues.
 */

import type { FeatureVector } from '@emopet/shared';

export type VetoAction = 'ALLOW' | 'DENY' | 'MODIFY';

export interface VetoDecision {
  veto_id: string;
  action: VetoAction;
  reason: string;
  /** Optional: modalities to force-suppress for this update. */
  suppress?: string[];
  /** Optional: per-observation weight multiplier (<1 dampens). */
  weight_multipliers?: Record<string, number>;
  /** Optional: cooldown duration in minutes after which veto auto-clears. */
  cooldown_minutes?: number;
  /** Scientific reference for documentation/audit. */
  reference?: string;
}

export interface VetoContext {
  dogId: string;
  minutes_since_high_activity: number;
  minutes_since_return_home: number;
  minutes_since_meal: number;
  collar_orientation_quality: number;   // 0..1, 1 = perfectly ventral
  ambient_noise_db: number;
  mat_weight_kg: number;
  dog_weight_kg: number;
  is_brachycephalic: boolean;
  heat_alert_threshold_c: number;
  estrous_window: boolean;               // owner-reported, optional
}

export type VetoFn = (fv: FeatureVector, ctx: VetoContext) => VetoDecision;

// ── V1 Post-exercise ─────────────────────────────────────────────
export const veto_v1_post_exercise: VetoFn = (_fv, ctx) => {
  if (ctx.minutes_since_high_activity < 30) {
    return {
      veto_id: 'V1_POST_EXERCISE',
      action: 'MODIFY',
      reason: 'Post-exercise RR recovery window (<30 min)',
      suppress: ['pvdf'],
      reference: 'Brugarolas 2015',
    };
  }
  return { veto_id: 'V1_POST_EXERCISE', action: 'ALLOW', reason: 'OK' };
};

// ── V2 Heat panting ──────────────────────────────────────────────
export const veto_v2_heat_panting: VetoFn = (fv, ctx) => {
  const temp = fv.ambient_temp_c ?? 20;
  if (temp > ctx.heat_alert_threshold_c) {
    return {
      veto_id: 'V2_HEAT_PANTING',
      action: 'MODIFY',
      reason: `Ambient ${temp.toFixed(1)}°C > threshold — panting not emotional`,
      suppress: ['pvdf'],
      reference: 'Siguin 2025 F7',
    };
  }
  return { veto_id: 'V2_HEAT_PANTING', action: 'ALLOW', reason: 'OK' };
};

// ── V3 Return-home spike ─────────────────────────────────────────
export const veto_v3_return_home: VetoFn = (_fv, ctx) => {
  if (ctx.minutes_since_return_home < 10) {
    return {
      veto_id: 'V3_RETURN_HOME',
      action: 'DENY',
      reason: 'Greeting activation <10 min after owner return — not an emotional state',
      cooldown_minutes: 10,
    };
  }
  return { veto_id: 'V3_RETURN_HOME', action: 'ALLOW', reason: 'OK' };
};

// ── V4 Body-shake artifact ───────────────────────────────────────
export const veto_v4_body_shake: VetoFn = (fv, _ctx) => {
  // Body-shake signature: gyro_std very high briefly with low lateral — firmware flag preferred
  if ((fv.gyro_std_deg_s ?? 0) > 400 && (fv.lateral_acc_rms ?? 0) < 0.3) {
    return {
      veto_id: 'V4_BODY_SHAKE',
      action: 'DENY',
      reason: 'Whole-body shake artifact in IMU',
    };
  }
  return { veto_id: 'V4_BODY_SHAKE', action: 'ALLOW', reason: 'OK' };
};

// ── V5 Collar misposition ────────────────────────────────────────
export const veto_v5_collar_misposition: VetoFn = (_fv, ctx) => {
  if (ctx.collar_orientation_quality < 0.3) {
    return {
      veto_id: 'V5_COLLAR_MISPOSITION',
      action: 'DENY',
      reason: 'Collar not in ventral position',
    };
  }
  return { veto_id: 'V5_COLLAR_MISPOSITION', action: 'ALLOW', reason: 'OK' };
};

// ── V6 Ambient noise ─────────────────────────────────────────────
export const veto_v6_ambient_noise: VetoFn = (_fv, ctx) => {
  if (ctx.ambient_noise_db > 75) {
    return {
      veto_id: 'V6_AMBIENT_NOISE',
      action: 'MODIFY',
      reason: `Ambient noise ${ctx.ambient_noise_db} dB — vocal features unreliable`,
      suppress: ['mic'],
    };
  }
  return { veto_id: 'V6_AMBIENT_NOISE', action: 'ALLOW', reason: 'OK' };
};

// ── V7 Multi-dog MAT ─────────────────────────────────────────────
export const veto_v7_multi_dog_mat: VetoFn = (_fv, ctx) => {
  if (ctx.mat_weight_kg > ctx.dog_weight_kg * 1.3) {
    return {
      veto_id: 'V7_MULTI_DOG_MAT',
      action: 'MODIFY',
      reason: 'Multiple occupants detected on MAT',
      suppress: ['pvdf', 'loadCells'],
    };
  }
  return { veto_id: 'V7_MULTI_DOG_MAT', action: 'ALLOW', reason: 'OK' };
};

// ── V8 Recent meal ───────────────────────────────────────────────
export const veto_v8_recent_meal: VetoFn = (_fv, ctx) => {
  if (ctx.minutes_since_meal < 20) {
    return {
      veto_id: 'V8_RECENT_MEAL',
      action: 'MODIFY',
      reason: 'Post-prandial RR elevation (<20 min)',
      suppress: ['pvdf'],
    };
  }
  return { veto_id: 'V8_RECENT_MEAL', action: 'ALLOW', reason: 'OK' };
};

// ── V9 Estrous cycle ─────────────────────────────────────────────
export const veto_v9_estrous_cycle: VetoFn = (_fv, ctx) => {
  if (ctx.estrous_window) {
    return {
      veto_id: 'V9_ESTROUS_CYCLE',
      action: 'MODIFY',
      reason: 'Estrous window — baseline drift expected',
      weight_multipliers: { rr_variability: 0.5, activity_variability: 0.5 },
    };
  }
  return { veto_id: 'V9_ESTROUS_CYCLE', action: 'ALLOW', reason: 'OK' };
};

// ── V10 Brachy heat ──────────────────────────────────────────────
export const veto_v10_brachy_heat: VetoFn = (fv, ctx) => {
  const temp = fv.ambient_temp_c ?? 20;
  if (ctx.is_brachycephalic && temp > ctx.heat_alert_threshold_c - 4) {
    return {
      veto_id: 'V10_BRACHY_HEAT',
      action: 'MODIFY',
      reason: 'Brachycephalic dog in warm conditions — RR always elevated',
      suppress: ['pvdf'],
      reference: 'Siguin 2025 F7, BSAVA Ch.15',
    };
  }
  return { veto_id: 'V10_BRACHY_HEAT', action: 'ALLOW', reason: 'OK' };
};

// ── V11 High animal interaction (v6) ─────────────────────────────
/**
 * Detects intense inter-dog interactions via IMU + mic pattern.
 * Requires 3 of 4 conditions:
 *   lateral_acc_rms > 0.6 g, ODBA > 3.0 g, gyro_std > 200 deg/s, vocal event.
 * Reference: Siguín et al. (2025) Results in Engineering, factor F10.
 */
export const veto_v11_high_animal_interaction: VetoFn = (fv, _ctx) => {
  if (fv.lateral_acc_rms == null) {
    return { veto_id: 'V11_HIGH_ANIMAL_INTERACTION', action: 'ALLOW', reason: 'No kinematic data' };
  }
  const flags = [
    (fv.lateral_acc_rms ?? 0) > 0.6,
    (fv.odba_mean ?? 0) > 3.0,
    (fv.gyro_std_deg_s ?? 0) > 200,
    fv.vocal_event_in_window,
  ];
  const active = flags.filter(Boolean).length;
  if (active >= 3) {
    return {
      veto_id: 'V11_HIGH_ANIMAL_INTERACTION',
      action: 'DENY',
      reason: `Inter-dog interaction pattern (${active}/4 conditions) — arousal ≠ emotional state`,
      cooldown_minutes: 5,
      reference: 'Siguin 2025 F10',
    };
  }
  return { veto_id: 'V11_HIGH_ANIMAL_INTERACTION', action: 'ALLOW', reason: 'OK' };
};

// ── Pipeline ─────────────────────────────────────────────────────

export const VETO_PIPELINE: VetoFn[] = [
  veto_v1_post_exercise,
  veto_v2_heat_panting,
  veto_v3_return_home,
  veto_v4_body_shake,
  veto_v5_collar_misposition,
  veto_v6_ambient_noise,
  veto_v7_multi_dog_mat,
  veto_v8_recent_meal,
  veto_v9_estrous_cycle,
  veto_v10_brachy_heat,
  veto_v11_high_animal_interaction,
];

export interface VetoPipelineResult {
  decisions: VetoDecision[];
  /** First DENY veto id if the pipeline short-circuited. */
  denyingVeto: string | null;
  /** Accumulated modality suppression from all MODIFY decisions. */
  suppress: string[];
  /** Accumulated weight multipliers from all MODIFY decisions. */
  weight_multipliers: Record<string, number>;
}

export function runVetoPipeline(
  fv: FeatureVector,
  ctx: VetoContext,
  vetoes: VetoFn[] = VETO_PIPELINE,
): VetoPipelineResult {
  const decisions: VetoDecision[] = [];
  const suppress: string[] = [];
  const weight_multipliers: Record<string, number> = {};
  let denyingVeto: string | null = null;

  for (const v of vetoes) {
    const d = v(fv, ctx);
    decisions.push(d);
    if (d.action === 'DENY') {
      denyingVeto = d.veto_id;
      break;
    }
    if (d.action === 'MODIFY') {
      if (d.suppress) suppress.push(...d.suppress);
      if (d.weight_multipliers) {
        for (const [k, m] of Object.entries(d.weight_multipliers)) {
          weight_multipliers[k] = (weight_multipliers[k] ?? 1) * m;
        }
      }
    }
  }

  return { decisions, denyingVeto, suppress, weight_multipliers };
}

export const VETO_IDS = [
  'V1_POST_EXERCISE',
  'V2_HEAT_PANTING',
  'V3_RETURN_HOME',
  'V4_BODY_SHAKE',
  'V5_COLLAR_MISPOSITION',
  'V6_AMBIENT_NOISE',
  'V7_MULTI_DOG_MAT',
  'V8_RECENT_MEAL',
  'V9_ESTROUS_CYCLE',
  'V10_BRACHY_HEAT',
  'V11_HIGH_ANIMAL_INTERACTION',
] as const;
