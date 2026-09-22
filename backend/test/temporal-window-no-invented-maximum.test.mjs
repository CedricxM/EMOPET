/**
 * #142 WINDOW-G3 / #140 VET-PERIOD-G3 guard.
 *
 * The open decision is whether a maximum query horizon exists at all and, if so,
 * what it is. Until then the instruction "do not invent an arbitrary maximum" is
 * enforced by nothing but a comment. This test enforces it, and records where a
 * real cap would have to come from so the eventual decision is a confirmation
 * rather than a fresh invention.
 *
 * It does NOT assert that a cap is wrong. It asserts that if one appears here it
 * must reference the canonical retention authority instead of restating a number.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

const HELPER = 'backend/api/utils/temporal-window.ts';

/**
 * Strip comments before scanning for code. The helper's own doc comment names
 * the values it warns against, so a raw-text scan flags the warning itself.
 */
function codeOnly(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

test('the shared parser still declares no maximum horizon', async () => {
  const source = codeOnly(await read(HELPER));

  // Only the default is a bare number in this file. Any other numeric constant
  // is a candidate cap and must be reviewed against WINDOW-G3 first.
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

test('the derivation rule is recorded where the decision will be taken', async () => {
  const source = await read(HELPER);
  assert.match(source, /retention-schedule\.json/);
  assert.match(source, /#142/);
  assert.match(source, /#140/);
  assert.match(source, /#478/);
  // The candidate status of the retention number must travel with it.
  assert.match(source, /SIGNOFF_PENDING/);
});

test('the retention category the derivation cites still says 36 months', async () => {
  const schedule = JSON.parse(await read('config/privacy/retention-schedule.json'));
  for (const id of ['sensor_preprocessed_detailed', 'eli_inferred_detailed']) {
    const category = schedule.categories.find((row) => row.id === id);
    assert.ok(category, `missing retention category: ${id}`);
    assert.equal(category.activeRetention.mode, 'DURATION');
    assert.equal(category.activeRetention.value, 36);
    assert.equal(category.activeRetention.unit, 'MONTHS');
  }
  // If this ever stops being a candidate, revisit the comment in the helper.
  assert.equal(schedule.status, 'PRODUCT_APPROVED_CANDIDATE_LEGAL_PRIVACY_SIGNOFF_PENDING');
});
