-- PRESENCE-DURABLE-01 / issue #135
-- Durable phone Presence storage foundation.
-- CONTROLLED FOUNDATION / NOT RUNTIME AUTHORITY:
-- Product V1 Presence routes remain fail-closed and lifecycle decisions remain open.

CREATE TABLE phone_presence_events (
  event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  dog_id uuid NOT NULL,
  idempotency_key varchar(128) NOT NULL,
  phone_seen boolean NOT NULL,
  observed_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  source varchar(24) NOT NULL,

  CONSTRAINT phone_presence_events_owner_id_users_id_fk
    FOREIGN KEY (owner_id) REFERENCES users(id),

  CONSTRAINT phone_presence_events_dog_id_dogs_id_fk
    FOREIGN KEY (dog_id) REFERENCES dogs(id),

  CONSTRAINT uq_phone_presence_events_owner_idempotency
    UNIQUE (owner_id, idempotency_key),

  CONSTRAINT chk_phone_presence_events_idempotency_format
    CHECK (
      char_length(idempotency_key) BETWEEN 8 AND 128
      AND idempotency_key ~ '^[A-Za-z0-9:_-]+$'
    ),

  CONSTRAINT chk_phone_presence_events_source
    CHECK (source IN ('phone_passive', 'manual_override'))
);

CREATE INDEX idx_phone_presence_events_dog_order
  ON phone_presence_events(dog_id, observed_at, received_at, event_id);

CREATE INDEX idx_phone_presence_events_owner_observed
  ON phone_presence_events(owner_id, observed_at);
