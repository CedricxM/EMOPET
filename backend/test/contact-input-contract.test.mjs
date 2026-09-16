import test from 'node:test';
import assert from 'node:assert/strict';

const { parseContactCreateInput } = await import('../dist/api/routes/contact.js');

function validInput(overrides = {}) {
  return {
    reason: 'question_usage',
    message: 'Je souhaite comprendre comment utiliser la fonction Care.',
    consentGiven: true,
    ...overrides,
  };
}

test('Contact Product V1 parser accepts only the canonical finite input and normalizes text', () => {
  assert.deepEqual(parseContactCreateInput({
    reason: '  question_usage  ',
    message: '  Besoin d’aide sur une fonction.  ',
    consentGiven: true,
  }), {
    ok: true,
    value: {
      reason: 'question_usage',
      message: 'Besoin d’aide sur une fonction.',
      consentGiven: true,
    },
  });
});

test('Contact Product V1 parser rejects null, arrays, primitives and incomplete bodies', () => {
  for (const payload of [
    null,
    [],
    'contact',
    42,
    true,
    {},
    { message: 'Missing reason', consentGiven: true },
    { reason: 'question_usage', consentGiven: true },
    { reason: 'question_usage', message: 'Missing consent' },
  ]) {
    const parsed = parseContactCreateInput(payload);
    assert.equal(parsed.ok, false);
    assert.ok(parsed.errors.length > 0);
  }
});

test('Contact Product V1 parser rejects caller-controlled legacy or unknown authority fields', () => {
  for (const forbidden of [
    { ownerToken: 'caller-controlled-owner' },
    { contactValue: 'person@example.test' },
    { channel: 'video' },
    { proposedSlots: [{ start: '2026-09-17T09:00:00Z', end: '2026-09-17T09:30:00Z' }] },
    { requesterUserId: '11111111-1111-4111-8111-111111111111' },
  ]) {
    const parsed = parseContactCreateInput({ ...validInput(), ...forbidden });
    assert.equal(parsed.ok, false);
    assert.ok(parsed.errors.some((error) => error.startsWith('Unsupported Contact field:')));
  }
});

test('Contact Product V1 parser rejects unsupported reasons and malformed known-field types', () => {
  for (const payload of [
    validInput({ reason: 'sante_chien' }),
    validInput({ reason: 7 }),
    validInput({ message: 123 }),
    validInput({ consentGiven: false }),
    validInput({ consentGiven: 'true' }),
  ]) {
    const parsed = parseContactCreateInput(payload);
    assert.equal(parsed.ok, false);
    assert.ok(parsed.errors.length > 0);
  }
});

test('Contact Product V1 parser enforces required non-empty message and the existing 500-character bound', () => {
  for (const message of ['', '   ', 'm'.repeat(501)]) {
    const parsed = parseContactCreateInput(validInput({ message }));
    assert.equal(parsed.ok, false);
  }

  const atLimit = parseContactCreateInput(validInput({ message: 'm'.repeat(500) }));
  assert.equal(atLimit.ok, true);
  if (atLimit.ok) assert.equal(atLimit.value.message.length, 500);
});
