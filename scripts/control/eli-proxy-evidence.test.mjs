import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const ids = [
  'A01','A02','A03','A04','A05','A06',
  'R01','R02','R03','R04','R05','R06','R07',
  'G01','G02','G03','G04','G05',
  'S01','S02','S03','S04','S05',
];

test('all 23 Owner-facing proxies have explicit machine-readable evidence status', async () => {
  const url = new URL('../../config/science/eli-proxy-evidence.json', import.meta.url);
  const map = JSON.parse(await readFile(url, 'utf8'));
  assert.deepEqual(Object.keys(map.proxies).sort(), ids.sort());
  for (const id of ids) {
    assert.ok(map.proxies[id].claimStatus);
    assert.notEqual(map.proxies[id].claimStatus, 'SUPPORTED');
    assert.equal(map.proxies[id].validationEvidence, null);
  }
});

test('every proxy claim status and hypothesis status belongs to the declared vocabulary', async () => {
  const url = new URL('../../config/science/eli-proxy-evidence.json', import.meta.url);
  const map = JSON.parse(await readFile(url, 'utf8'));
  const allowedClaims = new Set(map.allowedStatuses);
  const allowedHypotheses = new Set(map.allowedHypothesisStatuses);

  assert.ok(
    allowedClaims.has('NOT_ESTABLISHED_BY_CITED_SOURCE'),
    'the vocabulary must include the unresolved citation status already used by the proxy map',
  );

  for (const [id, proxy] of Object.entries(map.proxies)) {
    assert.equal(
      allowedClaims.has(proxy.claimStatus),
      true,
      `${id}: unknown claimStatus ${proxy.claimStatus}`,
    );
    assert.equal(
      allowedHypotheses.has(proxy.emopetHypothesisStatus),
      true,
      `${id}: unknown emopetHypothesisStatus ${proxy.emopetHypothesisStatus}`,
    );
  }
});

test('every claim status has exactly one Owner-presentation policy class', async () => {
  const url = new URL('../../config/science/eli-proxy-evidence.json', import.meta.url);
  const map = JSON.parse(await readFile(url, 'utf8'));

  const classes = [
    ['directValidationLanguageRequires', new Set(map.ownerPolicy.directValidationLanguageRequires)],
    ['contextOnlyStatuses', new Set(map.ownerPolicy.contextOnlyStatuses)],
    ['noValidationImplicationStatuses', new Set(map.ownerPolicy.noValidationImplicationStatuses)],
  ];

  for (const status of map.allowedStatuses) {
    const memberships = classes.filter(([, values]) => values.has(status));
    assert.equal(
      memberships.length,
      1,
      `${status}: must belong to exactly one Owner-presentation policy class`,
    );
  }

  assert.deepEqual(
    map.ownerPolicy.directValidationLanguageRequires,
    ['SUPPORTED'],
    'SUPPORTED must remain the only status allowed to use direct validation language',
  );
  assert.ok(
    map.ownerPolicy.noValidationImplicationStatuses.includes('NOT_ESTABLISHED_BY_CITED_SOURCE'),
    'unresolved cited-source status must fail closed for Owner presentation',
  );
});

test('proxy evidence dimensions are explicit, bibliography-backed and fail closed', async () => {
  const url = new URL('../../config/science/eli-proxy-evidence.json', import.meta.url);
  const map = JSON.parse(await readFile(url, 'utf8'));
  const bibliographyIds = new Set(Object.keys(map.bibliography));

  for (const [id, proxy] of Object.entries(map.proxies)) {
    for (const field of ['measurementSources', 'interpretationSources', 'contextSources']) {
      assert.ok(Array.isArray(proxy[field]), `${id}: ${field} must be an array`);
      for (const sourceId of proxy[field]) {
        assert.equal(
          bibliographyIds.has(sourceId),
          true,
          `${id}: ${field} points to unknown bibliography id ${sourceId}`,
        );
      }
    }

    assert.equal(
      proxy.validationEvidence,
      null,
      `${id}: this controlled map must not invent validation evidence`,
    );

    if (proxy.claimStatus === 'MEASUREMENT_CONTEXT') {
      assert.ok(proxy.measurementSources.length > 0, `${id}: measurement context needs a source`);
      assert.deepEqual(proxy.interpretationSources, [], `${id}: measurement context must not silently become interpretation evidence`);
    }

    if (proxy.claimStatus === 'CONCEPTUAL_CONTEXT') {
      assert.ok(proxy.interpretationSources.length > 0, `${id}: conceptual context needs a source`);
      assert.deepEqual(proxy.measurementSources, [], `${id}: conceptual context must not silently become measurement validation`);
    }

    if (proxy.claimStatus === 'NOT_ESTABLISHED_BY_CITED_SOURCE') {
      assert.ok(proxy.contextSources.length > 0, `${id}: unresolved cited source must remain traceable as context`);
      assert.deepEqual(proxy.measurementSources, [], `${id}: unresolved citation cannot become measurement support`);
      assert.deepEqual(proxy.interpretationSources, [], `${id}: unresolved citation cannot become interpretation support`);
    }

    assert.equal(
      proxy.emopetHypothesisStatus,
      'NOT_ASSESSED',
      `${id}: hypothesis classification requires separate Science review`,
    );
  }
});

test('separate-gate proxies carry an explicit gate pointer', async () => {
  const url = new URL('../../config/science/eli-proxy-evidence.json', import.meta.url);
  const map = JSON.parse(await readFile(url, 'utf8'));

  for (const [id, proxy] of Object.entries(map.proxies)) {
    if (proxy.claimStatus === 'SEPARATE_GATE') {
      assert.match(proxy.separateGate ?? '', /^#\d+$/, `${id}: missing dedicated gate pointer`);
      assert.ok(proxy.contextSources.length > 0, `${id}: separate gate must retain contextual source provenance`);
    } else {
      assert.equal('separateGate' in proxy, false, `${id}: separateGate is reserved for SEPARATE_GATE proxies`);
    }
  }
});

test('Owner-facing proxy modal does not render a bare validation-looking reference label', async () => {
  const url = new URL('../../apps/web/components/eli/ProxyChartModal.tsx', import.meta.url);
  const source = await readFile(url, 'utf8');
  assert.equal(source.includes('Référence : {proxy.reference}'), false);
  assert.ok(source.includes('Source de contexte (ne valide pas ce proxy)'));
});

test('scientific footer disclaims blanket proxy validation', async () => {
  const url = new URL('../../apps/web/lib/eli/catalog.ts', import.meta.url);
  const source = await readFile(url, 'utf8');
  assert.ok(source.includes('Ces sources ne constituent pas une validation proxy par proxy'));
});


test('G02 remains behind the dedicated respiratory-variability gate', async () => {
  const url = new URL('../../config/science/eli-proxy-evidence.json', import.meta.url);
  const map = JSON.parse(await readFile(url, 'utf8'));
  assert.equal(map.proxies.G02.claimStatus, 'SEPARATE_GATE');
  assert.match(map.proxies.G02.note, /#86/);
  assert.equal(map.proxies.G02.validationEvidence, null);
});
