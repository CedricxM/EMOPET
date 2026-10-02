import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import postgres from 'postgres';

const integrationEnabled = process.env.EMOPET_DB_INTEGRATION_TEST === '1';

test('presence_events schema is durable, bounded, and replay-safe', { skip: !integrationEnabled }, async () => {
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const ownerId = randomUUID();
  const dogId = randomUUID();
  const ingestionId = randomUUID();
  const suffix = randomUUID();

  try {
    const columns = await sql`
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'presence_events'
        AND column_name IN ('dog_id', 'ingestion_id', 'source', 'state', 'event_at', 'received_at')
      ORDER BY column_name
    `;
    assert.deepEqual(
      Object.fromEntries(columns.map((row) => [row.column_name, row.is_nullable])),
      {
        dog_id: 'NO',
        event_at: 'NO',
        ingestion_id: 'NO',
        received_at: 'NO',
        source: 'NO',
        state: 'NO',
      },
    );

    const [uniqueRow] = await sql`
      SELECT EXISTS (
        SELECT 1
        FROM pg_index i
        JOIN pg_class t ON t.oid = i.indrelid
        WHERE t.oid = 'public.presence_events'::regclass
          AND i.indisunique
          AND pg_get_indexdef(i.indexrelid) LIKE '%(ingestion_id)%'
      ) AS present
    `;
    assert.equal(uniqueRow.present, true);

    await sql`
      INSERT INTO users (id, email, password_hash, name)
      VALUES (${ownerId}, ${`presence-owner-${suffix}@example.test`}, 'integration-test-only', 'Presence Owner')
    `;
    await sql`
      INSERT INTO dogs (id, owner_id, name, breed, birth_date, sex, weight, fur_class)
      VALUES (${dogId}, ${ownerId}, 'Moka', 'Mixed', '2021-05-01', 'male', 18.4, 'FC2')
    `;

    const eventAt = new Date(Date.now() - 60_000);
    const [created] = await sql`
      INSERT INTO presence_events (dog_id, ingestion_id, source, state, event_at)
      VALUES (${dogId}, ${ingestionId}, 'phone_passive', 'present', ${eventAt})
      RETURNING event_at, received_at
    `;
    assert.equal(new Date(created.event_at).toISOString(), eventAt.toISOString());
    assert.ok(new Date(created.received_at).getTime() > eventAt.getTime());

    await assert.rejects(
      sql`
        INSERT INTO presence_events (dog_id, ingestion_id, source, state, event_at)
        VALUES (${dogId}, ${ingestionId}, 'phone_passive', 'present', ${eventAt})
      `,
      /unique|duplicate/i,
    );

    await assert.rejects(
      sql`
        INSERT INTO presence_events (dog_id, ingestion_id, source, state, event_at)
        VALUES (${dogId}, ${randomUUID()}, 'raw_gps', 'present', ${eventAt})
      `,
      /check constraint|violates check/i,
    );

    await assert.rejects(
      sql`
        INSERT INTO presence_events (dog_id, ingestion_id, source, state, event_at)
        VALUES (${dogId}, ${randomUUID()}, 'manual_override', 'unknown', ${eventAt})
      `,
      /check constraint|violates check/i,
    );
  } finally {
    await sql`DELETE FROM presence_events WHERE dog_id = ${dogId}`.catch(() => {});
    await sql`DELETE FROM dogs WHERE id = ${dogId}`.catch(() => {});
    await sql`DELETE FROM users WHERE id = ${ownerId}`.catch(() => {});
    await sql.end();
  }
});
