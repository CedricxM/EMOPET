import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import {
  DATATOURISME_BRETAGNE_DEPARTMENTS,
  DATATOURISME_BRETAGNE_EVENT_FIELDS,
  prepareDatatourismeBretagneEventsRequest,
  prepareDatatourismeCatalogRequest,
  prepareSireneEstablishmentRequest,
} from '../providerRequest';

const keys = [
  'API_INSEE_SIRENE_ENABLED',
  'INSEE_API_KEY',
  'API_DATATOURISME_ENABLED',
  'DATATOURISME_API_KEY',
] as const;

const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of keys) {
    const value = original[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test('SIRENE request stays fail-closed until flag + public API key are present', () => {
  process.env.INSEE_API_KEY = 'test-insee-key';
  delete process.env.API_INSEE_SIRENE_ENABLED;

  assert.deepEqual(prepareSireneEstablishmentRequest('12345678901234'), {
    ready: false,
    reason: 'flag_off',
  });

  process.env.API_INSEE_SIRENE_ENABLED = 'true';
  delete process.env.INSEE_API_KEY;
  assert.deepEqual(prepareSireneEstablishmentRequest('12345678901234'), {
    ready: false,
    reason: 'missing_env',
  });
});

test('SIRENE uses v3.11 siret endpoint and header-only credential transport', () => {
  process.env.API_INSEE_SIRENE_ENABLED = 'true';
  process.env.INSEE_API_KEY = 'test-insee-key';

  const request = prepareSireneEstablishmentRequest('12345678901234');
  assert.equal(request.ready, true);
  if (!request.ready) return;

  assert.equal(
    request.url,
    'https://api.insee.fr/api-sirene/3.11/siret/12345678901234',
  );
  assert.deepEqual(request.headers, {
    'X-INSEE-Api-Key-Integration': 'test-insee-key',
  });
  assert.doesNotMatch(request.url, /key|token|secret/i);
});

test('SIRENE rejects non-14-digit SIRET before credential resolution', () => {
  process.env.API_INSEE_SIRENE_ENABLED = 'true';
  process.env.INSEE_API_KEY = 'test-insee-key';

  for (const value of ['123', '1234567890123A', '  ', '123456789012345']) {
    assert.deepEqual(prepareSireneEstablishmentRequest(value), {
      ready: false,
      reason: 'invalid_input',
    });
  }
});

test('DATAtourisme catalog request encodes bounded query and keeps key out of URL', () => {
  process.env.API_DATATOURISME_ENABLED = 'true';
  process.env.DATATOURISME_API_KEY = 'test-datatourisme-key';

  const request = prepareDatatourismeCatalogRequest({
    search: 'parc chien',
    insee: '56121',
    lang: 'fr',
    page: 2,
    pageSize: 100,
    geoDistance: '47.748,-3.3702,10km',
  });
  assert.equal(request.ready, true);
  if (!request.ready) return;

  const url = new URL(request.url);
  assert.equal(url.origin + url.pathname, 'https://api.datatourisme.fr/v1/catalog');
  assert.equal(url.searchParams.get('search'), 'parc chien');
  assert.equal(url.searchParams.get('insee'), '56121');
  assert.equal(url.searchParams.get('lang'), 'fr');
  assert.equal(url.searchParams.get('page'), '2');
  assert.equal(url.searchParams.get('page_size'), '100');
  assert.equal(url.searchParams.get('geo_distance'), '47.748,-3.3702,10km');
  assert.equal(url.searchParams.has('api_key'), false);
  assert.deepEqual(request.headers, {
    'X-API-Key': 'test-datatourisme-key',
  });
});

test('DATAtourisme rejects invalid pagination and INSEE code', () => {
  process.env.API_DATATOURISME_ENABLED = 'true';
  process.env.DATATOURISME_API_KEY = 'test-datatourisme-key';

  for (const input of [
    { page: 0 },
    { pageSize: 0 },
    { pageSize: 101 },
    { page: 1.5 },
    { page: 101, pageSize: 100 },
    { insee: '5612' },
    { insee: 'ABCDE' },
  ]) {
    assert.deepEqual(prepareDatatourismeCatalogRequest(input), {
      ready: false,
      reason: 'invalid_input',
    });
  }
});

test('DATAtourisme accepts the last direct page inside the documented 10k window', () => {
  process.env.API_DATATOURISME_ENABLED = 'true';
  process.env.DATATOURISME_API_KEY = 'test-datatourisme-key';

  const request = prepareDatatourismeCatalogRequest({ page: 100, pageSize: 100 });
  assert.equal(request.ready, true);
  if (!request.ready) return;

  const url = new URL(request.url);
  assert.equal(url.searchParams.get('page'), '100');
  assert.equal(url.searchParams.get('page_size'), '100');
});

test('DATAtourisme defaults to page 1, 20 rows and French', () => {
  process.env.API_DATATOURISME_ENABLED = 'true';
  process.env.DATATOURISME_API_KEY = 'test-datatourisme-key';

  const request = prepareDatatourismeCatalogRequest();
  assert.equal(request.ready, true);
  if (!request.ready) return;

  const url = new URL(request.url);
  assert.equal(url.searchParams.get('page'), '1');
  assert.equal(url.searchParams.get('page_size'), '20');
  assert.equal(url.searchParams.get('lang'), 'fr');
});


test('DATAtourisme Bretagne events request is structured, minimised and header-authenticated', () => {
  process.env.API_DATATOURISME_ENABLED = 'true';
  process.env.DATATOURISME_API_KEY = 'test-datatourisme-key';

  const request = prepareDatatourismeBretagneEventsRequest({
    lang: 'fr',
    page: 1,
    pageSize: 100,
  });
  assert.equal(request.ready, true);
  if (!request.ready) return;

  const url = new URL(request.url);
  assert.equal(
    url.origin + url.pathname,
    'https://api.datatourisme.fr/v1/entertainmentAndEvent',
  );
  assert.equal(url.searchParams.get('lang'), 'fr');
  assert.equal(url.searchParams.get('page'), '1');
  assert.equal(url.searchParams.get('page_size'), '100');
  assert.equal(
    url.searchParams.get('fields'),
    DATATOURISME_BRETAGNE_EVENT_FIELDS.join(','),
  );
  assert.equal(
    url.searchParams.get('filters'),
    'isLocatedAt.address.hasAddressCity.isPartOfDepartment.insee[in]='
      + DATATOURISME_BRETAGNE_DEPARTMENTS.join(','),
  );
  assert.equal(url.searchParams.get('sort'), 'lastUpdate[desc]');
  assert.equal(url.searchParams.has('api_key'), false);
  assert.equal(url.searchParams.has('search'), false);
  assert.equal(url.searchParams.has('hasContact'), false);
  assert.deepEqual(request.headers, {
    'X-API-Key': 'test-datatourisme-key',
  });
});

test('DATAtourisme Bretagne events request fails closed without flag or key', () => {
  process.env.DATATOURISME_API_KEY = 'test-datatourisme-key';
  delete process.env.API_DATATOURISME_ENABLED;
  assert.deepEqual(prepareDatatourismeBretagneEventsRequest(), {
    ready: false,
    reason: 'flag_off',
  });

  process.env.API_DATATOURISME_ENABLED = 'true';
  delete process.env.DATATOURISME_API_KEY;
  assert.deepEqual(prepareDatatourismeBretagneEventsRequest(), {
    ready: false,
    reason: 'missing_env',
  });
});

test('DATAtourisme Bretagne events request rejects unsafe direct pagination', () => {
  process.env.API_DATATOURISME_ENABLED = 'true';
  process.env.DATATOURISME_API_KEY = 'test-datatourisme-key';

  for (const input of [
    { page: 0 },
    { pageSize: 0 },
    { pageSize: 101 },
    { page: 101, pageSize: 100 },
  ]) {
    assert.deepEqual(prepareDatatourismeBretagneEventsRequest(input), {
      ready: false,
      reason: 'invalid_input',
    });
  }
});
