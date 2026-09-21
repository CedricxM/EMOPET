import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);

async function text(path) {
  return readFile(new URL(path, root), 'utf8');
}

test('privacy retention authority is not duplicated in stale shared/contact constants', async () => {
  const [shared, contact, gaps, scheduleText] = await Promise.all([
    text('packages/shared/src/constants/index.ts'),
    text('apps/web/lib/contact.ts'),
    text('docs/STACK_GAPS.md'),
    text('config/privacy/retention-schedule.json'),
  ]);

  for (const forbidden of [
    'GPS_RETENTION_DAYS',
    'SENSOR_SUMMARY_RETENTION_MONTHS',
    'AI_INSIGHT_RETENTION_MONTHS',
  ]) {
    assert.equal(shared.includes(forbidden), false, forbidden);
  }

  assert.equal(contact.includes('RETENTION_MONTHS = 6'), false);
  assert.equal(contact.includes('purge cron à 6 mois'), false);
  assert.equal(gaps.includes('purge contact 6 mois'), false);

  assert.match(shared, /retention-schedule\.json/);
  assert.match(contact, /retention-schedule\.json/);
  assert.match(gaps, /retention-schedule\.json/);

  const schedule = JSON.parse(scheduleText);
  const byId = (id) => {
    const row = schedule.categories.find((entry) => entry.id === id);
    assert.ok(row, `missing retention category: ${id}`);
    return row;
  };

  assert.deepEqual(byId('exact_location').activeRetention, {
    mode: 'MAX_DURATION',
    value: 24,
    unit: 'HOURS',
  });

  assert.deepEqual(byId('sensor_preprocessed_detailed').activeRetention, {
    mode: 'DURATION',
    value: 36,
    unit: 'MONTHS',
  });

  assert.deepEqual(byId('eli_inferred_detailed').activeRetention, {
    mode: 'DURATION',
    value: 36,
    unit: 'MONTHS',
  });

  assert.deepEqual(byId('ai_messages').activeRetention, {
    mode: 'NO_DURABLE_RETENTION',
    value: 0,
    unit: 'SECONDS',
  });

  assert.deepEqual(byId('support_contact').activeRetention, {
    mode: 'DURATION',
    value: 24,
    unit: 'MONTHS',
  });

  assert.equal(schedule.runtimeEnforcement, 'NOT_IMPLEMENTED');
});
