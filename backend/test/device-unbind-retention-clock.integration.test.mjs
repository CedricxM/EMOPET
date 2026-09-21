import test, { after } from 'node:test';
import assert from 'node:assert/strict';

const enabled = process.env.DEVICE_UNBIND_RETENTION_DB_INTEGRATION === '1';

let sql = null;

if (enabled) {
  const { default: postgres } = await import('postgres');
  sql = postgres(process.env.DATABASE_URL, { max: 1 });
}

after(async () => {
  if (sql) await sql.end({ timeout: 5 });
});

test('device unbind clock records future detach transitions without inventing legacy dates', {
  skip: !enabled,
}, async () => {
  const userId = 'a0000000-0000-4000-8000-000000000510';
  const dogA = 'b0000000-0000-4000-8000-000000000510';
  const dogB = 'b0000000-0000-4000-8000-000000000511';
  const mac = '02:00:00:00:05:10';

  await sql`DELETE FROM devices WHERE mac_address = ${mac}`;
  await sql`DELETE FROM dogs WHERE id IN (${dogA}, ${dogB})`;
  await sql`DELETE FROM users WHERE id = ${userId}`;

  await sql`
    INSERT INTO users (id, email, password_hash, name)
    VALUES (${userId}, 'device-retention-510@emopet.invalid', 'test-only', 'Device Retention')
  `;

  await sql`
    INSERT INTO dogs (id, owner_id, name, breed, birth_date, sex, weight, fur_class)
    VALUES
      (${dogA}, ${userId}, 'Clock A', 'Test', '2020-01-01', 'female', 20.0, 'FC2'),
      (${dogB}, ${userId}, 'Clock B', 'Test', '2021-01-01', 'male', 21.0, 'FC2')
  `;

  await sql`
    INSERT INTO devices (dog_id, type, mac_address)
    VALUES (${dogA}, 'TAG', ${mac})
  `;

  try {
    let [row] = await sql`
      SELECT dog_id, unbound_at
      FROM devices
      WHERE mac_address = ${mac}
    `;
    assert.equal(row.dog_id, dogA);
    assert.equal(row.unbound_at, null);

    [row] = await sql`
      UPDATE devices
      SET dog_id = NULL
      WHERE mac_address = ${mac}
      RETURNING dog_id, unbound_at
    `;
    assert.equal(row.dog_id, null);
    assert.ok(row.unbound_at instanceof Date);

    const firstClock = row.unbound_at.toISOString();

    [row] = await sql`
      UPDATE devices
      SET firmware_version = 'clock-test'
      WHERE mac_address = ${mac}
      RETURNING dog_id, unbound_at
    `;
    assert.equal(row.dog_id, null);
    assert.equal(row.unbound_at.toISOString(), firstClock, 'unrelated updates must not reset the unbind clock');

    [row] = await sql`
      UPDATE devices
      SET dog_id = ${dogB}
      WHERE mac_address = ${mac}
      RETURNING dog_id, unbound_at
    `;
    assert.equal(row.dog_id, dogB);
    assert.equal(row.unbound_at, null, 'rebinding must clear the prior retention clock');

    await sql`DELETE FROM dogs WHERE id = ${dogB}`;

    [row] = await sql`
      SELECT dog_id, unbound_at
      FROM devices
      WHERE mac_address = ${mac}
    `;
    assert.equal(row.dog_id, null, 'FK delete action must detach the device');
    assert.ok(row.unbound_at instanceof Date, 'FK-driven detach must start a new retention clock');
  } finally {
    await sql`DELETE FROM devices WHERE mac_address = ${mac}`;
    await sql`DELETE FROM dogs WHERE id IN (${dogA}, ${dogB})`;
    await sql`DELETE FROM users WHERE id = ${userId}`;
  }
});
