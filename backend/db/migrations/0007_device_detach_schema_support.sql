-- Schema support only for policy-determined device unbinding on dog erasure.
-- This does NOT approve or implement the post-unbind retention window.
-- It only allows device support/security metadata to survive without a dog FK.

ALTER TABLE "devices" ALTER COLUMN "dog_id" DROP NOT NULL;

ALTER TABLE "devices"
  DROP CONSTRAINT IF EXISTS "devices_dog_id_dogs_id_fk";

ALTER TABLE "devices"
  ADD CONSTRAINT "devices_dog_id_dogs_id_fk"
  FOREIGN KEY ("dog_id") REFERENCES "public"."dogs"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;
