import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildDatatourismeEventContextCard,
  buildDatatourismeEventContextCards,
} from '../datatourismeContextCards';
import type { DatatourismeBretagneLoadedEvent } from '../datatourismeLoader';
import type { BreizSourceDescriptor } from '../sourceRegistry';

const NOW = Date.parse('2026-10-01T12:00:00Z');

function source(overrides: Partial<BreizSourceDescriptor> = {}): BreizSourceDescriptor {
  return {
    id: 'datatourisme',
    name: 'DATAtourisme',
    publisher: 'French tourism open-data network',
    canonicalUrl: 'https://www.datatourisme.fr/',
    territory: 'France',
    accessMode: 'api',
    authority: 'institutional',
    usagePolicy: ['ATTRIBUTION_REQUIRED'],
    license: 'Licence Ouverte 2.0',
    freshnessHours: 24,
    enabled: true,
    notes: 'fixture',
    rightsEvidence: {
      authorityRevision: 'datatourisme-rights-v1',
      immutableSourceVersion: 'datatourisme-source-v1',
      receiptPath: 'data/registry/receipts/datatourisme-fixture.json',
      attributionText: 'DATAtourisme network',
      permittedUseSummary: 'Fixture ingestion with attribution.',
      allowedProductUses: ['INGESTION'],
      reviewedAt: '2026-09-30T12:00:00Z',
      reviewerRole: 'TEST_RIGHTS_REVIEWER',
      recheckAt: '2026-10-02T12:00:00Z',
      evidenceState: 'SOURCE_CONFIRMED',
      disposition: 'GO',
    },
    ...overrides,
  };
}

const CARD_OPTIONS = {
  relevanceReason: 'Événement local dans le territoire actuellement consulté.',
  nowMs: NOW,
  sourceLookup: (id: string) => (id === 'datatourisme' ? source() : undefined),
};

function loadedEvent(): DatatourismeBretagneLoadedEvent {
  return {
    event: {
      uuid: 'event-56-001',
      uri: 'https://data.datatourisme.fr/poi/event-56-001',
      label: 'Événement test',
      types: ['EntertainmentAndEvent'],
      department: '56',
      producerAttribution: 'Office de tourisme test',
      sourceUpdatedAt: '2026-10-01T10:30:00Z',
      datatourismeUpdatedAt: '2026-10-01T10:40:00Z',
    },
    provenance: {
      sourceId: 'datatourisme',
      sourceName: 'DATAtourisme',
      canonicalUrl: 'https://data.datatourisme.fr/poi/event-56-001',
      publisher: 'Office de tourisme test',
      retrievedAt: '2026-10-01T11:00:00Z',
      sourceUpdatedAt: '2026-10-01T10:30:00Z',
      territory: 'Bretagne',
      contentType: 'application/json',
      license: 'Licence Ouverte 2.0',
      allowedUse: ['ATTRIBUTION_REQUIRED'],
      attribution: 'Office de tourisme test',
      language: 'fr',
      checksumSha256: null,
      rightsAuthorityRevision: 'datatourisme-rights-v1',
      rightsImmutableSourceVersion: 'datatourisme-source-v1',
      rightsReceiptPath: 'data/registry/receipts/datatourisme-fixture.json',
      rightsAttributionText: 'DATAtourisme network',
      rightsPermittedUseSummary: 'Fixture ingestion with attribution.',
      rightsAllowedProductUses: ['INGESTION'],
      rightsReviewedAt: '2026-09-30T12:00:00Z',
      rightsRecheckAt: '2026-10-02T12:00:00Z',
      rightsReviewerRole: 'TEST_RIGHTS_REVIEWER',
      freshnessPolicyHours: 24,
      authority: 'institutional',
    },
  };
}

test('DATAtourisme card keeps bounded event metadata and complete provenance', () => {
  const card = buildDatatourismeEventContextCard(loadedEvent(), CARD_OPTIONS);

  assert.ok(card);
  assert.equal(card.id, 'datatourisme-event-event-56-001');
  assert.equal(card.title, 'Événement test');
  assert.equal(card.territory, 'Bretagne · département 56');
  assert.equal(card.data.source, 'datatourisme');
  assert.equal(card.data.producerAttribution, 'Office de tourisme test');
  assert.equal(card.provenance.length, 1);
  assert.equal(card.provenance[0]!.attribution, 'Office de tourisme test');

  const serialized = JSON.stringify(card);
  assert.doesNotMatch(serialized, /email|telephone|hasContact|hasDescription/i);
  assert.doesNotMatch(serialized, /dog[- ]?friendly|chien accepté/i);
});

test('DATAtourisme card fails closed when provenance no longer matches event attribution', () => {
  const loaded = loadedEvent();
  loaded.provenance.attribution = 'Different producer';

  const card = buildDatatourismeEventContextCard(loaded, {
    ...CARD_OPTIONS,
    relevanceReason: 'Test',
  });

  assert.equal(card, null);
});

test('DATAtourisme card fails closed when collected rights revision no longer matches current authority', () => {
  const loaded = loadedEvent();
  loaded.provenance.rightsAuthorityRevision = 'older-review';

  const card = buildDatatourismeEventContextCard(loaded, {
    ...CARD_OPTIONS,
    relevanceReason: 'Test',
  });

  assert.equal(card, null);
});

test('DATAtourisme card fails closed when current rights scope changes under the same revision', () => {
  const card = buildDatatourismeEventContextCard(loadedEvent(), {
    ...CARD_OPTIONS,
    relevanceReason: 'Test',
    sourceLookup: () =>
      source({
        rightsEvidence: {
          ...source().rightsEvidence!,
          allowedProductUses: ['INGESTION', 'PUBLIC_ANSWER_WITH_SOURCE'],
        },
      }),
  });

  assert.equal(card, null);
});

test('DATAtourisme card fails closed when source provenance is stale', () => {
  const loaded = loadedEvent();
  loaded.provenance.retrievedAt = '2026-09-28T00:00:00Z';

  const card = buildDatatourismeEventContextCard(loaded, {
    relevanceReason: 'Test',
    nowMs: NOW,
  });

  assert.equal(card, null);
});

test('DATAtourisme card requires an explicit relevance reason', () => {
  const card = buildDatatourismeEventContextCard(loadedEvent(), {
    ...CARD_OPTIONS,
    relevanceReason: '   ',
  });

  assert.equal(card, null);
});

test('bulk card builder drops invalid records rather than weakening provenance rules', () => {
  const valid = loadedEvent();
  const invalid = loadedEvent();
  invalid.event.uuid = 'invalid-event';
  invalid.provenance.publisher = 'Mismatch';

  const cards = buildDatatourismeEventContextCards([valid, invalid], {
    ...CARD_OPTIONS,
    relevanceReason: 'Événements locaux pertinents pour la zone consultée.',
  });

  assert.deepEqual(cards.map((card) => card.id), [
    'datatourisme-event-event-56-001',
  ]);
});
