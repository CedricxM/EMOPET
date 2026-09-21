-- Implement approved device-unbind semantics for dog erasure.
-- Retained device admin/support metadata may survive only without the dog identity link.
ALTER TABLE "devices" ALTER COLUMN "dog_id" DROP NOT NULL;

ALTER TABLE "devices"
  DROP CONSTRAINT IF EXISTS "devices_dog_id_dogs_id_fk";

ALTER TABLE "devices"
  ADD CONSTRAINT "devices_dog_id_dogs_id_fk"
  FOREIGN KEY ("dog_id") REFERENCES "public"."dogs"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;
