import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const enabled = process.env.EMOPET_DB_INTEGRATION_TEST === '1';

test('INT-05 A/A constrains direct PostgreSQL writers independently of the application', { skip: !enabled }, async (t) => {
  const { default: postgres } = await import('postgres');
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const owner = randomUUID();
  const dog = randomUUID();
  t.after(async () => {
    await sql`DELETE FROM professional_share_grants WHERE dog_id = ${dog}`;
    await sql`DELETE FROM dogs WHERE id = ${dog}`;
    await sql`DELETE FROM users WHERE id = ${owner}`;
    await sql.end();
  });
  await sql`INSERT INTO users (id, email, password_hash, name) VALUES (${owner}, ${`${owner}@example.test`}, 'test-only', 'Owner')`;
  await sql`INSERT INTO dogs (id, owner_id, name, breed, birth_date, sex, weight, fur_class)
    VALUES (${dog}, ${owner}, 'Fixture', 'Test', '2020-01-01', 'female', 20, 'FC2')`;
  const scopes = [
    'VETERINARY_SUMMARY', 'OWNER_SELECTED_NOTES', 'QUALIFIED_LONGITUDINAL_OBSERVATIONS',
    'DATA_COVERAGE_AND_CONFIDENCE', 'DECLARED_CONTEXT',
  ];
  async function insert(patch = {}) {
    const row = {
      owner_user_id: owner, dog_id: dog, recipient_display_name: 'Fixture Vet',
      recipient_type: 'VETERINARIAN', recipient_email: 'fixture@example.test',
      purpose: 'VETERINARY_CONSULTATION', scopes: sql.json(['VETERINARY_SUMMARY']),
      data_from: new Date('2026-09-01'), data_to: new Date('2026-09-10'),
      access_expires_at: new Date('2099-01-01'), ...patch,
    };
    return sql`INSERT INTO professional_share_grants ${sql(row)} RETURNING *`;
  }
  const rejectedBy = (constraint) => (error) => error.code === '23514' && error.constraint_name === constraint;

  await t.test('PENDING contact-only grants remain valid and do not activate', async () => {
    const [row] = await insert();
    assert.equal(row.status, 'PENDING');
    assert.equal(row.recipient_principal_id, null);
    assert.equal(row.activated_at, null);
    await assert.rejects(sql`UPDATE professional_share_grants SET status = 'ACTIVE', activated_at = now() WHERE id = ${row.id}`, rejectedBy('chk_prof_share_lifecycle'));
  });
  await t.test('ACTIVE requires both a principal and activation timestamp on insert and update', async () => {
    for (const patch of [
      { status: 'ACTIVE' },
      { status: 'ACTIVE', activated_at: new Date() },
      { status: 'ACTIVE', recipient_principal_id: 'fixture-principal' },
    ]) await assert.rejects(insert(patch), rejectedBy('chk_prof_share_lifecycle'));
    const [active] = await insert({ status: 'ACTIVE', activated_at: new Date(), recipient_principal_id: 'fixture-principal' });
    await assert.rejects(sql`UPDATE professional_share_grants SET recipient_principal_id = NULL WHERE id = ${active.id}`, rejectedBy('chk_prof_share_lifecycle'));
    await assert.rejects(sql`UPDATE professional_share_grants SET activated_at = NULL WHERE id = ${active.id}`, rejectedBy('chk_prof_share_lifecycle'));
  });
  await t.test('only arrays of 1..5 vocabulary members persist, including future-gated members', async () => {
    for (const scope of scopes) await insert({ scopes: sql.json([scope]) });
    await insert({ scopes: sql.json(scopes) });
    for (const invalid of [[], [...scopes, scopes[0]], ['INVENTED'], [scopes[0], 'INVENTED'], [null], [1], [true], [{}], [[scopes[0]]], {}, scopes[0]]) {
      await assert.rejects(insert({ scopes: sql.json(invalid) }), rejectedBy('chk_prof_share_scopes'), JSON.stringify(invalid));
    }
    await assert.rejects(insert({ scopes: null }), (error) => error.code === '23502');
    // A/A places duplicate rejection in the application, not in JSON containment.
    await insert({ scopes: sql.json([scopes[0], scopes[0]]) });
  });
  await t.test('canonical Owner and dog foreign keys are enforced', async () => {
    await assert.rejects(insert({ owner_user_id: randomUUID() }), (error) => error.code === '23503');
    await assert.rejects(insert({ dog_id: randomUUID() }), (error) => error.code === '23503');
  });
});