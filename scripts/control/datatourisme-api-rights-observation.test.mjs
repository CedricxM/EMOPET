import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [receiptRaw, registrySource, outreach] = await Promise.all([
  readFile(
    new URL(
      '../../data/registry/receipts/datatourisme-api-rights-observation-2026-10-03.json',
      import.meta.url,
    ),
    'utf8',
  ),
  readFile(
    new URL('../../apps/web/lib/data/breiz/sourceRegistry.ts', import.meta.url),
    'utf8',
  ),
  readFile(
    new URL(
      '../../docs/partnerships/DATATOURISME_API_CGU_CLARIFICATION_OUTREACH_2026-10-03.md',
      import.meta.url,
    ),
    'utf8',
  ),
]);

const receipt = JSON.parse(receiptRaw);

function sourceBlock(id) {
  const marker = `id: '${id}'`;
  const start = registrySource.indexOf(marker);
  assert.ok(start >= 0, `missing Breiz source ${id}`);
  const next = registrySource.indexOf("\n  {\n    id:", start + marker.length);
  return registrySource.slice(
    start,
    next >= 0 ? next : registrySource.indexOf("\n];", start),
  );
}

test('DATAtourisme observation receipt is source evidence, never runtime authority', () => {
  assert.equal(
    receipt.schemaVersion,
    'emopet-datatourisme-api-rights-observation-v1',
  );
  assert.equal(receipt.sourceId, 'datatourisme');
  assert.equal(receipt.evidenceState, 'REPOSITORY_FACT');
  assert.equal(receipt.runtimeRightsDisposition, 'HOLD');
  assert.equal(receipt.releaseAllowed, false);
  assert.equal(receipt.immutableSourceVersion, null);

  assert.equal(receipt.runtimeBoundary.sourceMustRemainEnabled, false);
  assert.equal(receipt.runtimeBoundary.rightsEvidenceMayBeGo, false);
  assert.deepEqual(receipt.runtimeBoundary.allowedProductUses, []);
  assert.equal(receipt.runtimeBoundary.liveFetchAuthorityCreated, false);
});

test('licence observation is explicit while API-v1 CGU scope remains unresolved', () => {
  assert.equal(
    receipt.licenceObservation.observedValue,
    'Licence Ouverte 2.0',
  );
  assert.equal(
    receipt.licenceObservation.status,
    'SOURCE_STATEMENT_CONFIRMED',
  );
  assert.deepEqual(receipt.licenceObservation.requiredAttribution, [
    'HasBeenCreatedBy / producer attribution',
    'last update date of reused data',
  ]);

  assert.equal(receipt.cguObservation.linkedFromCurrentApiKeyForm, true);
  assert.equal(receipt.cguObservation.documentVersion, '2.0');
  assert.equal(receipt.cguObservation.documentDate, '2022-08-23');
  assert.equal(
    receipt.cguObservation.scopeState,
    'API_V1_SCOPE_NOT_EXPLICITLY_CONFIRMED_IN_REPOSITORY',
  );
  assert.match(receipt.cguObservation.holdReason, /does not infer/i);
});

test('clarification packet carries five exact unanswered questions and remains unsent', () => {
  assert.equal(receipt.clarificationRequest.sent, false);
  assert.equal(receipt.clarificationRequest.requiredAnswers.length, 5);
  assert.equal(
    new Set(receipt.clarificationRequest.requiredAnswers).size,
    5,
  );
  for (const question of receipt.clarificationRequest.requiredAnswers) {
    assert.ok(question.trim().length > 20);
  }

  assert.match(outreach, /DRAFT_NOT_SENT/);
  assert.match(outreach, /NO PARTNERSHIP CLAIM/);
  assert.match(outreach, /A reply must not directly flip runtime state/);
});

test('runtime registry records licence fact but cannot inherit receipt authority', () => {
  const datatourisme = sourceBlock('datatourisme');

  assert.match(datatourisme, /license: 'Licence Ouverte 2\.0'/);
  assert.match(datatourisme, /enabled: false/);
  assert.match(datatourisme, /Runtime remains HOLD/);
  assert.match(
    datatourisme,
    /datatourisme-api-rights-observation-2026-10-03\.json/,
  );
  assert.doesNotMatch(datatourisme, /rightsEvidence\s*:/);
});
