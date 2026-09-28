import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { getControlledAnthropicEgress } from '../anthropic-rights';
import {
  ANTHROPIC_PRODUCTION_AUTHORITY,
  isAnthropicProductionEgressAuthorized,
  type AnthropicEgressAuthority,
} from '../anthropic-service-authority';

const routeUrl = new URL('../../app/api/breiz/route.ts', import.meta.url);

const REVIEWED_AUTHORITY: AnthropicEgressAuthority = {
  disposition: 'GO',
  evidenceRevision: 'ANTHROPIC-TEST-001',
  reviewedAt: '2026-09-22T10:00:00.000Z',
  reviewerRole: 'TEST_REVIEWER',
  providerTermsEvidence: 'controlled://anthropic/terms',
  processorPrivacyEvidence: 'controlled://anthropic/processor-privacy',
  dataTransferEvidence: 'controlled://anthropic/data-transfer',
  credentialCustodyEvidence: 'controlled://anthropic/credential-custody',
  retentionConfigurationEvidence: 'controlled://anthropic/retention',
  modelUseEvidence: 'controlled://anthropic/model-use',
  reviewedModels: ['claude-test-reviewed'],
  egressScope: 'BOUNDED_BREIZ_MESSAGE_AND_REGIONAL_CONTEXT',
  subjectIdentifierPolicy: 'NO_CANONICAL_EMOPET_SUBJECT_ID',
  reason: 'Synthetic test authority only.',
};

test('Anthropic checked-in production authority remains HOLD', () => {
  assert.equal(ANTHROPIC_PRODUCTION_AUTHORITY.disposition, 'HOLD');
  assert.equal(isAnthropicProductionEgressAuthorized('claude-test-reviewed'), false);
  assert.equal(
    getControlledAnthropicEgress(
      'test-key',
      'GO',
      'claude-test-reviewed',
    ),
    null,
  );
});

test('Anthropic reviewed authority requires the complete provider/privacy evidence set', () => {
  assert.equal(isAnthropicProductionEgressAuthorized('claude-test-reviewed', REVIEWED_AUTHORITY), true);

  for (const mutation of [
    { disposition: 'HOLD' as const },
    { evidenceRevision: null },
    { reviewerRole: null },
    { providerTermsEvidence: null },
    { processorPrivacyEvidence: null },
    { dataTransferEvidence: null },
    { credentialCustodyEvidence: null },
    { retentionConfigurationEvidence: null },
    { modelUseEvidence: null },
    { egressScope: 'OPEN' as const },
    { subjectIdentifierPolicy: 'OPEN' as const },
  ]) {
    assert.equal(
      isAnthropicProductionEgressAuthorized(
        'claude-test-reviewed',
        { ...REVIEWED_AUTHORITY, ...mutation },
      ),
      false,
    );
  }
});

test('Anthropic egress needs exact GO, nonblank key, reviewed model and complete authority', () => {
  assert.equal(getControlledAnthropicEgress(undefined, 'GO', 'claude-test-reviewed', REVIEWED_AUTHORITY), null);
  assert.equal(getControlledAnthropicEgress('   ', 'GO', 'claude-test-reviewed', REVIEWED_AUTHORITY), null);
  assert.equal(getControlledAnthropicEgress('test-key', undefined, 'claude-test-reviewed', REVIEWED_AUTHORITY), null);
  assert.equal(getControlledAnthropicEgress('test-key', 'go', 'claude-test-reviewed', REVIEWED_AUTHORITY), null);
  assert.equal(getControlledAnthropicEgress('test-key', ' GO ', 'claude-test-reviewed', REVIEWED_AUTHORITY), null);
  assert.equal(getControlledAnthropicEgress('test-key', 'GO', undefined, REVIEWED_AUTHORITY), null);
  assert.equal(getControlledAnthropicEgress('test-key', 'GO', 'unreviewed-model', REVIEWED_AUTHORITY), null);

  assert.deepEqual(
    getControlledAnthropicEgress(
      '  test-key  ',
      'GO',
      '  claude-test-reviewed  ',
      REVIEWED_AUTHORITY,
    ),
    { apiKey: 'test-key', model: 'claude-test-reviewed' },
  );
});

test('a later model change cannot inherit an earlier Anthropic review', () => {
  assert.equal(
    isAnthropicProductionEgressAuthorized('claude-test-reviewed', REVIEWED_AUTHORITY),
    true,
  );
  assert.equal(
    isAnthropicProductionEgressAuthorized('claude-future-model', REVIEWED_AUTHORITY),
    false,
  );
});

test('Breiz route uses the controlled Anthropic helper instead of API-key presence', async () => {
  const source = await readFile(routeUrl, 'utf8');

  assert.match(source, /getControlledAnthropicEgress\(\)/);
  assert.match(source, /anthropic\.apiKey/);
  assert.match(source, /anthropic\.model/);
  assert.doesNotMatch(source, /if\s*\(\s*!apiKey\s*\)/);
  assert.doesNotMatch(source, /const\s+apiKey\s*=\s*process\.env\[['"]ANTHROPIC_API_KEY['"]\]/);
});
