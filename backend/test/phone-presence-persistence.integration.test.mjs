import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import postgres from 'postgres';

const integrationEnabled = process.env.PHONE_PRESENCE_DB_INTEGRATION === '1';

test('phone_presence_events schema matches the controlled durable foundation', {
  skip: !integrationEnabled,
}, async () => {
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const ownerA = randomUUID();
  const ownerB = randomUUID();
  const dogA = randomUUID();
  const dogB = randomUUID();
  const suffix = randomUUID();
  const idempotencyKey = 'presence:test:0001';

  try {
    const columns = await sql`
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'phone_presence_events'
      ORDER BY column_name
    `;

    const byName = Object.fromEntries(
      columns.map((row) => [row.column_name, row.is_nullable]),
    );

    assert.deepEqual(
      Object.keys(byName).sort(),
      [
        'dog_id',
        'event_id',
        'idempotency_key',
        'observed_at',
        'owner_id',
        'phone_seen',
        'received_at',
        'source',
      ],
    );

    for (const required of [
      'dog_id',
      'event_id',
      'idempotency_key',
      'observed_at',
      'owner_id',
      'phone_seen',
      'received_at',
      'source',
    ]) {
      assert.equal(byName[required], 'NO', required);
    }

    for (const forbidden of ['rssi', 'latitude', 'longitude', 'coordinates', 'free_text']) {
      assert.equal(forbidden in byName, false, forbidden);
    }

    const [ownerDogFk] = await sql`
      SELECT
        count(*) FILTER (WHERE parent.relname = 'users' AND child_att.attname = 'owner_id')::int AS owner_fk,
        count(*) FILTER (WHERE parent.relname = 'dogs' AND child_att.attname = 'dog_id')::int AS dog_fk
      FROM pg_constraint con
      JOIN pg_class child ON child.oid = con.conrelid
      JOIN pg_class parent ON parent.oid = con.confrelid
      JOIN LATERAL unnest(con.conkey) child_key(attnum) ON true
      JOIN pg_attribute child_att
        ON child_att.attrelid = child.oid
       AND child_att.attnum = child_key.attnum
      WHERE con.contype = 'f'
        AND child.relname = 'phone_presence_events'
    `;
    assert.equal(ownerDogFk.owner_fk, 1);
    assert.equal(ownerDogFk.dog_fk, 1);

    await sql`
      INSERT INTO users (id, email, password_hash, name)
      VALUES
        (${ownerA}, ${`presence-owner-a-${suffix}@example.test`}, 'integration-test-only', 'Presence Owner A'),
        (${ownerB}, ${`presence-owner-b-${suffix}@example.test`}, 'integration-test-only', 'Presence Owner B')
    `;
    await sql`
      INSERT INTO dogs (id, owner_id, name, breed, birth_date, sex, weight, fur_class)
      VALUES
        (${dogA}, ${ownerA}, 'Moka', 'Mixed', '2021-05-01', 'male', 18.4, 'FC2'),
        (${dogB}, ${ownerB}, 'Nala', 'Mixed', '2020-04-01', 'female', 16.1, 'FC2')
    `;

    const observedAt = new Date(Date.now() - 60_000);
    const [created] = await sql`
      INSERT INTO phone_presence_events (
        owner_id,
        dog_id,
        idempotency_key,
        phone_seen,
        observed_at,
        source
      )
      VALUES (
        ${ownerA},
        ${dogA},
        ${idempotencyKey},
        true,
        ${observedAt},
        'phone_passive'
      )
      RETURNING event_id, observed_at, received_at
    `;

    assert.match(created.event_id, /^[0-9a-f-]{36}$/i);
    assert.equal(new Date(created.observed_at).toISOString(), observedAt.toISOString());
    assert.ok(new Date(created.received_at).getTime() >= observedAt.getTime());

    await assert.rejects(
      sql`
        INSERT INTO phone_presence_events (
          owner_id, dog_id, idempotency_key, phone_seen, observed_at, source
        )
        VALUES (
          ${ownerA}, ${dogA}, ${idempotencyKey}, false, ${observedAt}, 'manual_override'
        )
      `,
      /unique|duplicate/i,
    );

    // Owner-scoped idempotency means a second Owner may independently reuse the key.
    await sql`
      INSERT INTO phone_presence_events (
        owner_id, dog_id, idempotency_key, phone_seen, observed_at, source
      )
      VALUES (
        ${ownerB}, ${dogB}, ${idempotencyKey}, false, ${observedAt}, 'manual_override'
      )
    `;

    await assert.rejects(
      sql`
        INSERT INTO phone_presence_events (
          owner_id, dog_id, idempotency_key, phone_seen, observed_at, source
        )
        VALUES (
          ${ownerA}, ${dogA}, 'short', true, ${observedAt}, 'phone_passive'
        )
      `,
      /check constraint|violates check/i,
    );

    await assert.rejects(
      sql`
        INSERT INTO phone_presence_events (
          owner_id, dog_id, idempotency_key, phone_seen, observed_at, source
        )
        VALUES (
          ${ownerA}, ${dogA}, 'presence:test:raw-gps', true, ${observedAt}, 'raw_gps'
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
