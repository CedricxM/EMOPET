import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isRegionalKnowledgeEntryReleaseReady } from '../filter-knowledge';
import type { CultureEntry } from '../knowledge-types';

const NOW = Date.parse('2026-10-01T12:00:00Z');

function entry(overrides: Partial<CultureEntry> = {}): CultureEntry {
  return {
    id: 'fixture',
    theme: 'autre',
    title: 'Fixture',
    description: 'Synthetic regional knowledge fixture.',
    sourceVerified: true,
    evidence: {
      sourceId: 'fixture-source',
      sourceRef: 'fixture-record',
      reviewerRole: 'test reviewer',
      reviewedAt: '2026-09-30T10:00:00Z',
      provenanceNote: 'Synthetic test evidence only.',
    },
    _status: 'VERIFIED',
    ...overrides,
  };
}

test('regional knowledge release requires VERIFIED + sourceVerified + evidence', () => {
  assert.equal(isRegionalKnowledgeEntryReleaseReady(entry(), NOW), true);
  assert.equal(
    isRegionalKnowledgeEntryReleaseReady(entry({ _status: 'EXEMPLE_DEMO' }), NOW),
    false,
  );
  assert.equal(
    isRegionalKnowledgeEntryReleaseReady(entry({ sourceVerified: false }), NOW),
    false,
  );
  assert.equal(
    isRegionalKnowledgeEntryReleaseReady(entry({ evidence: undefined }), NOW),
    false,
  );
});

test('regional knowledge evidence rejects blank and future review metadata', () => {
  assert.equal(
    isRegionalKnowledgeEntryReleaseReady(
      entry({
        evidence: {
          sourceId: '',
          sourceRef: 'fixture-record',
          reviewerRole: 'test reviewer',
          reviewedAt: '2026-09-30T10:00:00Z',
          provenanceNote: 'Synthetic test evidence only.',
        },
      }),
      NOW,
    ),
    false,
  );

  assert.equal(
    isRegionalKnowledgeEntryReleaseReady(
      entry({
        evidence: {
          sourceId: 'fixture-source',
          sourceRef: 'fixture-record',
          reviewerRole: 'test reviewer',
          reviewedAt: '2027-01-01T00:00:00Z',
          provenanceNote: 'Synthetic test evidence only.',
        },
      }),
      NOW,
    ),
    false,
  );
});
