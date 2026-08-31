import assert from 'node:assert/strict';
import test from 'node:test';

import { BREIZ_PERSONA_V01, personaModeForEvidence } from './persona';

test('degraded, suppressed and unknown evidence force serious persona mode', () => {
  assert.equal(personaModeForEvidence('DEGRADED'), 'serious');
  assert.equal(personaModeForEvidence('SUPPRESSED'), 'serious');
  assert.equal(personaModeForEvidence('UNKNOWN'), 'serious');
});

test('valid evidence does not automatically force serious mode', () => {
  assert.equal(personaModeForEvidence('VALID'), 'everyday');
});

test('Breiz serious mode removes humour and dialect intensity', () => {
  assert.equal(BREIZ_PERSONA_V01.seriousMode.humour, 0);
  assert.equal(BREIZ_PERSONA_V01.seriousMode.dialect, 0);
});

test('Breiz persona remains draft and cannot be treated as controlled authority', () => {
  assert.equal(BREIZ_PERSONA_V01.status, 'DRAFT');
});
