import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  auditCurrentMotsPetFrEnSemantics,
  auditMotsPetSemanticCoverage,
  buildMotsPetLocaleProjection,
  compareMotsPetLocaleSemantics,
  type MotsPetLocaleProjection,
} from '../motspet-semantic-qa';

test('every controlled MotsPet concept has a complete semantic contract', () => {
  assert.deepEqual(auditMotsPetSemanticCoverage(), []);
});

test('FR and EN projections preserve the same semantic ceiling', () => {
  const fr = buildMotsPetLocaleProjection('fr');
  const en = buildMotsPetLocaleProjection('en');

  assert.ok(fr.length > 0);
  assert.equal(fr.length, en.length);
  assert.deepEqual(auditCurrentMotsPetFrEnSemantics(), []);

  for (const projection of [...fr, ...en]) {
    assert.equal(projection.causalBoundary, 'NO_CAUSAL_UPGRADE');
    assert.equal(projection.medicalBoundary, 'NON_DIAGNOSTIC');
    assert.equal(projection.privacyBoundary, 'PRESERVE_PURPOSE_AND_CONSENT');
    assert.ok(projection.publicTerm.trim());
  }
});

test('HOLD concepts are excluded from locale projections', () => {
  for (const locale of ['fr', 'en'] as const) {
    const ids = buildMotsPetLocaleProjection(locale).map((entry) => entry.conceptId);
    assert.equal(ids.includes('activation_change'), false);
  }
});

test('semantic QA catches a truth-class or provenance drift even when wording looks valid', () => {
  const fr = buildMotsPetLocaleProjection('fr');
  const en = buildMotsPetLocaleProjection('en');

  const mutated: MotsPetLocaleProjection[] = en.map((entry) =>
    entry.conceptId === 'observation'
      ? {
          ...entry,
          truthClass: 'CONFIDENCE_METADATA',
          provenance: 'NOT_REQUIRED',
        }
      : entry,
  );

  const drift = compareMotsPetLocaleSemantics(fr, mutated);
  assert.deepEqual(
    drift
      .filter((entry) => entry.conceptId === 'observation')
      .map((entry) => entry.field)
      .sort(),
    ['provenance', 'truthClass'],
  );
});

test('semantic QA catches missing concepts across locale projections', () => {
  const fr = buildMotsPetLocaleProjection('fr');
  const en = buildMotsPetLocaleProjection('en').slice(1);

  const drift = compareMotsPetLocaleSemantics(fr, en);
  assert.ok(
    drift.some(
      (entry) =>
        entry.field === 'missing_concept' &&
        entry.conceptId === fr[0]!.conceptId,
    ),
  );
});


test('uncertainty and trend preserve explicit semantic classes across FR and EN', () => {
  for (const locale of ['fr', 'en'] as const) {
    const projection = buildMotsPetLocaleProjection(locale);
    const uncertainty = projection.find(
      (entry) => entry.conceptId === 'uncertainty',
    );
    const trend = projection.find((entry) => entry.conceptId === 'trend');

    assert.ok(uncertainty, locale);
    assert.equal(uncertainty.truthClass, 'UNCERTAINTY_METADATA');
    assert.equal(uncertainty.provenance, 'REQUIRED');

    assert.ok(trend, locale);
    assert.equal(trend.truthClass, 'LONGITUDINAL_CHANGE');
    assert.equal(trend.provenance, 'REQUIRED');
  }
});
