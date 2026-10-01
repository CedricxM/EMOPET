import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import {
  BRETAGNE_CANINE_PILOT_SCHEMA,
  validateBretagneCaninePilotRegistry,
} from '../bretagneCaninePilotRegistry';

async function loadRegistry(): Promise<Record<string, unknown>> {
  const raw = await readFile(
    new URL(
      '../../../../../config/partnerships/bretagne-canine-pilot-candidates-v1.json',
      import.meta.url,
    ),
    'utf8',
  );
  return JSON.parse(raw) as Record<string, unknown>;
}

test('current Bretagne canine candidate register passes evidence guard', async () => {
  const registry = await loadRegistry();
  assert.equal(registry.schemaVersion, BRETAGNE_CANINE_PILOT_SCHEMA);
  assert.deepEqual(validateBretagneCaninePilotRegistry(registry), []);
});

test('status cannot jump to OUTREACH_SENT without exact communication evidence', async () => {
  const registry = await loadRegistry();
  const candidates = structuredClone(registry.candidates) as Array<Record<string, unknown>>;
  candidates[0] = {
    ...candidates[0],
    relationshipStatus: 'OUTREACH_SENT',
  };

  const errors = validateBretagneCaninePilotRegistry({
    ...registry,
    candidates,
  });

  assert.ok(errors.some((error) => /outreachSentAt evidence required/.test(error)));
  assert.ok(errors.some((error) => /outreachEvidenceRef required/.test(error)));
});

test('response and LOI states require progressively stronger written evidence', async () => {
  const registry = await loadRegistry();
  const base = (structuredClone(registry.candidates) as Array<Record<string, unknown>>)[0]!;

  const responseErrors = validateBretagneCaninePilotRegistry({
    ...registry,
    candidates: [{
      ...base,
      relationshipStatus: 'RESPONSE_RECEIVED',
      relationshipEvidence: {
        outreachSentAt: '2026-10-01T10:00:00Z',
        outreachEvidenceRef: 'controlled://communications/outreach-001',
      },
    }],
  });
  assert.ok(responseErrors.some((error) => /responseReceivedAt evidence required/.test(error)));
  assert.ok(responseErrors.some((error) => /responseEvidenceRef required/.test(error)));

  const loiErrors = validateBretagneCaninePilotRegistry({
    ...registry,
    candidates: [{
      ...base,
      relationshipStatus: 'LETTER_OF_INTEREST_RECEIVED',
      relationshipEvidence: {
        outreachSentAt: '2026-10-01T10:00:00Z',
        outreachEvidenceRef: 'controlled://communications/outreach-001',
        responseReceivedAt: '2026-10-02T10:00:00Z',
        responseEvidenceRef: 'controlled://communications/response-001',
      },
    }],
  });
  assert.ok(loiErrors.some((error) => /letterOfInterestEvidenceRef required/.test(error)));
});

test('candidate register cannot silently become a partner list', async () => {
  const registry = await loadRegistry();
  const candidates = structuredClone(registry.candidates) as Array<Record<string, unknown>>;
  candidates[0] = {
    ...candidates[0],
    partnershipClaimAllowed: true,
  };

  const errors = validateBretagneCaninePilotRegistry({
    ...registry,
    candidates,
  });

  assert.ok(errors.some((error) => /partnershipClaimAllowed must stay false/.test(error)));
});

test('personal contact fields remain forbidden in machine-readable candidate records', async () => {
  const registry = await loadRegistry();
  const candidates = structuredClone(registry.candidates) as Array<Record<string, unknown>>;
  candidates[0] = {
    ...candidates[0],
    contactEmail: 'person@example.invalid',
  };

  const errors = validateBretagneCaninePilotRegistry({
    ...registry,
    candidates,
  });

  assert.ok(errors.some((error) => /contactEmail: personal contact field forbidden/.test(error)));
});

test('public evidence links must stay HTTPS and credential-free', async () => {
  const registry = await loadRegistry();
  const candidates = structuredClone(registry.candidates) as Array<Record<string, unknown>>;
  candidates[0] = {
    ...candidates[0],
    publicSources: ['http://example.invalid/source'],
  };

  const errors = validateBretagneCaninePilotRegistry({
    ...registry,
    candidates,
  });

  assert.ok(errors.some((error) => /publicSources must contain safe HTTPS URLs/.test(error)));
});
