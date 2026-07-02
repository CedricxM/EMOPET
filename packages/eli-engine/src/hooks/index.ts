/**
 * EMOPET Inference Hook Pipeline
 *
 * Pre-inference hooks: context vetoes (ALLOW / DENY / MODIFY)
 * Post-inference hooks: confidence gating (PUBLISH / DEGRADE / REJECT / FLAG)
 *
 * Inspired by Claw Code's PreToolUse/PostToolUse hooks.
 */

import type { EmopetConfig } from '@emopet/shared';

// ─── Types ──────────────────────────────────────────────────────────

export interface InferenceContext {
  dog_id: string;
  timestamp: Date;
  config: EmopetConfig;

  // Sensor state
  minutes_since_high_activity: number;
  imu_shake_detected: boolean;
  collar_orientation_quality: number;
  ambient_temp_c: number;
  mat_weight_kg: number;
  dog_weight_kg: number;

  // Feature availability
  available_modalities: string[];
  suppressed_modalities: string[];
  weight_multipliers: Record<string, number>;
}

export interface PreInferenceResult {
  action: 'allow' | 'deny' | 'modify';
  reason?: string;
  modifications?: {
    suppress_modalities?: string[];
    weight_multiplier?: Record<string, number>;
  };
}

export interface PreInferenceHook {
  id: string;
  priority: number;
  execute: (ctx: InferenceContext) => PreInferenceResult;
}

export interface InferenceResult {
  confidence: number;
  eli_score: number;
  components: Record<string, number>;
  context_label: string;
}

export interface PostInferenceResult {
  action: 'publish' | 'degrade' | 'reject' | 'flag';
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface PostInferenceHook {
  id: string;
  priority: number;
  execute: (result: InferenceResult, ctx: InferenceContext) => PostInferenceResult;
}

// ─── Pre-Inference Hooks (Context Vetoes) ───────────────────────────

export const PRE_INFERENCE_HOOKS: PreInferenceHook[] = [
  {
    id: 'POST_EXERCISE',
    priority: 100,
    execute: (ctx) => {
      if (ctx.minutes_since_high_activity < 30) {
        return {
          action: 'modify',
          reason: 'Post-exercise recovery period',
          modifications: { suppress_modalities: ['pvdf_mat', 'piezo_tag'] },
        };
      }
      return { action: 'allow' };
    },
  },
  {
    id: 'BODY_SHAKE',
    priority: 99,
    execute: (ctx) => {
      if (ctx.imu_shake_detected) {
        return { action: 'deny', reason: 'Body shake artifact detected' };
      }
      return { action: 'allow' };
    },
  },
  {
    id: 'COLLAR_MISPOSITION',
    priority: 98,
    execute: (ctx) => {
      if (ctx.collar_orientation_quality < 0.3) {
        return { action: 'deny', reason: 'Collar not in ventral position' };
      }
      return { action: 'allow' };
    },
  },
  {
    id: 'HEAT_PANTING',
    priority: 95,
    execute: (ctx) => {
      if (ctx.ambient_temp_c > ctx.config.heat_alert_threshold_c) {
        return {
          action: 'modify',
          reason: 'Heat panting — RR unreliable',
          modifications: { suppress_modalities: ['pvdf_mat'] },
        };
      }
      return { action: 'allow' };
    },
  },
  {
    id: 'MULTI_DOG_MAT',
    priority: 90,
    execute: (ctx) => {
      if (ctx.mat_weight_kg > ctx.dog_weight_kg * 1.3) {
        return {
          action: 'modify',
          reason: 'Multiple dogs detected on MAT',
          modifications: { suppress_modalities: ['pvdf_mat'] },
        };
      }
      return { action: 'allow' };
    },
  },
  {
    id: 'POST_MEAL',
    priority: 85,
    execute: (_ctx) => {
      // Post-meal RR elevation (20 min window) — suppress PVDF
      // Placeholder: actual meal detection comes from activity patterns
      return { action: 'allow' };
    },
  },
];

// ─── Post-Inference Hooks (Confidence Gating) ──────────────────────

export const POST_INFERENCE_HOOKS: PostInferenceHook[] = [
  {
    id: 'CONFIDENCE_GATE',
    priority: 100,
    execute: (result, ctx) => {
      if (result.confidence >= ctx.config.eli_publish_threshold) {
        return { action: 'publish' };
      }
      if (result.confidence >= ctx.config.eli_degrade_threshold) {
        return {
          action: 'degrade',
          reason: `Confidence ${result.confidence.toFixed(2)} below publish threshold ${ctx.config.eli_publish_threshold}`,
        };
      }
      return {
        action: 'reject',
        reason: `Confidence ${result.confidence.toFixed(2)} below degrade threshold ${ctx.config.eli_degrade_threshold}`,
      };
    },
  },
  {
    id: 'ANOMALY_FLAG',
    priority: 90,
    execute: (result) => {
      // Flag extreme deviations for review even if confidence is ok
      const extremeDeviation = Object.values(result.components).some((v) => Math.abs(v) > 3.0);
      if (extremeDeviation && result.confidence >= 0.70) {
        return {
          action: 'flag',
          reason: 'Extreme deviation detected despite high confidence',
          metadata: { components: result.components },
        };
      }
      return { action: 'publish' };
    },
  },
];

// ─── Pipeline Runner ────────────────────────────────────────────────

export interface HookPipelineResult {
  status: 'published' | 'degraded' | 'rejected' | 'skipped' | 'flagged';
  reason?: string;
  hook_id?: string;
  suppressed_modalities: string[];
  weight_multipliers: Record<string, number>;
}

export function runPreInferenceHooks(
  ctx: InferenceContext,
  hooks: PreInferenceHook[] = PRE_INFERENCE_HOOKS,
): HookPipelineResult | null {
  const sorted = [...hooks].sort((a, b) => b.priority - a.priority);
  const suppressed: string[] = [...ctx.suppressed_modalities];
  const weights: Record<string, number> = { ...ctx.weight_multipliers };

  for (const hook of sorted) {
    const result = hook.execute(ctx);
    if (result.action === 'deny') {
      return {
        status: 'skipped',
        reason: result.reason,
        hook_id: hook.id,
        suppressed_modalities: suppressed,
        weight_multipliers: weights,
      };
    }
    if (result.action === 'modify' && result.modifications) {
      if (result.modifications.suppress_modalities) {
        suppressed.push(...result.modifications.suppress_modalities);
      }
      if (result.modifications.weight_multiplier) {
        Object.assign(weights, result.modifications.weight_multiplier);
      }
    }
  }

  return null; // All hooks passed → proceed to inference
}

export function runPostInferenceHooks(
  result: InferenceResult,
  ctx: InferenceContext,
  hooks: PostInferenceHook[] = POST_INFERENCE_HOOKS,
): HookPipelineResult {
  const sorted = [...hooks].sort((a, b) => b.priority - a.priority);

  for (const hook of sorted) {
    const postResult = hook.execute(result, ctx);
    if (postResult.action !== 'publish') {
      return {
        status: postResult.action === 'degrade' ? 'degraded' : postResult.action === 'flag' ? 'flagged' : 'rejected',
        reason: postResult.reason,
        hook_id: hook.id,
        suppressed_modalities: ctx.suppressed_modalities,
        weight_multipliers: ctx.weight_multipliers,
      };
    }
  }

  return {
    status: 'published',
    suppressed_modalities: ctx.suppressed_modalities,
    weight_multipliers: ctx.weight_multipliers,
  };
}
