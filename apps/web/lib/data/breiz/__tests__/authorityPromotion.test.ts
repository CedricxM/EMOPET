import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { BreizDocument } from '../breizDocument.schema';
import { validateBreizDocument } from '../breizDocument.schema';
import {
  deriveBreizSourceAuthorityBinding,
  promoteBreizDocumentForPublicAnswer,
} from '../authorityPromotion';
import type { BreizSourceDescriptor } from '../sourceRegistry';

const NOW = Date.parse('2026-10-02T12:00:00.000Z');

function source(overrides: Partial<BreizSourceDescriptor> = {}): BreizSourceDescriptor {
  return {
    id: 'fixture-source',
    name: 'Fixture source',
    publisher: 'Fixture publisher',
    canonicalUrl: 'https://example.invalid/source',
    territory: 'Bretagne',
    accessMode: 'api',
    authority: 'official',
    usagePolicy: ['ATTRIBUTION_REQUIRED'],
    license: 'Licence Ouverte 2.0',
    freshnessHours: 24,
    enabled: true,
    notes: '',
    rightsEvidence: {
      authorityRevision: 'rights-v3',
      immutableSourceVersion: 'dataset-v7',
      receiptPath: 'data/registry/receipts/fixture-v3.json',
      attributionText: 'Fixture publisher',
      permittedUseSummary: 'Public answer with source attribution.',
      allowedProductUses: ['INGESTION', 'PUBLIC_ANSWER_WITH_SOURCE'],
      reviewedAt: '2026-10-01T09:00:00.000Z',
      reviewerRole: 'TEST_RIGHTS_REVIEWER',
      recheckAt: '2026-11-01T09:00:00.000Z',
      evidenceState: 'SOURCE_CONFIRMED',
      disposition: 'GO',
    },
    ...overrides,
  };
}

function neutralDocument(overrides: Partial<BreizDocument> = {}): BreizDocument {
  return {
    id: 'candidate-doc',
    title: 'Candidate document',
    source_name: 'Local file',
    source_url: null,
    license: 'Unreviewed local receipt',
    territory: 'Bretagne',
    region: 'Bretagne',
    department: 'Morbihan',
    commune: 'Lorient',
    theme: 'territorial_context',
    tags: ['candidate'],
    summary: 'Candidate summary.',
    content: 'Candidate content retained for controlled review.',
    reliability_level: 'unknown',
    last_checked_at: '2026-10-02',
    allowed_usage: 'retrieval_only',
    ...overrides,
  };
}

test('controlled promotion mints authority only from reviewed registry evidence', () => {
  const reviewed = source();
  const result = promoteBreizDocumentForPublicAnswer(
    neutralDocument(),
    reviewed.id,
    NOW,
    (id) => (id === reviewed.id ? reviewed : undefined),
  );

  assert.equal(result.ready, true);
  if (!result.ready) return;

  assert.equal(result.document.source_name, reviewed.name);
  assert.equal(result.document.source_url, reviewed.canonicalUrl);
  assert.equal(result.document.source_registry_id, reviewed.id);
  assert.equal(result.document.license, reviewed.license);
  assert.equal(result.document.reliability_level, 'source_verified');
  assert.equal(result.document.allowed_usage, 'public_answer_with_source');

  const binding = result.document.source_authority_binding;
  assert.ok(binding);
  assert.equal(binding.authority_revision, 'rights-v3');
  assert.equal(binding.immutable_source_version, 'dataset-v7');
  assert.equal(binding.receipt_path, 'data/registry/receipts/fixture-v3.json');
  assert.equal(binding.permitted_use_summary, 'Public answer with source attribution.');
  assert.deepEqual(binding.allowed_product_uses, [
    'INGESTION',
    'PUBLIC_ANSWER_WITH_SOURCE',
  ]);
  assert.equal(binding.rights_reviewed_at, '2026-10-01T09:00:00.000Z');
  assert.equal(binding.rights_recheck_at, '2026-11-01T09:00:00.000Z');
  assert.equal(binding.reviewer_role, 'TEST_RIGHTS_REVIEWER');
  assert.deepEqual(validateBreizDocument(result.document), []);
});

test('public promotion fails when rights grant ingestion but not public answers', () => {
  const reviewed = source({
    rightsEvidence: {
      ...source().rightsEvidence!,
      allowedProductUses: ['INGESTION'],
    },
  });

  const result = promoteBreizDocumentForPublicAnswer(
    neutralDocument(),
    reviewed.id,
    NOW,
    () => reviewed,
  );

  assert.deepEqual(result, {
    ready: false,
    reason: 'source_not_public_answer_ready',
    validationErrors: [],
  });
});

test('mocks, community or restricted documents cannot be authority-laundered', () => {
  for (const candidate of [
    neutralDocument({ reliability_level: 'curated_mock' }),
    neutralDocument({ reliability_level: 'community_pending' }),
    neutralDocument({ allowed_usage: 'do_not_answer' }),
    neutralDocument({ allowed_usage: 'internal_reference' }),
  ]) {
    const result = promoteBreizDocumentForPublicAnswer(
      candidate,
      'fixture-source',
      NOW,
      () => source(),
    );
    assert.equal(result.ready, false);
    if (!result.ready) assert.equal(result.reason, 'document_not_neutral');
  }
});

test('an already bound document cannot be rebound to a later authority', () => {
  const first = promoteBreizDocumentForPublicAnswer(
    neutralDocument(),
    'fixture-source',
    NOW,
    () => source(),
  );
  assert.equal(first.ready, true);
  if (!first.ready) return;

  const second = promoteBreizDocumentForPublicAnswer(
    first.document,
    'fixture-source',
    NOW,
    () =>
      source({
        rightsEvidence: {
          ...source().rightsEvidence!,
          authorityRevision: 'rights-v4',
        },
      }),
  );

  assert.deepEqual(second, {
    ready: false,
    reason: 'document_already_bound',
    validationErrors: [],
  });
});

test('binding derivation refuses current source without explicit public-answer scope', () => {
  const ingestionOnly = source({
    rightsEvidence: {
      ...source().rightsEvidence!,
      allowedProductUses: ['INGESTION'],
    },
  });
  assert.equal(deriveBreizSourceAuthorityBinding(ingestionOnly, NOW), null);
});

test('schema rejects authority-bound identity or licence drift', () => {
  const result = promoteBreizDocumentForPublicAnswer(
    neutralDocument(),
    'fixture-source',
    NOW,
    () => source(),
  );
  assert.equal(result.ready, true);
  if (!result.ready) return;

  const badName = { ...result.document, source_name: 'Other source' };
  const badUrl = { ...result.document, source_url: 'https://example.invalid/other' };
  const badLicense = { ...result.document, license: 'Different licence' };

  assert.ok(validateBreizDocument(badName).includes('source_name must match source_authority_binding'));
  assert.ok(validateBreizDocument(badUrl).includes('source_url must match source_authority_binding'));
  assert.ok(validateBreizDocument(badLicense).includes('license must match source_authority_binding'));
});
