import assert from 'node:assert/strict';
import test from 'node:test';

import { composeEvidenceAwareExplanation, qualificationForEnvelope } from './explanation';
import { getMotsPetEntry } from './motspet';
import { isEvidenceRestricted, semanticEnvelopeSummary, type SemanticEvidenceEnvelope } from './types';

const versions = {
  els: 'test-els',
  motspet: 'test-motspet',
  claimGuard: 'test-claim-guard',
};

function envelope(overrides: Partial<SemanticEvidenceEnvelope> = {}): SemanticEvidenceEnvelope {
  return {
    truthClass: 'INTERPRETED',
    evidenceLevel: 'mixed_or_inferred',
    publicationGate: 'VALID',
    semanticVersions: versions,
    ...overrides,
  };
}

test('SUPPRESSED is evidence-restricted and produces an abstention qualification', () => {
  const value = envelope({ publicationGate: 'SUPPRESSED' });
  assert.equal(isEvidenceRestricted(value), true);
  assert.match(qualificationForEnvelope(value) ?? '', /pas assez d’éléments fiables/i);
});

test('UNKNOWN never receives a reassuring normality phrase from the default qualification', () => {
  const value = envelope({ publicationGate: 'UNKNOWN' });
  const qualification = qualificationForEnvelope(value) ?? '';
  assert.match(qualification, /pas encore assez d’informations fiables/i);
  assert.doesNotMatch(qualification, /tout va bien|normal/i);
});

test('DECLARED Guardian context always enters the semantic lock', () => {
  const value = envelope({
    truthClass: 'DECLARED',
    evidenceLevel: 'unknown',
    publicationGate: 'VALID',
  });
  assert.equal(isEvidenceRestricted(value), true);
});

test('external context with VALID gate is not automatically treated as dog-state evidence', () => {
  const value = envelope({
    truthClass: 'EXTERNAL_CONTEXT',
    evidenceLevel: 'external_context',
    publicationGate: 'VALID',
  });
  assert.equal(isEvidenceRestricted(value), false);
});

test('semantic summary preserves truth class, evidence level and publication gate', () => {
  const value = envelope({ publicationGate: 'DEGRADED', qualityState: 'limited' });
  const summary = semanticEnvelopeSummary(value);
  assert.match(summary, /truthClass=INTERPRETED/);
  assert.match(summary, /evidenceLevel=mixed_or_inferred/);
  assert.match(summary, /publicationGate=DEGRADED/);
  assert.match(summary, /qualityState=limited/);
});

test('MotsPet external context forbids causality shortcut', () => {
  const entry = getMotsPetEntry('ELS.EXTERNAL_CONTEXT');
  assert.ok(entry);
  assert.ok(entry.forbiddenShortcuts.includes('cause of dog state'));
});

test('evidence-aware explanation keeps Observe then Qualify structure', () => {
  const text = composeEvidenceAwareExplanation(
    envelope({ publicationGate: 'DEGRADED' }),
    { observe: 'Une habitude semble avoir changé.' },
  );
  assert.match(text, /^Une habitude semble avoir changé\./);
  assert.match(text, /interprétation doit rester prudente/);
});
