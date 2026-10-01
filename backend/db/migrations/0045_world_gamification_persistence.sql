-- WORLD-G2-PERSISTENCE-01 (#898)
-- Durable Owner-scoped World progression foundation.
--
-- CONTROLLED DRAFT / NOT PRODUCTION AUTHORITY.
-- This migration creates only the relational source of truth required for G2.
-- No HTTP route, client activation, erasure disposition, export projection or
-- retention policy is authorized by this migration.

CREATE TABLE world_progression_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  idempotency_key varchar(128) NOT NULL,
  event_kind varchar(64) NOT NULL,
  source_ref varchar(160) NOT NULL,
  grants_json jsonb NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fk_world_progression_events_owner
    FOREIGN KEY (owner_id) REFERENCES users(id),

  CONSTRAINT chk_world_progression_events_idempotency
    CHECK (idempotency_key ~ '^[A-Za-z0-9:_-]{8,128}$'),

  CONSTRAINT chk_world_progression_events_source_ref
    CHECK (source_ref ~ '^[A-Za-z0-9:._/-]{1,160}$'),

  CONSTRAINT chk_world_progression_events_kind
    CHECK (
      event_kind IN (
        'knowledge.card_read',
        'local.place_saved',
        'local.route_saved',
        'community.contribution_created',
        'world.group_joined',
        'memory.created'
      )
    ),

  CONSTRAINT chk_world_progression_events_grants_shape
    CHECK (
      jsonb_typeof(grants_json) = 'object'
      AND grants_json <> '{}'::jsonb
      AND (
        grants_json - ARRAY[
          'knowledgeFragments',
          'localDiscoveries',
          'walkTraces',
          'communitySeeds',
          'memoryThreads'
        ]::text[]
      ) = '{}'::jsonb
    )
);

CREATE UNIQUE INDEX uq_world_progression_events_owner_idempotency
  ON world_progression_events(owner_id, idempotency_key);

CREATE UNIQUE INDEX uq_world_progression_events_owner_source
  ON world_progression_events(owner_id, event_kind, source_ref);

CREATE INDEX idx_world_progression_events_owner_recorded
  ON world_progression_events(owner_id, recorded_at);


CREATE TABLE world_owned_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  item_id varchar(160) NOT NULL,
  region_code varchar(16) NOT NULL,
  built_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fk_world_owned_items_owner
    FOREIGN KEY (owner_id) REFERENCES users(id),

  CONSTRAINT chk_world_owned_items_item_id
    CHECK (item_id ~ '^[A-Za-z0-9][A-Za-z0-9:_-]{0,159}$'),

  CONSTRAINT chk_world_owned_items_region
    CHECK (
      region_code = 'GLOBAL'
      OR region_code ~ '^[A-Z]{2}-[A-Z0-9]{1,3}$'
    )
);

CREATE UNIQUE INDEX uq_world_owned_items_owner_item
  ON world_owned_items(owner_id, item_id);

CREATE INDEX idx_world_owned_items_owner_built
  ON world_owned_items(owner_id, built_at);


CREATE TABLE world_resource_spends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  idempotency_key varchar(128) NOT NULL,
  item_id varchar(160) NOT NULL,
  cost_json jsonb NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fk_world_resource_spends_owner
    FOREIGN KEY (owner_id) REFERENCES users(id),

  CONSTRAINT chk_world_resource_spends_idempotency
    CHECK (idempotency_key ~ '^[A-Za-z0-9:_-]{8,128}$'),

  CONSTRAINT chk_world_resource_spends_item_id
    CHECK (item_id ~ '^[A-Za-z0-9][A-Za-z0-9:_-]{0,159}$'),

  CONSTRAINT chk_world_resource_spends_cost_shape
    CHECK (
      jsonb_typeof(cost_json) = 'object'
      AND cost_json <> '{}'::jsonb
      AND (
        cost_json - ARRAY[
          'knowledgeFragments',
          'localDiscoveries',
          'walkTraces',
          'communitySeeds',
          'memoryThreads'
        ]::text[]
      ) = '{}'::jsonb
    )
);

CREATE UNIQUE INDEX uq_world_resource_spends_owner_idempotency
  ON world_resource_spends(owner_id, idempotency_key);

CREATE INDEX idx_world_resource_spends_owner_recorded
  ON world_resource_spends(owner_id, recorded_at);
