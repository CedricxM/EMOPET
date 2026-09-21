-- Founder decision AI-A / R4: durable ai_messages persistence is not authorised.
-- Preserve any pre-existing rows for separately governed residue/purge handling,
-- while blocking every new INSERT/UPDATE at the PostgreSQL boundary.
DO $$
DECLARE
  existing_expression text;
BEGIN
  SELECT pg_get_expr(c.conbin, c.conrelid, true)
    INTO existing_expression
  FROM pg_constraint c
  WHERE c.conrelid = 'ai_messages'::regclass
    AND c.conname = 'chk_ai_messages_no_durable_persistence'
    AND c.contype = 'c';

  IF existing_expression IS NULL THEN
    ALTER TABLE "ai_messages"
      ADD CONSTRAINT "chk_ai_messages_no_durable_persistence"
      CHECK (false) NOT VALID;
  ELSIF existing_expression <> 'false' THEN
    RAISE EXCEPTION
      'chk_ai_messages_no_durable_persistence exists with unexpected expression: %',
      existing_expression;
  END IF;

  -- Empty historical databases can reach the same validated state as fresh
  -- Drizzle baselines. Legacy rows remain untouched and separately governed.
  IF NOT EXISTS (SELECT 1 FROM "ai_messages" LIMIT 1) THEN
    ALTER TABLE "ai_messages"
      VALIDATE CONSTRAINT "chk_ai_messages_no_durable_persistence";
  END IF;
END
$$;
