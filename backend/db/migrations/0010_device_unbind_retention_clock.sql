-- Track the start of the already-approved post-unbind device metadata window.
-- Also repair legacy historical databases where migration 0007 added the
-- canonical SET NULL FK without removing PostgreSQL's baseline-generated
-- devices_dog_id_fkey NO ACTION constraint.
-- Do not invent dates for devices that were already detached before this migration.

ALTER TABLE "devices"
  DROP CONSTRAINT IF EXISTS "devices_dog_id_fkey";
ALTER TABLE "devices"
  DROP CONSTRAINT IF EXISTS "devices_dog_id_dogs_id_fk";
ALTER TABLE "devices"
  ADD CONSTRAINT "devices_dog_id_dogs_id_fk"
  FOREIGN KEY ("dog_id") REFERENCES "public"."dogs"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;

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
