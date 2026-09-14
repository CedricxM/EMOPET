import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BREIZ_SOURCE_REGISTRY,
  getBreizReleaseReadySources,
  isBreizSourceReleaseReady,
  type BreizRightsEvidence,
  type BreizSourceDescriptor,
} from '../data/breiz/sourceRegistry';

const NOW = Date.parse('2026-09-13T12:00:00.000Z');

const baseSource: BreizSourceDescriptor = {
  id: 'test-source',
  name: 'Test source',
  publisher: 'Test publisher',
  canonicalUrl: 'https://example.test/source',
  territory: 'France',
  accessMode: 'api',
  authority: 'official',
  usagePolicy: ['ATTRIBUTION_REQUIRED'],
  license: null,
  freshnessHours: 24,
  enabled: true,
  notes: 'test-only descriptor',
};

const validEvidence: BreizRightsEvidence = {
  immutableVersion: 'v1.2.3',
  receiptPath: 'data/registry/receipts/test-source.json',
  attributionText: 'Example attribution',
  permittedUseSummary: 'Test-only reviewed use',
  reviewedAt: '2026-09-01T10:00:00.000Z',
  reviewerRole: 'Data owner',
  recheckAt: '2026-10-01T00:00:00.000Z',
  evidenceState: 'SOURCE_CONFIRMED',
  disposition: 'GO',
};

function sourceWithEvidence(
  evidencePatch: Partial<BreizRightsEvidence> = {},
  sourcePatch: Partial<BreizSourceDescriptor> = {},
): BreizSourceDescriptor {
  return {
    ...baseSource,
    ...sourcePatch,
    rightsEvidence: { ...validEvidence, ...evidencePatch },
  };
}

test('DATA-LIC-G6: enabled catalogue rows are not release authority by themselves', () => {
  const enabledIds = BREIZ_SOURCE_REGISTRY
    .filter((source) => source.enabled)
    .map((source) => source.id)
    .sort();

  assert.deepEqual(enabledIds, ['data-gouv-fr', 'region-bretagne-open-data']);
  assert.deepEqual(getBreizReleaseReadySources(NOW), []);

  for (const source of BREIZ_SOURCE_REGISTRY.filter((entry) => entry.enabled)) {
    assert.equal(source.rightsEvidence, undefined);
    assert.equal(isBreizSourceReleaseReady(source, NOW), false);
  }
});

test('DATA-LIC-G6: complete reviewed evidence is required before release readiness', () => {
  assert.equal(isBreizSourceReleaseReady(sourceWithEvidence(), NOW), true);

  assert.equal(
    isBreizSourceReleaseReady(sourceWithEvidence({}, { enabled: false }), NOW),
    false,
  );
  assert.equal(
    isBreizSourceReleaseReady(sourceWithEvidence({ evidenceState: 'OPEN' }), NOW),
    false,
  );
  assert.equal(
    isBreizSourceReleaseReady(sourceWithEvidence({ disposition: 'HOLD' }), NOW),
    false,
  );
  assert.equal(
    isBreizSourceReleaseReady(sourceWithEvidence({ receiptPath: '   ' }), NOW),
    false,
  );
  assert.equal(
    isBreizSourceReleaseReady(sourceWithEvidence({ attributionText: '' }), NOW),
    false,
  );
});

test('DATA-LIC-G6: invalid, future or expired review timing fails closed', () => {
  assert.equal(
    isBreizSourceReleaseReady(sourceWithEvidence({ reviewedAt: 'not-a-date' }), NOW),
    false,
  );
  assert.equal(
    isBreizSourceReleaseReady(
      sourceWithEvidence({ reviewedAt: '2026-09-14T00:00:00.000Z' }),
      NOW,
    ),
    false,
  );
  assert.equal(
    isBreizSourceReleaseReady(
      sourceWithEvidence({ recheckAt: '2026-09-13T12:00:00.000Z' }),
      NOW,
    ),
    false,
  );
  assert.equal(
    isBreizSourceReleaseReady(sourceWithEvidence({ recheckAt: 'invalid' }), NOW),
    false,
  );

  assert.equal(
    isBreizSourceReleaseReady(sourceWithEvidence({ recheckAt: null }), NOW),
    true,
  );
});
