import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  parseDatatourismeBretagneEventsResponse,
  sanitizeDatatourismePaginationLink,
} from '../datatourismeEvents';
import { evaluateBreizSourceRights, getBreizSource } from '../sourceRegistry';

function fixture(overrides: Record<string, unknown> = {}) {
  return {
    uuid: 'c9308386-8fb9-308a-bb1e-fa9c080b7b58',
    uri: 'https://data.datatourisme.fr/poi/example',
    label: { fr: 'Événement test' },
    type: ['EntertainmentAndEvent'],
    isLocatedAt: {
      address: {
        hasAddressCity: {
          isPartOfDepartment: {
            insee: '56',
          },
        },
      },
    },
    hasBeenCreatedBy: {
      legalName: 'Office de tourisme test',
      address: [{ addressLocality: 'SHOULD_NOT_BE_RETAINED' }],
    },
    lastUpdate: '2026-09-30T10:00:00Z',
    lastUpdateDatatourisme: '2026-09-30T11:00:00Z',
    hasContact: {
      telephone: '+33 0 00 00 00 00',
      email: 'SHOULD_NOT_BE_RETAINED@example.invalid',
    },
    hasDescription: {
      fr: 'SHOULD_NOT_BE_RETAINED_BY_V0',
    },
    ...overrides,
  };
}

test('DATAtourisme event normalizer keeps only bounded metadata and producer attribution', () => {
  const parsed = parseDatatourismeBretagneEventsResponse({
    objects: [fixture()],
    meta: {
      total: 1,
      page: 1,
      page_size: 20,
      total_pages: 1,
      next: null,
      previous: null,
    },
  });

  assert.equal(parsed.rejected.length, 0);
  assert.deepEqual(parsed.meta, {
    total: 1,
    page: 1,
    pageSize: 20,
    totalPages: 1,
    next: null,
    previous: null,
  });
  assert.deepEqual(parsed.records, [
    {
      uuid: 'c9308386-8fb9-308a-bb1e-fa9c080b7b58',
      uri: 'https://data.datatourisme.fr/poi/example',
      label: 'Événement test',
      types: ['EntertainmentAndEvent'],
      department: '56',
      producerAttribution: 'Office de tourisme test',
      sourceUpdatedAt: '2026-09-30T10:00:00Z',
      datatourismeUpdatedAt: '2026-09-30T11:00:00Z',
    },
  ]);

  const serialized = JSON.stringify(parsed.records);
  assert.doesNotMatch(serialized, /SHOULD_NOT_BE_RETAINED/);
  assert.doesNotMatch(serialized, /email|telephone|hasContact|hasDescription/i);
});

test('DATAtourisme event normalizer accepts all configured Bretagne departments including 44', () => {
  for (const department of ['22', '29', '35', '44', '56']) {
    const parsed = parseDatatourismeBretagneEventsResponse({
      objects: [
        fixture({
          uuid: `uuid-${department}`,
          isLocatedAt: {
            address: {
              hasAddressCity: {
                isPartOfDepartment: { insee: department },
              },
            },
          },
        }),
      ],
      meta: {},
    });
    assert.equal(parsed.records.length, 1, department);
    assert.equal(parsed.records[0]!.department, department);
  }
});

test('DATAtourisme event normalizer rejects records outside configured Bretagne territory', () => {
  const parsed = parseDatatourismeBretagneEventsResponse({
    objects: [
      fixture({
        isLocatedAt: {
          address: {
            hasAddressCity: {
              isPartOfDepartment: { insee: '75' },
            },
          },
        },
      }),
    ],
    meta: {},
  });

  assert.equal(parsed.records.length, 0);
  assert.deepEqual(parsed.rejected, [
    { index: 0, reason: 'outside_bretagne_or_missing_department' },
  ]);
});

test('DATAtourisme event normalizer requires attribution and provider freshness evidence', () => {
  const parsed = parseDatatourismeBretagneEventsResponse({
    objects: [
      fixture({ hasBeenCreatedBy: null }),
      fixture({
        uuid: 'second',
        lastUpdate: 'not-a-date',
      }),
    ],
    meta: {},
  });

  assert.deepEqual(parsed.records, []);
  assert.deepEqual(parsed.rejected, [
    { index: 0, reason: 'missing_producer_attribution' },
    { index: 1, reason: 'missing_or_invalid_last_update' },
  ]);
});

test('DATAtourisme event normalizer rejects malformed envelopes', () => {
  for (const payload of [null, {}, { objects: null }, { objects: 'nope' }]) {
    const parsed = parseDatatourismeBretagneEventsResponse(payload);
    assert.deepEqual(parsed.records, []);
    assert.deepEqual(parsed.rejected, [
      { index: -1, reason: 'invalid_catalog_envelope' },
    ]);
  }
});


test('DATAtourisme pagination links never retain API credentials', () => {
  const sanitized = sanitizeDatatourismePaginationLink(
    'https://api.datatourisme.fr/v1/catalog?page=2&api_key=super-secret&token=other-secret',
  );
  assert.ok(sanitized);
  const url = new URL(sanitized);
  assert.equal(url.origin, 'https://api.datatourisme.fr');
  assert.equal(url.searchParams.get('page'), '2');
  assert.equal(url.searchParams.has('api_key'), false);
  assert.equal(url.searchParams.has('token'), false);
  assert.doesNotMatch(sanitized, /super-secret|other-secret/);
});

test('DATAtourisme pagination links reject foreign or downgraded origins', () => {
  assert.equal(
    sanitizeDatatourismePaginationLink('https://evil.example/v1/catalog?page=2'),
    null,
  );
  assert.equal(
    sanitizeDatatourismePaginationLink('http://api.datatourisme.fr/v1/catalog?page=2'),
    null,
  );
});

test('DATAtourisme catalog meta sanitizes pagination links before retention', () => {
  const parsed = parseDatatourismeBretagneEventsResponse({
    objects: [fixture()],
    meta: {
      total: 2,
      page: 1,
      page_size: 1,
      total_pages: 2,
      next: 'https://api.datatourisme.fr/v1/catalog?page=2&api_key=do-not-store',
      previous: null,
    },
  });

  assert.ok(parsed.meta.next);
  assert.doesNotMatch(parsed.meta.next!, /api_key|do-not-store/);
});


test('DATAtourisme remains source-rights blocked while technical contract is built', () => {
  const source = getBreizSource('datatourisme');
  assert.ok(source);
  assert.equal(source.enabled, false);

  const rights = evaluateBreizSourceRights(source);
  assert.equal(rights.ingestionPermitted, false);
  assert.ok(rights.blockers.includes('SOURCE_DISABLED'));
  assert.ok(rights.blockers.includes('NO_RIGHTS_EVIDENCE'));
});
