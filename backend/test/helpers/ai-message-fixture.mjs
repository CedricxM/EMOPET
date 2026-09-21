export const AI_MESSAGE_WRITE_GUARD_CONSTRAINT = 'chk_ai_messages_no_durable_persistence';

export async function withAiMessageWriteGuardTemporarilyDropped(sql, writeFixture) {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('AI message guard bypass is test-only');
  }

  await sql.begin(async (tx) => {
    await tx`LOCK TABLE ai_messages IN ACCESS EXCLUSIVE MODE`;
    await tx`
      ALTER TABLE ai_messages
      DROP CONSTRAINT IF EXISTS chk_ai_messages_no_durable_persistence
    `;

    await writeFixture(tx);

    await tx`
      ALTER TABLE ai_messages
      ADD CONSTRAINT chk_ai_messages_no_durable_persistence
      CHECK (false) NOT VALID
    `;
  });
}

export async function validateAiMessageWriteGuard(sql) {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('AI message guard validation helper is test-only');
  }

  await sql`
    ALTER TABLE ai_messages
    VALIDATE CONSTRAINT chk_ai_messages_no_durable_persistence
  `;
}
