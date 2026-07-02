/**
 * Tests ELI v6 — intégrité du catalogue + invariants sémantiques (no medical).
 * Exécution : pnpm test (depuis apps/web).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  FAMILIES,
  PROXIES,
  VETOES,
  SUB_BASELINES,
  WQI_DIMENSIONS,
  indicatorStateMessage,
} from '../catalog';
import { freezeBaseline, gateOf, generateSnapshots, summarize } from '../mock';

const FORBIDDEN = ['san' + 'té', 'mala' + 'die', 'anxi' + 'été', 'str' + 'ess', 'dépres' + 'sion', 'heu' + 'reux', 'tri' + 'ste', 'joyeux', 'bon' + 'heur', 'diag' + 'nostic', 'arthrose', 'dysplasie', 'patholog'];

test('catalogue : 23 proxies, 4 familles, 11 vetoes, 5 sous-baselines', () => {
  assert.equal(PROXIES.length, 23);
  assert.equal(FAMILIES.length, 4);
  assert.equal(VETOES.length, 11);
  assert.equal(SUB_BASELINES.length, 5);
});

test('WQI : pondérations exercice/exploration/social = 1.0 (ELI v6 §7)', () => {
  const sum = WQI_DIMENSIONS.reduce((s, d) => s + d.weight, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9, `somme des poids = ${sum}`);
});

test('invariant : aucun message d’état WQI/RSI ne contient de terme médical/émotionnel', () => {
  for (const state of ['stable', 'amelioration', 'attention'] as const) {
    const msg = indicatorStateMessage(state).toLowerCase();
    for (const w of FORBIDDEN) assert.ok(!msg.includes(w), `"${state}" contient "${w}"`);
  }
});

test('invariant : aucun libellé/description de proxy ne contient de terme pathologique', () => {
  for (const p of PROXIES) {
    const text = `${p.label} ${p.description}`.toLowerCase();
    for (const w of ['mala' + 'die', 'diag' + 'nostic', 'arthrose', 'dysplasie', 'anxi' + 'été', 'dépres' + 'sion', 'patholog']) {
      assert.ok(!text.includes(w), `${p.id} contient "${w}"`);
    }
  }
});

test('gating de publication PUBLISH/DEGRADE/REJECT (ELI v6 §13)', () => {
  assert.equal(gateOf(0.85), 'PUBLISH');
  assert.equal(gateOf(0.55), 'DEGRADE');
  assert.equal(gateOf(0.2), 'REJECT');
});

test('summarize : structure cohérente (wellbeing distinct de WQI, RSI présent)', () => {
  const snaps = generateSnapshots();
  const base = freezeBaseline(snaps);
  const s = summarize(snaps, base, 7);
  assert.ok(s.wellbeing.current >= 0 && s.wellbeing.current <= 100);
  assert.ok('exercise' in s.wqi && 'exploration' in s.wqi && 'social' in s.wqi);
  assert.equal(s.subBaselines.length, 5);
  assert.ok(['GOLD', 'SILVER', 'BRONZE', 'REJECTED'].includes(s.tier));
});
