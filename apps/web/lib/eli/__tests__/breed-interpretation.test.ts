/**
 * Tests interprétation ELI consciente de la race (Partie B).
 * Invariants : valeur + confiance inchangées ; aucune sortie médicale/émotionnelle ;
 * neutralité si pelage non déclaré.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { interpretWithContext } from '../breed-aware-interpretation';
import type { IndicatorInput } from '../breed-aware-interpretation';

const MEDICAL = ['mala' + 'die', 'patholog', 'coup de chaleur', 'déshydrat', 'hyperthermie', 'arthrose', 'diag' + 'nostic'];
const EMOTION = ['heu' + 'reux', 'tri' + 'ste', 'anxieux', 'déprim', 'jo' + 'ie', 'bon' + 'heur', 'pe' + 'ur'];

const ind = (over: Partial<IndicatorInput> = {}): IndicatorInput => ({ value: 64, confidenceState: 'VALID', metric: 'activite', deviation: 'below', ...over });

test('valeur et confiance strictement inchangées', () => {
  const r = interpretWithContext(ind({ value: 64, confidenceState: 'DEGRADED' }), { furType: 'long', ambientTempC: 26 });
  assert.equal(r.rawValue, 64);
  assert.equal(r.confidenceState, 'DEGRADED');
});

test('cas canonique : poil long + 26°C + baisse d’activité → écart attendu', () => {
  const r = interpretWithContext(ind(), { furType: 'long', ambientTempC: 26 });
  assert.equal(r.expectedGivenProfile, true);
  assert.ok(r.contextFactors.includes('poil long'));
  assert.ok(r.contextFactors.some((f) => f.includes('26')));
});

test('pelage non déclaré → interprétation neutre (aucune modulation)', () => {
  const r = interpretWithContext(ind(), { furType: null, ambientTempC: 26 });
  assert.equal(r.expectedGivenProfile, false);
});

test('poil court + 26°C → baisse d’activité NON attendue', () => {
  const r = interpretWithContext(ind(), { furType: 'court', ambientTempC: 26 });
  assert.equal(r.expectedGivenProfile, false);
});

test('aucun terme médical ni émotionnel dans les facteurs de contexte', () => {
  const scenarios = [
    interpretWithContext(ind(), { furType: 'long', ambientTempC: 30, ambientHumidity: 80, sizeCategory: 'grand' }),
    interpretWithContext(ind({ metric: 'repos', deviation: 'above' }), { furType: 'double', ambientTempC: 28 }),
    interpretWithContext(ind(), { furType: 'court', ambientTempC: 5 }),
  ];
  for (const r of scenarios) {
    const text = r.contextFactors.join(' ').toLowerCase();
    for (const w of [...MEDICAL, ...EMOTION]) assert.ok(!text.includes(w), `facteur contient "${w}"`);
  }
});
