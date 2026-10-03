CREATE TABLE IF NOT EXISTS "phone_presence_events" (
  "event_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" uuid NOT NULL,
  "dog_id" uuid NOT NULL,
  "idempotency_key" varchar(128) NOT NULL,
  "phone_seen" boolean NOT NULL,
  "observed_at" timestamp with time zone NOT NULL,
  "received_at" timestamp with time zone DEFAULT now() NOT NULL,
  "source" varchar(24) NOT NULL,
  CONSTRAINT "phone_presence_events_owner_id_users_id_fk"
    FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "phone_presence_events_dog_id_dogs_id_fk"
    FOREIGN KEY ("dog_id") REFERENCES "public"."dogs"("id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "chk_phone_presence_events_idempotency_length"
    CHECK (char_length("idempotency_key") BETWEEN 8 AND 128),
  CONSTRAINT "chk_phone_presence_events_source"
    CHECK ("source" IN ('phone_passive', 'manual_override'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_phone_presence_events_owner_idempotency"
  ON "phone_presence_events" USING btree ("owner_id", "idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_phone_presence_events_dog_observed"
  ON "phone_presence_events" USING btree ("dog_id", "observed_at", "received_at", "event_id");
