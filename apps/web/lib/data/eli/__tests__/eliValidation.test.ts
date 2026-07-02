import assert from 'node:assert/strict';
import test from 'node:test';
import { estimateSignalConstraintsFromDogProfile } from '../dogProfile.schema';
import { runMockEliPipeline } from '../mockEliPipeline';
import {
  LOW_QUALITY_MAT_EVENTS,
  MOCK_APP_OBSERVATIONS,
  MOCK_DOG_PROFILE,
  MOCK_MAT_EVENTS,
  MOCK_TAG_EVENTS,
} from '../mockSensorEvents';

test('ELI validation returns mock output only for adequate signal quality', () => {
  const output = runMockEliPipeline({
    profile: MOCK_DOG_PROFILE,
    mat_events: MOCK_MAT_EVENTS,
    tag_events: MOCK_TAG_EVENTS,
    app_observations: MOCK_APP_OBSERVATIONS,
  });
  assert.equal(output.status, 'mock_output');
  assert.equal(output.validated, false);
  assert.ok(output.confidence > 70);
});

test('ELI validation refuses low quality data', () => {
  const output = runMockEliPipeline({
    profile: MOCK_DOG_PROFILE,
    mat_events: LOW_QUALITY_MAT_EVENTS,
    tag_events: MOCK_TAG_EVENTS,
    app_observations: MOCK_APP_OBSERVATIONS,
  });
  assert.equal(output.status, 'insufficient_data');
  assert.ok(output.labels.includes('insufficient_data'));
});

test('Dog profile signal constraints are technical notes only', () => {
  const constraints = estimateSignalConstraintsFromDogProfile(MOCK_DOG_PROFILE);
  assert.ok(constraints.notes.includes('possible_fur_related_signal_damping'));
  assert.ok(!constraints.notes.includes('no_constraint_known'));
});

test('ELI validation rejects non finite sensor values', () => {
  const output = runMockEliPipeline({
    profile: MOCK_DOG_PROFILE,
    mat_events: [{ ...MOCK_MAT_EVENTS[0]!, signal_quality: Number.NaN }],
    tag_events: MOCK_TAG_EVENTS,
    app_observations: MOCK_APP_OBSERVATIONS,
  });
  assert.equal(output.status, 'invalid_input');
  assert.ok(output.labels.includes('insufficient_data'));
});