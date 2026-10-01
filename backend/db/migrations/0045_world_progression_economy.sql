-- G1B.2 / World durable progression economy.
-- Canonical SQL storage only: this migration does not activate HTTP/runtime
-- gamification writes or production persistence authority.
--
-- Owner FKs intentionally use PostgreSQL NO ACTION because account-erasure,
-- export and retention dispositions remain TO_CONFIRM in the privacy gate.

BEGIN;

CREATE TABLE IF NOT EXISTS world_progression_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL
    CONSTRAINT world_progression_events_owner_id_users_id_fk REFERENCES users(id),
  idempotency_key VARCHAR(128) NOT NULL,
  event_kind VARCHAR(100) NOT NULL,
  source_ref VARCHAR(160) NOT NULL,
  grants_json JSONB NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_world_progression_events_owner_idempotency
    UNIQUE (owner_id, idempotency_key),
  CONSTRAINT uq_world_progression_events_owner_source
    UNIQUE (owner_id, event_kind, source_ref),
  CONSTRAINT chk_world_progression_events_idempotency_key
    CHECK (idempotency_key ~ '^[A-Za-z0-9:_-]{8,128}$'),
  CONSTRAINT chk_world_progression_events_source_ref
    CHECK (source_ref ~ '^[A-Za-z0-9:._/-]{1,160}$'),
  CONSTRAINT chk_world_progression_events_reward_authority
    CHECK (
      (event_kind = 'knowledge.card_read'
        AND grants_json = '{"knowledgeFragments":1}'::jsonb)
      OR
      (event_kind = 'local.place_saved'
        AND grants_json = '{"localDiscoveries":2}'::jsonb)
      OR
      (event_kind = 'local.route_saved'
        AND grants_json = '{"walkTraces":2,"localDiscoveries":1}'::jsonb)
      OR
      (event_kind = 'community.contribution_created'
        AND grants_json = '{"communitySeeds":2}'::jsonb)
      OR
      (event_kind = 'world.group_joined'
        AND grants_json = '{"communitySeeds":1}'::jsonb)
      OR
      (event_kind = 'memory.created'
        AND grants_json = '{"memoryThreads":2}'::jsonb)
    )
);

CREATE INDEX IF NOT EXISTS idx_world_progression_events_owner_recorded
  ON world_progression_events(owner_id, recorded_at);

CREATE TABLE IF NOT EXISTS world_owned_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL
    CONSTRAINT world_owned_items_owner_id_users_id_fk REFERENCES users(id),
  item_id VARCHAR(160) NOT NULL,
  region_code VARCHAR(16) NOT NULL,
  built_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_world_owned_items_owner_item UNIQUE (owner_id, item_id),
  CONSTRAINT chk_world_owned_items_item_id
    CHECK (item_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$'),
  CONSTRAINT chk_world_owned_items_region_code
    CHECK (
      region_code = 'GLOBAL'
      OR region_code ~ '^[A-Z]{2}-[A-Z0-9]{1,3}$'
    )
);

CREATE INDEX IF NOT EXISTS idx_world_owned_items_owner_built
  ON world_owned_items(owner_id, built_at);

CREATE TABLE IF NOT EXISTS world_resource_spends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL
    CONSTRAINT world_resource_spends_owner_id_users_id_fk REFERENCES users(id),
  idempotency_key VARCHAR(128) NOT NULL,
  item_id VARCHAR(160) NOT NULL,
  cost_json JSONB NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_world_resource_spends_owner_idempotency
    UNIQUE (owner_id, idempotency_key),
  CONSTRAINT chk_world_resource_spends_idempotency_key
    CHECK (idempotency_key ~ '^[A-Za-z0-9:_-]{8,128}$'),
  CONSTRAINT chk_world_resource_spends_item_id
    CHECK (item_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$'),
  CONSTRAINT chk_world_resource_spends_cost_shape
    CHECK (
      jsonb_typeof(cost_json) = 'object'
      AND cost_json <> '{}'::jsonb
      AND cost_json
        - 'knowledgeFragments'
        - 'localDiscoveries'
        - 'walkTraces'
        - 'communitySeeds'
        - 'memoryThreads' = '{}'::jsonb
      AND (
        cost_json->>'knowledgeFragments' IS NULL
        OR cost_json->>'knowledgeFragments' ~ '^[1-9][0-9]{0,5}$'
      )
      AND (
        cost_json->>'localDiscoveries' IS NULL
        OR cost_json->>'localDiscoveries' ~ '^[1-9][0-9]{0,5}$'
      )
      AND (
        cost_json->>'walkTraces' IS NULL
        OR cost_json->>'walkTraces' ~ '^[1-9][0-9]{0,5}$'
      )
      AND (
        cost_json->>'communitySeeds' IS NULL
        OR cost_json->>'communitySeeds' ~ '^[1-9][0-9]{0,5}$'
      )
      AND (
        cost_json->>'memoryThreads' IS NULL
        OR cost_json->>'memoryThreads' ~ '^[1-9][0-9]{0,5}$'
      )
    )
);

CREATE INDEX IF NOT EXISTS idx_world_resource_spends_owner_recorded
  ON world_resource_spends(owner_id, recorded_at);

COMMIT;
