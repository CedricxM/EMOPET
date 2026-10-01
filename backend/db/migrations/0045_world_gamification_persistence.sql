-- WORLD-G2-01 / issue #898
-- Durable World gamification persistence foundation.
-- CONTROLLED DRAFT / NOT PRODUCTION AUTHORITY:
-- no route is activated by this migration and lifecycle dispositions remain TO_CONFIRM.

CREATE TABLE world_progression_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id),
  idempotency_key varchar(128) NOT NULL,
  event_kind varchar(100) NOT NULL,
  source_ref varchar(160) NOT NULL,
  grants_json jsonb NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_world_progression_events_owner_idempotency
    UNIQUE (owner_id, idempotency_key),

  CONSTRAINT uq_world_progression_events_owner_kind_source
    UNIQUE (owner_id, event_kind, source_ref),

  CONSTRAINT chk_world_progression_events_idempotency_nonempty
    CHECK (length(idempotency_key) >= 8),

  CONSTRAINT chk_world_progression_events_source_nonempty
    CHECK (length(source_ref) >= 1),

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

  CONSTRAINT chk_world_progression_events_grants_object
    CHECK (
      jsonb_typeof(grants_json) = 'object'
      AND grants_json <> '{}'::jsonb
    ),

  CONSTRAINT chk_world_progression_events_grants_exact
    CHECK (
      (event_kind = 'knowledge.card_read'
        AND grants_json = '{"knowledgeFragments": 1}'::jsonb)
      OR (event_kind = 'local.place_saved'
        AND grants_json = '{"localDiscoveries": 2}'::jsonb)
      OR (event_kind = 'local.route_saved'
        AND grants_json = '{"walkTraces": 2, "localDiscoveries": 1}'::jsonb)
      OR (event_kind = 'community.contribution_created'
        AND grants_json = '{"communitySeeds": 2}'::jsonb)
      OR (event_kind = 'world.group_joined'
        AND grants_json = '{"communitySeeds": 1}'::jsonb)
      OR (event_kind = 'memory.created'
        AND grants_json = '{"memoryThreads": 2}'::jsonb)
    )
);

CREATE INDEX idx_world_progression_events_owner_recorded
  ON world_progression_events(owner_id, recorded_at);

CREATE TABLE world_owned_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id),
  item_id varchar(160) NOT NULL,
  region_code varchar(16) NOT NULL,
  built_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_world_owned_items_owner_item
    UNIQUE (owner_id, item_id),

  CONSTRAINT chk_world_owned_items_item_nonempty
    CHECK (length(item_id) >= 1),

  CONSTRAINT chk_world_owned_items_region_code
    CHECK (
      region_code = 'GLOBAL'
      OR region_code ~ '^[A-Z]{2}-[A-Z0-9]{1,3}$'
    )
);

CREATE INDEX idx_world_owned_items_owner_built
  ON world_owned_items(owner_id, built_at);

CREATE TABLE world_resource_spends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id),
  idempotency_key varchar(128) NOT NULL,
  item_id varchar(160) NOT NULL,
  cost_json jsonb NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_world_resource_spends_owner_idempotency
    UNIQUE (owner_id, idempotency_key),

  CONSTRAINT chk_world_resource_spends_idempotency_nonempty
    CHECK (length(idempotency_key) >= 8),

  CONSTRAINT chk_world_resource_spends_item_nonempty
    CHECK (length(item_id) >= 1),

  CONSTRAINT chk_world_resource_spends_cost_object
    CHECK (
      jsonb_typeof(cost_json) = 'object'
      AND cost_json <> '{}'::jsonb
    ),

  CONSTRAINT chk_world_resource_spends_cost_keys
    CHECK (
      cost_json - ARRAY[
        'knowledgeFragments',
        'localDiscoveries',
        'walkTraces',
        'communitySeeds',
        'memoryThreads'
      ] = '{}'::jsonb
    ),

  CONSTRAINT chk_world_resource_spends_cost_positive_integers
    CHECK (
      (NOT (cost_json ? 'knowledgeFragments')
        OR (
          jsonb_typeof(cost_json -> 'knowledgeFragments') = 'number'
          AND (cost_json ->> 'knowledgeFragments') ~ '^[1-9][0-9]*$'
        ))
      AND (NOT (cost_json ? 'localDiscoveries')
        OR (
          jsonb_typeof(cost_json -> 'localDiscoveries') = 'number'
          AND (cost_json ->> 'localDiscoveries') ~ '^[1-9][0-9]*$'
        ))
      AND (NOT (cost_json ? 'walkTraces')
        OR (
          jsonb_typeof(cost_json -> 'walkTraces') = 'number'
          AND (cost_json ->> 'walkTraces') ~ '^[1-9][0-9]*$'
        ))
      AND (NOT (cost_json ? 'communitySeeds')
        OR (
          jsonb_typeof(cost_json -> 'communitySeeds') = 'number'
          AND (cost_json ->> 'communitySeeds') ~ '^[1-9][0-9]*$'
        ))
      AND (NOT (cost_json ? 'memoryThreads')
        OR (
          jsonb_typeof(cost_json -> 'memoryThreads') = 'number'
          AND (cost_json ->> 'memoryThreads') ~ '^[1-9][0-9]*$'
        ))
    )
);

CREATE INDEX idx_world_resource_spends_owner_recorded
  ON world_resource_spends(owner_id, recorded_at);
