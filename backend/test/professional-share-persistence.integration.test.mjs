import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import postgres from 'postgres';

const enabled = process.env.PROFESSIONAL_SHARE_DB_INTEGRATION === '1';
let sql = null;

if (enabled) {
  const { default: postgresModule } = await import('postgres');
  sql = postgresModule(process.env.DATABASE_URL, { max: 2 });
}

after(async () => {
  if (sql) await sql.end({ timeout: 5 });
});

async function expectRejected(statement, expectedCode = '23514') {
  await assert.rejects(
    async () => sql.begin(async (tx) => statement(tx)),
    (error) => {
      assert.equal(error.code, expectedCode);
      return true;
    },
  );
}

test('INT-05A durable professional-share persistence is fail-closed and privacy-visible', {
  skip: !enabled,
  timeout: 30_000,
}, async () => {
  const ownerId = randomUUID();
  const dogId = randomUUID();
  const grantId = randomUUID();
  const auditId = randomUUID();
  const missingGrantId = randomUUID();
  const missingDogId = randomUUID();
  const suffix = randomUUID();

  const directFks = await sql`
    SELECT
      child_att.attname AS column_name,
      parent.relname AS parent_table,
      CASE con.confdeltype
        WHEN 'a' THEN 'NO_ACTION'
        WHEN 'r' THEN 'RESTRICT'
        WHEN 'c' THEN 'CASCADE'
        WHEN 'n' THEN 'SET_NULL'
        WHEN 'd' THEN 'SET_DEFAULT'
        ELSE con.confdeltype::text
      END AS delete_action
    FROM pg_constraint con
    JOIN pg_class child ON child.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = child.relnamespace
    JOIN pg_class parent ON parent.oid = con.confrelid
    JOIN LATERAL unnest(con.conkey) WITH ORDINALITY child_key(attnum, ord) ON true
    JOIN LATERAL unnest(con.confkey) WITH ORDINALITY parent_key(attnum, ord)
      ON parent_key.ord = child_key.ord
    JOIN pg_attribute child_att
      ON child_att.attrelid = child.oid
     AND child_att.attnum = child_key.attnum
    WHERE con.contype = 'f'
      AND ns.nspname = 'public'
      AND child.relname = 'professional_share_grants'
    ORDER BY child_att.attname
  `;
  assert.deepEqual(
    directFks,
    [
      { column_name: 'dog_id', parent_table: 'dogs', delete_action: 'NO_ACTION' },
      { column_name: 'owner_user_id', parent_table: 'users', delete_action: 'NO_ACTION' },
    ],
  );

  const auditFks = await sql`
    SELECT count(*)::int AS count
    FROM pg_constraint con
    JOIN pg_class child ON child.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = child.relnamespace
    WHERE con.contype = 'f'
      AND ns.nspname = 'public'
      AND child.relname = 'professional_share_access_audits'
  `;
  assert.equal(auditFks[0].count, 0, 'denied/unknown access evidence must remain recordable without grant/dog FK');

  await sql`
    INSERT INTO users (id, email, password_hash, name)
    VALUES (${ownerId}, ${`share-owner-${suffix}@example.test`}, 'test-only', 'Share Owner')
  `;
  await sql`
    INSERT INTO dogs (id, owner_id, name, breed, birth_date, sex, weight, fur_class)
    VALUES (${dogId}, ${ownerId}, 'Nala', 'Test', '2022-04-12', 'female', 24.5, 'FC2')
  `;

  try {
    await sql`
      INSERT INTO professional_share_grants (
        id, owner_user_id, dog_id, recipient_display_name, recipient_type,
        recipient_email, purpose, scopes, data_from, data_to, access_expires_at
      ) VALUES (
        ${grantId}, ${ownerId}, ${dogId}, 'Dr Test', 'VETERINARIAN',
        'vet@example.test', 'VETERINARY_CONSULTATION',
        '["VETERINARY_SUMMARY"]'::jsonb,
        now() - interval '1 day', now(), now() + interval '1 day'
      )
    `;

    const [grant] = await sql`
      SELECT status, recipient_email, recipient_principal_id, activated_at, revoked_at
      FROM professional_share_grants
      WHERE id = ${grantId}
    `;
    assert.equal(grant.status, 'PENDING');
    assert.equal(grant.recipient_email, 'vet@example.test');
    assert.equal(grant.recipient_principal_id, null);
    assert.equal(grant.activated_at, null);
    assert.equal(grant.revoked_at, null);

    await expectRejected((tx) => tx`
      INSERT INTO professional_share_grants (
        owner_user_id, dog_id, recipient_display_name, recipient_type,
        purpose, scopes, data_from, data_to, access_expires_at
      ) VALUES (
        ${ownerId}, ${dogId}, 'No binding', 'VETERINARIAN',
        'VETERINARY_CONSULTATION', '["VETERINARY_SUMMARY"]'::jsonb,
        now() - interval '1 day', now(), now() + interval '1 day'
      )
    `);

    await expectRejected((tx) => tx`
      INSERT INTO professional_share_grants (
        owner_user_id, dog_id, recipient_display_name, recipient_type,
        recipient_email, purpose, scopes, data_from, data_to, access_expires_at
      ) VALUES (
        ${ownerId}, ${dogId}, 'Bad type', 'UNBOUNDED_ROLE',
        'bad@example.test', 'VETERINARY_CONSULTATION', '["VETERINARY_SUMMARY"]'::jsonb,
        now() - interval '1 day', now(), now() + interval '1 day'
      )
    `);

    await expectRejected((tx) => tx`
      INSERT INTO professional_share_grants (
        owner_user_id, dog_id, recipient_display_name, recipient_type,
        recipient_email, purpose, scopes, data_from, data_to, access_expires_at
      ) VALUES (
        ${ownerId}, ${dogId}, 'Bad scope', 'VETERINARIAN',
        'bad-scope@example.test', 'VETERINARY_CONSULTATION', '[]'::jsonb,
        now() - interval '1 day', now(), now() + interval '1 day'
      )
    `);

    await expectRejected((tx) => tx`
      INSERT INTO professional_share_grants (
        owner_user_id, dog_id, recipient_display_name, recipient_type,
        recipient_email, purpose, scopes, data_from, data_to, access_expires_at
      ) VALUES (
        ${ownerId}, ${dogId}, 'Bad window', 'VETERINARIAN',
        'bad-window@example.test', 'VETERINARY_CONSULTATION', '["VETERINARY_SUMMARY"]'::jsonb,
        now(), now() - interval '1 day', now() + interval '1 day'
      )
    `);

    await expectRejected((tx) => tx`
      INSERT INTO professional_share_grants (
        owner_user_id, dog_id, recipient_display_name, recipient_type,
        recipient_email, purpose, scopes, data_from, data_to,
        created_at, access_expires_at
      ) VALUES (
        ${ownerId}, ${dogId}, 'Bad expiry', 'VETERINARIAN',
        'bad-expiry@example.test', 'VETERINARY_CONSULTATION', '["VETERINARY_SUMMARY"]'::jsonb,
        now() - interval '1 day', now(),
        now(), now() - interval '1 minute'
      )
    `);

    await expectRejected((tx) => tx`
      INSERT INTO professional_share_grants (
        owner_user_id, dog_id, recipient_display_name, recipient_type,
        recipient_email, purpose, scopes, data_from, data_to,
        access_expires_at, status
      ) VALUES (
        ${ownerId}, ${dogId}, 'Bad active lifecycle', 'VETERINARIAN',
        'bad-active@example.test', 'VETERINARY_CONSULTATION', '["VETERINARY_SUMMARY"]'::jsonb,
        now() - interval '1 day', now(), now() + interval '1 day', 'ACTIVE'
      )
    `);

    await sql`
      INSERT INTO professional_share_access_audits (
        id, grant_id, dog_id, event, decision_status, reason
      ) VALUES (
        ${auditId}, ${missingGrantId}, ${missingDogId},
        'PROFESSIONAL_SHARE_POLICY_DECISION', 'DENIED', 'GRANT_NOT_FOUND'
      )
    `;
    const [audit] = await sql`
      SELECT grant_id, dog_id, decision_status, reason
      FROM professional_share_access_audits
      WHERE id = ${auditId}
    `;
    assert.equal(audit.grant_id, missingGrantId);
    assert.equal(audit.dog_id, missingDogId);
    assert.equal(audit.decision_status, 'DENIED');
    assert.equal(audit.reason, 'GRANT_NOT_FOUND');

    await assert.rejects(
      () => sql`DELETE FROM dogs WHERE id = ${dogId}`,
      (error) => error.code === '23503',
      'NO ACTION grant FK must block silent dog deletion',
    );
    await assert.rejects(
      () => sql`DELETE FROM users WHERE id = ${ownerId}`,
      (error) => error.code === '23503',
      'NO ACTION grant FK must block silent Owner deletion',
    );
  } finally {
    await sql`DELETE FROM professional_share_access_audits WHERE id = ${auditId}`;
    await sql`DELETE FROM professional_share_grants WHERE id = ${grantId}`;
    await sql`DELETE FROM dogs WHERE id = ${dogId}`;
    await sql`DELETE FROM users WHERE id = ${ownerId}`;
  }
});
