import assert from 'node:assert/strict';
import { test } from 'node:test';

import { BRETAGNE_REGIONAL_PACK } from '../profiles/bretagne-pack';
import { evaluateRegionalSourceReadiness } from '../regional-source-readiness';

const NOW = Date.parse('2026-10-01T12:00:00Z');

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
