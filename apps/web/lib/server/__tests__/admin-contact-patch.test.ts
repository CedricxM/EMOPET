import assert from 'node:assert/strict';
import test from 'node:test';

import { parseAdminContactPatch } from '../admin-contact-patch';

const slot = {
  start: '2026-09-05T09:00:00.000Z',
  end: '2026-09-05T09:30:00.000Z',
};

test('admin contact patch parser accepts known fields and drops unknown fields', () => {
  assert.deepEqual(
    parseAdminContactPatch({
      status: 'scheduled',
      scheduledSlot: slot,
      teamNotes: 'Appeler à 9h.',
      unexpected: 'ignored',
    }),
    {
      status: 'scheduled',
      scheduledSlot: slot,
      teamNotes: 'Appeler à 9h.',
    },
  );
});

test('admin contact patch parser permits an empty patch to preserve existing no-op semantics', () => {
  assert.deepEqual(parseAdminContactPatch({}), {});
});

test('admin contact patch parser rejects non-object bodies and malformed known fields', () => {
  for (const payload of [
    null,
    [],
    'patch',
    42,
    true,
    { status: 'unknown' },
    { status: 7 },
    { scheduledSlot: null },
    { scheduledSlot: [] },
    { scheduledSlot: { start: slot.start } },
    { scheduledSlot: { start: 123, end: slot.end } },
    { teamNotes: 123 },
    { teamNotes: null },
  ]) {
    assert.equal(parseAdminContactPatch(payload), null);
  }
});

test('admin contact patch parser bounds scheduled-slot timestamp strings', () => {
  assert.equal(
    parseAdminContactPatch({ scheduledSlot: { start: 's'.repeat(65), end: slot.end } }),
    null,
  );
  assert.equal(
    parseAdminContactPatch({ scheduledSlot: { start: slot.start, end: 'e'.repeat(65) } }),
    null,
  );
});

test('teamNotes has no invented semantic max; transport byte ceiling remains the resource bound', () => {
  const teamNotes = 'n'.repeat(4_000);
  assert.deepEqual(parseAdminContactPatch({ teamNotes }), { teamNotes });
});
