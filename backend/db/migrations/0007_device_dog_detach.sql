-- Implement the already-approved device unbind semantics for dog erasure.
-- This only makes the dog binding detachable. It does not promote the device
-- erasure disposition or implement the later 24-month metadata purge.

ALTER TABLE "devices" ALTER COLUMN "dog_id" DROP NOT NULL;
ALTER TABLE "devices"
  DROP CONSTRAINT IF EXISTS "devices_dog_id_dogs_id_fk";
ALTER TABLE "devices"
  ADD CONSTRAINT "devices_dog_id_dogs_id_fk"
  FOREIGN KEY ("dog_id") REFERENCES "public"."dogs"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;
