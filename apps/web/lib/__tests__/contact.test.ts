/**
 * Tests contact — validation : consentement obligatoire, motif vétérinaire absent,
 * créneaux futurs, format coordonnée selon canal, et structure runtime hostile.
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

test('parser runtime accepte un payload bien formé et ne conserve que les champs connus', () => {
  assert.deepEqual(
    parseNewContactInput({ ...base(), extra: 'ignored' }),
    base(),
  );
});

test('parser runtime rejette null, tableaux, primitives et objets incomplets', () => {
  for (const payload of [
    null,
    [],
    'contact',
    42,
    true,
    {},
    { ...base(), contactValue: undefined },
    { ...base(), proposedSlots: undefined },
    { ...base(), consentGiven: 'true' },
  ]) {
    assert.equal(parseNewContactInput(payload), null);
  }
});

test('parser runtime rejette vocabulaire, types et créneaux structurellement invalides', () => {
  const malformed = [
    { ...base(), channel: 'sms' },
    { ...base(), reason: 'sante_chien' },
    { ...base(), proposedSlots: [null] },
    { ...base(), proposedSlots: [{ start: future }] },
    { ...base(), proposedSlots: [{ start: 123, end: futureEnd }] },
    { ...base(), proposedSlots: Array.from({ length: 6 }, () => ({ start: future, end: futureEnd })) },
  ];

  for (const payload of malformed) {
    assert.equal(parseNewContactInput(payload), null);
  }
});

test('parser runtime borne les champs texte avant validation métier', () => {
  assert.equal(parseNewContactInput({ ...base(), contactValue: 'a'.repeat(255) }), null);
  assert.equal(parseNewContactInput({ ...base(), message: 'm'.repeat(501) }), null);
  assert.equal(parseNewContactInput({ ...base(), ownerToken: 'o'.repeat(129) }), null);
  assert.equal(
    parseNewContactInput({ ...base(), proposedSlots: [{ start: 's'.repeat(65), end: futureEnd }] }),
    null,
  );
});

test('parser structurel laisse la règle 1 à 5 créneaux à la validation métier', () => {
  const parsed = parseNewContactInput({ ...base(), proposedSlots: [] });
  assert.notEqual(parsed, null);
  assert.ok(validateContactInput(parsed!).some((e) => /1 à 5/.test(e)));
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
