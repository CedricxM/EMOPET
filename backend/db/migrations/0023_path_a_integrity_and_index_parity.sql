-- P0-DB path-A parity, classes S1 (copresence), S4, S5 and S6
-- (MIGRATION_BASELINE_RECONCILIATION.md §7.5).
-- Authority: the Drizzle source schema (§8).
--
-- 1. 3f51896 (INT-06F, canonical copresence dog identity) bound
--    copresence_events.dog_a_id/dog_b_id to dogs(id) in the Drizzle schema, the
--    privacy topology and CI, but added no path-A migration: path A accepted
--    copresence events for dogs that do not exist. Fails closed on such rows.
-- 2. idx_breed_canonical_slug duplicated the unique constraint on breed_slug, and
--    no query uses idx_breed_canonical_fci. Both come from 0001 and are absent
--    from the Drizzle schema.
-- 3. idx_anticipation_events_dog_time and idx_recovery_events_dog_time: 0003
--    declared the time key DESC, the Drizzle schema ascending. A B-tree serves
--    both scan directions; only the definition is aligned.
-- 4. imu_discrimination_thresholds and weather_context enforced uniqueness with
--    an inline UNIQUE constraint; the Drizzle schema declares the unique indexes
--    uq_discrimination and uq_weather_location_date. Each index is created before
--    the constraint is dropped, so uniqueness holds throughout.
--
-- Re-running this file, or running it on the Drizzle-generated baseline, leaves
-- the same end state.
-- Gate: backend/test/schema-constraint-index-parity.sql (P0 workflow).

BEGIN;

ALTER TABLE "copresence_events"
  DROP CONSTRAINT IF EXISTS "copresence_events_dog_a_id_dogs_id_fk";
ALTER TABLE "copresence_events"
  ADD CONSTRAINT "copresence_events_dog_a_id_dogs_id_fk"
  FOREIGN KEY ("dog_a_id") REFERENCES "public"."dogs"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "copresence_events"
  DROP CONSTRAINT IF EXISTS "copresence_events_dog_b_id_dogs_id_fk";
ALTER TABLE "copresence_events"
  ADD CONSTRAINT "copresence_events_dog_b_id_dogs_id_fk"
  FOREIGN KEY ("dog_b_id") REFERENCES "public"."dogs"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

DROP INDEX IF EXISTS "idx_breed_canonical_fci";
DROP INDEX IF EXISTS "idx_breed_canonical_slug";

DROP INDEX IF EXISTS "idx_anticipation_events_dog_time";
CREATE INDEX "idx_anticipation_events_dog_time"
  ON "anticipation_events" ("dog_id", "predicted_event_time");
DROP INDEX IF EXISTS "idx_recovery_events_dog_time";
CREATE INDEX "idx_recovery_events_dog_time"
  ON "recovery_events" ("dog_id", "returned_to_baseline_at");

CREATE UNIQUE INDEX IF NOT EXISTS "uq_discrimination"
  ON "imu_discrimination_thresholds" ("activity_a", "activity_b", "feature_name", "placement");
ALTER TABLE "imu_discrimination_thresholds"
  DROP CONSTRAINT IF EXISTS "imu_discrimination_thresholds_activity_a_activity_b_feature_key";
CREATE UNIQUE INDEX IF NOT EXISTS "uq_weather_location_date"
  ON "weather_context" ("location_key", "date");
ALTER TABLE "weather_context"
  DROP CONSTRAINT IF EXISTS "weather_context_location_key_date_key";

COMMIT;
