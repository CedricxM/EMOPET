CREATE TABLE IF NOT EXISTS "presence_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "dog_id" uuid NOT NULL,
  "ingestion_id" uuid NOT NULL,
  "source" varchar(24) NOT NULL,
  "state" varchar(16) NOT NULL,
  "event_at" timestamp with time zone NOT NULL,
  "received_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "presence_events_dog_id_dogs_id_fk"
    FOREIGN KEY ("dog_id") REFERENCES "public"."dogs"("id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "chk_presence_events_source"
    CHECK ("source" IN ('phone_passive', 'manual_override')),
  CONSTRAINT "chk_presence_events_state"
    CHECK ("state" IN ('present', 'absent'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_presence_events_ingestion_id"
  ON "presence_events" USING btree ("ingestion_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_presence_events_dog_event_at"
  ON "presence_events" USING btree ("dog_id", "event_at");
