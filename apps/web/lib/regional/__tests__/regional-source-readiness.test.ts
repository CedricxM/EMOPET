import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { BreizSourceDescriptor } from '../../data/breiz/sourceRegistry';
import { BRETAGNE_REGIONAL_PACK } from '../profiles/bretagne-pack';
import { evaluateRegionalSourceReadiness } from '../regional-source-readiness';

const NOW = Date.parse('2026-10-01T12:00:00Z');
const EXPIRED = Date.parse('2026-10-01T14:00:00Z');

function clockFixture(
  overrides: Partial<BreizSourceDescriptor> = {},
): BreizSourceDescriptor {
  return {
    id: 'clock-fixture',
    name: 'Clock fixture',
    publisher: 'Fixture publisher',
    canonicalUrl: 'https://example.invalid/clock',
    territory: 'Bretagne',
    accessMode: 'api',
    authority: 'official',
    usagePolicy: ['ATTRIBUTION_REQUIRED'],
    license: 'Licence Ouverte 2.0',
    freshnessHours: 24,
    enabled: true,
    notes: '',
    rightsEvidence: {
      authorityRevision: 'clock-rights-v1',
      immutableSourceVersion: 'clock-source-v1',
      receiptPath: 'docs/control/fixtures/clock-rights.md',
      attributionText: 'Fixture publisher',
      permittedUseSummary: 'Deterministic readiness clock fixture.',
      allowedProductUses: ['INGESTION', 'PUBLIC_ANSWER_WITH_SOURCE'],
      reviewedAt: '2026-10-01T10:00:00Z',
      reviewerRole: 'test rights reviewer',
      recheckAt: '2026-10-01T13:00:00Z',
      evidenceState: 'SOURCE_CONFIRMED',
      disposition: 'GO',
    },
    ...overrides,
  };
}

test('source-scoped readiness uses one injected authority clock', () => {
  const fixture = clockFixture();
  const lookup = (id: string) => (id === fixture.id ? fixture : undefined);

  const valid = evaluateRegionalSourceReadiness(
    { sourceId: fixture.id },
    NOW,
    lookup,
  );
  assert.equal(valid.effectiveIngestionPermitted, true);
  assert.equal(valid.releaseReady, true);
  assert.deepEqual(valid.sourceRightsBlockers, []);

  const expired = evaluateRegionalSourceReadiness(
    { sourceId: fixture.id },
    EXPIRED,
    lookup,
  );
  assert.equal(expired.effectiveIngestionPermitted, false);
  assert.equal(expired.releaseReady, false);
  assert.ok(
    expired.sourceRightsBlockers.includes('RIGHTS_EVIDENCE_OUT_OF_WINDOW'),
  );
  assert.ok(
    expired.effectiveBlockers.includes(
      'SOURCE_BLOCKER:RIGHTS_EVIDENCE_OUT_OF_WINDOW',
    ),
  );
});

test('dataset-scoped parent diagnostics use the same injected authority clock', () => {
  const fixture = clockFixture({ id: 'region-bretagne-open-data' });
  const lookup = (id: string) => (id === fixture.id ? fixture : undefined);
  const request = {
    sourceId: fixture.id,
    readinessScope: {
      kind: 'BRETAGNE_OPEN_DATA_DATASETS' as const,
      datasetIds: ['reserves-naturelles-regionales-de-bretagne'],
    },
  };

  const valid = evaluateRegionalSourceReadiness(request, NOW, lookup);
  assert.equal(
    valid.sourceRightsBlockers.includes('RIGHTS_EVIDENCE_OUT_OF_WINDOW'),
    false,
  );

  const expired = evaluateRegionalSourceReadiness(request, EXPIRED, lookup);
  assert.ok(
    expired.sourceRightsBlockers.includes('RIGHTS_EVIDENCE_OUT_OF_WINDOW'),
  );
});

test('Bretagne territorial binding uses exact dataset-scoped readiness', () => {
  const binding = BRETAGNE_REGIONAL_PACK.sourceBindings.find(
    (entry) => entry.sourceId === 'region-bretagne-open-data',
  );

  assert.ok(binding);
  assert.deepEqual(binding.readinessScope, {
    kind: 'BRETAGNE_OPEN_DATA_DATASETS',
    datasetIds: ['reserves-naturelles-regionales-de-bretagne'],
  });

  const verdict = evaluateRegionalSourceReadiness(binding, NOW);

  assert.equal(verdict.sourceKnown, true);
  assert.equal(verdict.readinessKind, 'BRETAGNE_OPEN_DATA_DATASETS');
  assert.equal(verdict.releaseReady, false);
  assert.deepEqual(verdict.readyScopedResourceIds, []);
  assert.deepEqual(verdict.scopedResourceIds, [
    'reserves-naturelles-regionales-de-bretagne',
  ]);

  assert.ok(
    verdict.effectiveBlockers.includes(
      'DATASET_BLOCKER:reserves-naturelles-regionales-de-bretagne:DATASET_NOT_RELEASE_READY',
    ),
  );
  assert.ok(
    verdict.effectiveBlockers.includes(
      'DATASET_BLOCKER:reserves-naturelles-regionales-de-bretagne:NO_APPROVED_FIELDS',
    ),
  );
  assert.ok(
    verdict.effectiveBlockers.includes(
      'DATASET_BLOCKER:reserves-naturelles-regionales-de-bretagne:NO_SCHEMA_EVIDENCE',
    ),
  );
  assert.ok(
    verdict.effectiveBlockers.includes(
      'DATASET_BLOCKER:reserves-naturelles-regionales-de-bretagne:NO_DATASET_RIGHTS_EVIDENCE',
    ),
  );
});

test('dataset scope does not mistake parent catalogue licence-null for the effective dataset blocker', () => {
  const binding = BRETAGNE_REGIONAL_PACK.sourceBindings.find(
    (entry) => entry.sourceId === 'region-bretagne-open-data',
  );
  assert.ok(binding);

  const verdict = evaluateRegionalSourceReadiness(binding, NOW);

  assert.ok(verdict.sourceRightsBlockers.includes('NO_LICENCE_RECEIPT'));
  assert.equal(
    verdict.effectiveBlockers.includes(
      'SOURCE_BLOCKER:NO_LICENCE_RECEIPT',
    ),
    false,
  );
});

test('dataset-scoped readiness fails closed on source mismatch or empty resource scope', () => {
  const wrongSource = evaluateRegionalSourceReadiness(
    {
      sourceId: 'data-gouv-fr',
      readinessScope: {
        kind: 'BRETAGNE_OPEN_DATA_DATASETS',
        datasetIds: ['reserves-naturelles-regionales-de-bretagne'],
      },
    },
    NOW,
  );

  assert.equal(wrongSource.releaseReady, false);
  assert.ok(wrongSource.effectiveBlockers.includes('SCOPED_SOURCE_MISMATCH'));

  const empty = evaluateRegionalSourceReadiness(
    {
      sourceId: 'region-bretagne-open-data',
      readinessScope: {
        kind: 'BRETAGNE_OPEN_DATA_DATASETS',
        datasetIds: [],
      },
    },
    NOW,
  );

  assert.equal(empty.releaseReady, false);
  assert.ok(empty.effectiveBlockers.includes('NO_SCOPED_RESOURCE'));
});

test('ordinary source-scoped bindings keep the generic source-rights gate', () => {
  const datatourisme = BRETAGNE_REGIONAL_PACK.sourceBindings.find(
    (entry) => entry.sourceId === 'datatourisme',
  );
  assert.ok(datatourisme);

  const verdict = evaluateRegionalSourceReadiness(datatourisme, NOW);

  assert.equal(verdict.readinessKind, 'SOURCE');
  assert.equal(verdict.releaseReady, false);
  assert.ok(verdict.sourceRightsBlockers.includes('SOURCE_DISABLED'));
  assert.ok(verdict.sourceRightsBlockers.includes('NO_LICENCE_RECEIPT'));
  assert.ok(
    verdict.effectiveBlockers.includes('SOURCE_BLOCKER:SOURCE_DISABLED'),
  );
});
