/**
 * Tests contact — validation : consentement obligatoire, motif vétérinaire absent,
 * créneaux futurs, format coordonnée selon canal.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { REASON_LABELS, buildRequest, validateContactInput } from '../contact';
import type { NewContactInput } from '../contact';

const future = new Date(Date.now() + 86_400_000).toISOString();
const futureEnd = new Date(Date.now() + 86_400_000 + 1_800_000).toISOString();

function base(): NewContactInput {
  return { channel: 'phone', reason: 'retour_experience', contactValue: '+33612345678', proposedSlots: [{ start: future, end: futureEnd }], consentGiven: true };
}

test('valide : demande téléphone correcte', () => {
  assert.deepEqual(validateContactInput(base()), []);
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
