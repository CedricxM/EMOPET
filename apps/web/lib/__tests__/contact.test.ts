/**
 * Tests contact — validation : consentement obligatoire, motif vétérinaire absent,
 * créneaux futurs, format coordonnée selon canal, structure runtime hostile.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { REASON_LABELS, buildRequest, parseNewContactInput, validateContactInput } from '../contact';
import type { NewContactInput } from '../contact';

const future = new Date(Date.now() + 86_400_000).toISOString();
const futureEnd = new Date(Date.now() + 86_400_000 + 1_800_000).toISOString();

function base(): NewContactInput {
  return { channel: 'phone', reason: 'retour_experience', contactValue: '+33612345678', proposedSlots: [{ start: future, end: futureEnd }], consentGiven: true };
}

test('valide : demande téléphone correcte', () => {
  assert.deepEqual(validateContactInput(base()), []);
});

test('parser : conserve le contrat web et écarte les champs inconnus, y compris dans les créneaux', () => {
  const input = { ...base(), ownerToken: 'owner-existing', message: ' Message facultatif ' };
  const payload = {
    ...input,
    requesterUserId: 'untrusted-user',
    extra: 'ignored',
    status: 'completed',
    proposedSlots: [{ ...input.proposedSlots[0]!, extra: 'ignored' }],
  };
  assert.deepEqual(parseNewContactInput(payload), input);
  assert.equal(payload.extra, 'ignored', 'le parser ne modifie pas le payload');
  assert.notEqual(parseNewContactInput(payload)?.proposedSlots, payload.proposedSlots);
});

test('parser : rejette les structures hostiles et les types incorrects avant la validation métier', () => {
  for (const payload of [
    null, [], 'contact', 42, true, {},
    { ...base(), channel: 'sms' },
    { ...base(), reason: 'sante_chien' },
    { ...base(), reason: 'toString' },
    { ...base(), reason: '__proto__' },
    { ...base(), reason: 7 },
    { ...base(), contactValue: undefined },
    { ...base(), contactValue: 123 },
    { ...base(), proposedSlots: undefined },
    { ...base(), proposedSlots: {} },
    { ...base(), proposedSlots: [null] },
    { ...base(), proposedSlots: [{ start: future }] },
    { ...base(), proposedSlots: [{ start: 123, end: futureEnd }] },
    { ...base(), proposedSlots: Array.from({ length: 6 }, () => ({ start: future, end: futureEnd })) },
    { ...base(), consentGiven: 'true' },
    { ...base(), message: 123 },
    { ...base(), message: null },
    { ...base(), ownerToken: 123 },
    { ...base(), ownerToken: null },
  ]) {
    assert.equal(parseNewContactInput(payload), null, JSON.stringify(payload));
  }
});

test('parser : bornes inclusives des textes, sans perdre les champs reconnus', () => {
  for (const [field, limit] of [['contactValue', 254], ['message', 500], ['ownerToken', 128]] as const) {
    assert.notEqual(parseNewContactInput({ ...base(), [field]: 'x'.repeat(limit) }), null);
    assert.equal(parseNewContactInput({ ...base(), [field]: 'x'.repeat(limit + 1) }), null);
  }
  for (const field of ['start', 'end'] as const) {
    assert.notEqual(parseNewContactInput({
      ...base(), proposedSlots: [{ start: future, end: futureEnd, [field]: 'x'.repeat(64) }],
    }), null);
    assert.equal(parseNewContactInput({
      ...base(), proposedSlots: [{ start: future, end: futureEnd, [field]: 'x'.repeat(65) }],
    }), null);
  }
});

test('parser : le message reste facultatif et sa normalisation appartient à buildRequest', () => {
  for (const message of [undefined, '', '   ', '  Message  ']) {
    const input = { ...base(), message };
    const parsed = parseNewContactInput(input);
    assert.notEqual(parsed, null);
    assert.deepEqual(validateContactInput(parsed!), []);
    assert.equal(buildRequest(parsed!).message, message?.trim() || undefined);
  }
});

test('parser : consentement et minimum de créneaux restent des règles métier', () => {
  const noSlots = parseNewContactInput({ ...base(), proposedSlots: [] });
  assert.notEqual(noSlots, null);
  assert.ok(validateContactInput(noSlots!).some((error) => /1 à 5/.test(error)));
  const noConsent = parseNewContactInput({ ...base(), consentGiven: false });
  assert.notEqual(noConsent, null);
  assert.ok(validateContactInput(noConsent!).some((error) => /consentement/i.test(error)));
});

test('consentement obligatoire', () => {
  const errs = validateContactInput({ ...base(), consentGiven: false });
  assert.ok(errs.some((e) => /consentement/i.test(e)));
});

test('motif vétérinaire absent du canal (rejeté)', () => {
  assert.ok(!('sante_chien' in REASON_LABELS));
  const errs = validateContactInput({ ...base(), reason: 'sante_chien' as NewContactInput['reason'] });
  assert.ok(errs.length > 0, 'motif vétérinaire rejeté');
});

test('créneau dans le passé rejeté', () => {
  const past = new Date(Date.now() - 86_400_000).toISOString();
  const errs = validateContactInput({ ...base(), proposedSlots: [{ start: past, end: future }] });
  assert.ok(errs.some((e) => /futur/i.test(e)));
});

test('email requis pour la visio, téléphone pour l’appel', () => {
  assert.ok(validateContactInput({ ...base(), channel: 'video', contactValue: 'pas-un-email' }).some((e) => /email/i.test(e)));
  assert.ok(validateContactInput({ ...base(), channel: 'video', contactValue: 'ok@emopet.fr' }).length === 0);
  assert.ok(validateContactInput({ ...base(), channel: 'phone', contactValue: 'abc' }).some((e) => /téléphone/i.test(e)));
});

test('email : validation bornée et déterministe', () => {
  const invalid = [
    'a@@emopet.fr',
    'a@emopet',
    'a@.emopet.fr',
    'a@emopet.fr.',
    `${'a'.repeat(65)}@emopet.fr`,
    `${'a'.repeat(245)}@emopet.fr`,
    'a b@emopet.fr',
    'a@emo\npet.fr',
  ];

  for (const contactValue of invalid) {
    assert.ok(
      validateContactInput({ ...base(), channel: 'video', contactValue }).some((e) => /email/i.test(e)),
      `doit rejeter ${JSON.stringify(contactValue)}`,
    );
  }
});

test('1 à 5 créneaux', () => {
  assert.ok(validateContactInput({ ...base(), proposedSlots: [] }).some((e) => /1 à 5/.test(e)));
});

test('buildRequest : statut pending, type de coordonnée selon canal', () => {
  assert.equal(buildRequest(base()).contactValueType, 'phone');
  assert.equal(buildRequest({ ...base(), channel: 'video', contactValue: 'a@b.fr' }).contactValueType, 'email');
  assert.equal(buildRequest(base()).status, 'pending');
});

test('buildRequest : conserve le jeton propriétaire quand il est fourni', () => {
  const request = buildRequest({ ...base(), ownerToken: 'owner-test' });
  assert.equal(request.ownerToken, 'owner-test');
});
