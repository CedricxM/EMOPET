import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import postgres from 'postgres';

const integrationEnabled = process.env.EMOPET_DB_INTEGRATION_TEST === '1';

test('phone_presence_events matches the controlled #135 readiness contract', { skip: !integrationEnabled }, async () => {
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const ownerA = randomUUID();
  const ownerB = randomUUID();
  const dogA = randomUUID();
  const dogB = randomUUID();
  const suffix = randomUUID();
  const key = 'retry-key-0001';

  try {
    const columns = await sql`
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'phone_presence_events'
      ORDER BY ordinal_position
    `;

    assert.deepEqual(
      columns.map((row) => row.column_name),
      [
        'event_id',
        'owner_id',
        'dog_id',
        'idempotency_key',
        'phone_seen',
        'observed_at',
        'received_at',
        'source',
      ],
    );
    assert.equal(columns.every((row) => row.is_nullable === 'NO'), true);

    const [uniqueScope] = await sql`
      SELECT pg_get_indexdef(i.indexrelid) AS definition
      FROM pg_index i
      WHERE i.indrelid = 'public.phone_presence_events'::regclass
        AND i.indisunique
        AND pg_get_indexdef(i.indexrelid) LIKE '%(owner_id, idempotency_key)%'
      LIMIT 1
    `;
    assert.ok(uniqueScope, 'idempotency must be scoped to Owner, not globally');

    await sql`
      INSERT INTO users (id, email, password_hash, name)
      VALUES
        (${ownerA}, ${`presence-a-${suffix}@example.test`}, 'integration-test-only', 'Owner A'),
        (${ownerB}, ${`presence-b-${suffix}@example.test`}, 'integration-test-only', 'Owner B')
    `;
    await sql`
      INSERT INTO dogs (id, owner_id, name, breed, birth_date, sex, weight, fur_class)
      VALUES
        (${dogA}, ${ownerA}, 'Dog A', 'Mixed', '2021-05-01', 'female', 18.4, 'FC2'),
        (${dogB}, ${ownerB}, 'Dog B', 'Mixed', '2020-03-01', 'male', 22.0, 'FC2')
    `;

    const observedAt = new Date(Date.now() - 60_000);
    const [createdA] = await sql`
      INSERT INTO phone_presence_events (
        owner_id, dog_id, idempotency_key, phone_seen, observed_at, source
      ) VALUES (
        ${ownerA}, ${dogA}, ${key}, true, ${observedAt}, 'manual_override'
      )
      RETURNING event_id, observed_at, received_at
    `;

    assert.match(createdA.event_id, /^[0-9a-f-]{36}$/i);
    assert.equal(new Date(createdA.observed_at).toISOString(), observedAt.toISOString());
    assert.ok(new Date(createdA.received_at).getTime() >= observedAt.getTime());

    await assert.rejects(
      sql`
        INSERT INTO phone_presence_events (
          owner_id, dog_id, idempotency_key, phone_seen, observed_at, source
        ) VALUES (
          ${ownerA}, ${dogA}, ${key}, true, ${observedAt}, 'manual_override'
        )
      `,
      /unique|duplicate/i,
    );

    const [createdB] = await sql`
      INSERT INTO phone_presence_events (
        owner_id, dog_id, idempotency_key, phone_seen, observed_at, source
      ) VALUES (
        ${ownerB}, ${dogB}, ${key}, false, ${observedAt}, 'phone_passive'
      )
      RETURNING event_id
    `;
    assert.ok(createdB.event_id, 'same caller key must be independent across Owners');

    await assert.rejects(
      sql`
        INSERT INTO phone_presence_events (
          owner_id, dog_id, idempotency_key, phone_seen, observed_at, source
        ) VALUES (
          ${ownerA}, ${dogA}, 'short', true, ${observedAt}, 'manual_override'
        )
      `,
      /check constraint|violates check/i,
    );

    await assert.rejects(
      sql`
        INSERT INTO phone_presence_events (
          owner_id, dog_id, idempotency_key, phone_seen, observed_at, source
        ) VALUES (
          ${ownerA}, ${dogA}, 'invalid-source-key', true, ${observedAt}, 'raw_gps'
        )
      `,
      /check constraint|violates check/i,
    );
  } finally {
    await sql`DELETE FROM phone_presence_events WHERE owner_id IN (${ownerA}, ${ownerB})`.catch(() => {});
    await sql`DELETE FROM dogs WHERE id IN (${dogA}, ${dogB})`.catch(() => {});
    await sql`DELETE FROM users WHERE id IN (${ownerA}, ${ownerB})`.catch(() => {});
    await sql.end();
  }
});
