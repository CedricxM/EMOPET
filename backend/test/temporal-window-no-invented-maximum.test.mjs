/**
 * #142 WINDOW-G3 guard.
 *
 * The open decision is whether the Presence-related lookback routes should have
 * a maximum horizon and, if so, what authority sets it. Current main still has
 * no durable Presence persistence/lifecycle authority, so this test prevents a
 * convenience number from becoming product policy before the data source and
 * its lifecycle are actually named.
 *
 * #140 Vet Report is deliberately separate: it uses parseVetReportDays and a
 * mixed report dataset, so this shared Presence helper must not pretend to own
 * that decision.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

const HELPER = 'backend/api/utils/temporal-window.ts';

/**
 * Strip comments before scanning for code. The helper's own doc comment names
 * historical values it warns against, so a raw-text scan would flag the warning.
 */
function codeOnly(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

test('the shared Presence parser still declares no maximum horizon', async () => {
  const source = codeOnly(await read(HELPER));

  const declarations = [...source.matchAll(/^export const ([A-Z_]+) = (\d+);$/gm)];
  assert.deepEqual(
    declarations.map(([, name]) => name),
    ['DEFAULT_LOOKBACK_DAYS'],
    'a new numeric constant appeared in the shared window parser — see #142 WINDOW-G3',
  );

  for (const forbidden of [/MAX_LOOKBACK/, /MAX_DAYS/, /days <= 30/, /<=\s*30\b/]) {
    assert.equal(forbidden.test(source), false, `invented maximum: ${forbidden}`);
  }
});

test('the helper records the real authority gap instead of inventing a retention-derived cap', async () => {
  const source = await read(HELPER);

  assert.match(source, /#142/);
  assert.match(source, /#135/);
  assert.match(source, /durable Presence/i);
  assert.match(source, /retention\/lifecycle authority/i);

  // Vet Report is a separate parser/dataset and must not be silently folded
  // into the Presence WINDOW-G3 control.
  assert.match(source, /#140 Vet Report is intentionally out of scope/);

  // Guard against the previous incorrect derivation being reintroduced here.
  assert.doesNotMatch(source, /36 months/i);
  assert.doesNotMatch(source, /sensor_preprocessed_detailed/);
  assert.doesNotMatch(source, /eli_inferred_detailed/);
});

test('current Presence call sites remain fail-closed rather than defining a hidden data-retention ceiling', async () => {
  const [dogs, sensors] = await Promise.all([
    read('backend/api/routes/dogs.ts'),
    read('backend/api/routes/sensors.ts'),
  ]);

  assert.match(dogs, /parseLookbackWindow\(c\.req\.query\('days'\)\)/);
  assert.match(dogs, /ABSENCE_COMPARISON_PERSISTENCE_NOT_READY/);
  assert.match(dogs, /maturity: 'NOT_IMPLEMENTED'/);

  assert.match(sensors, /parseLookbackWindow\(c\.req\.query\('days'\)\)/);
  assert.match(sensors, /PRESENCE_PERSISTENCE_NOT_READY/);
  assert.match(sensors, /durable Product V1 persistence authority/);
});
