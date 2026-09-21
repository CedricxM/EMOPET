-- Track the start of the already-approved post-unbind device metadata window.
-- Do not invent dates for devices that were already detached before this migration.

ALTER TABLE "devices"
  ADD COLUMN IF NOT EXISTS "unbound_at" TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION emopet_set_device_unbound_at()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.dog_id IS NOT NULL AND NEW.dog_id IS NULL THEN
    NEW.unbound_at = NOW();
  ELSIF NEW.dog_id IS NOT NULL THEN
    NEW.unbound_at = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS devices_unbound_at_clock ON "devices";

CREATE TRIGGER devices_unbound_at_clock
  BEFORE UPDATE OF "dog_id" ON "devices"
  FOR EACH ROW
  EXECUTE FUNCTION emopet_set_device_unbound_at();
