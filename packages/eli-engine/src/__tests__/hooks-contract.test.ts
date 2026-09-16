/**
 * Contract regression for the engine-local post-inference hook boundary.
 *
 * This test intentionally exercises only the existing hook/gating semantics.
 * It does not validate the scientific/model meaning of ELI outputs and does
 * not turn the hook candidate into the shared cross-surface InferenceResult.
 */

import { SYSTEM_DEFAULTS } from '@emopet/shared';
import { describe, expect, it } from 'vitest';

import {
  runPostInferenceHooks,
  type InferenceContext,
  type PostInferenceCandidate,
} from '../hooks/index.js';

const context: InferenceContext = {
  dog_id: 'contract-test-dog',
  timestamp: new Date('2026-09-02T12:00:00Z'),
  config: SYSTEM_DEFAULTS,
  minutes_since_high_activity: 60,
  imu_shake_detected: false,
  collar_orientation_quality: 1,
  ambient_temp_c: 20,
  mat_weight_kg: 20,
  dog_weight_kg: 20,
  available_modalities: ['pvdf_mat', 'piezo_tag'],
  suppressed_modalities: [],
  weight_multipliers: {},
};

function candidate(confidence: number): PostInferenceCandidate {
  return {
    confidence,
    eli_score: 0,
    components: {},
    context_label: 'contract-test',
  };
}

describe('post-inference hook contract', () => {
  it('publishes at the existing publish threshold boundary', () => {
    expect(runPostInferenceHooks(candidate(0.70), context).status).toBe('published');
  });

  it('degrades at the existing degrade threshold boundary', () => {
    const result = runPostInferenceHooks(candidate(0.40), context);
    expect(result.status).toBe('degraded');
    expect(result.hook_id).toBe('CONFIDENCE_GATE');
  });

  it('rejects below the existing degrade threshold', () => {
    const result = runPostInferenceHooks(candidate(0.39), context);
    expect(result.status).toBe('rejected');
    expect(result.hook_id).toBe('CONFIDENCE_GATE');
  });
});
