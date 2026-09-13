\set ON_ERROR_STOP on

-- Stable semantic fingerprint for cross-domain identity/provenance and ELI
-- surfaces where historical SQL and the active Drizzle schema must converge.
-- Intentionally compares meaning rather than migration creation order or
-- pg_dump formatting.

WITH critical_columns(table_name, column_name) AS (
  VALUES
    ('users', 'id'),
    ('dogs', 'id'),
    ('dogs', 'owner_id'),
    ('devices', 'id'),
    ('devices', 'dog_id'),
    ('devices', 'type'),
    ('devices', 'firmware_version'),
    ('devices', 'firmware_major'),
    ('devices', 'firmware_minor'),
    ('devices', 'firmware_patch'),
    ('devices', 'supports_v6_features'),
    ('sensor_summaries', 'dog_id'),
    ('sensor_summaries', 'ingestion_id'),
    ('sensor_summaries', 'device_id'),
    ('sensor_summaries', 'firmware_version_at_ingest'),
    ('dog_sub_baselines', 'dog_id'),
    ('recovery_events', 'dog_id'),
    ('anticipation_events', 'dog_id'),
    ('baseline_drift_monitor', 'dog_id'),
    ('walk_quality', 'dog_id'),
    ('routine_stability', 'dog_id'),
    ('user_config', 'user_id'),
    ('user_config', 'dog_id')
)
SELECT 'COLUMN|'
       || c.table_name || '|'
       || c.column_name || '|'
       || c.data_type || '|'
       || c.udt_name || '|'
       || COALESCE(c.character_maximum_length::text, '-') || '|'
       || c.is_nullable
  FROM information_schema.columns c
  JOIN critical_columns wanted
    ON wanted.table_name = c.table_name
   AND wanted.column_name = c.column_name
 WHERE c.table_schema = 'public'
 ORDER BY c.table_name, c.ordinal_position;

WITH critical_fk_columns(table_name, column_name) AS (
  VALUES
    ('dogs', 'owner_id'),
    ('devices', 'dog_id'),
    ('sensor_summaries', 'dog_id'),
    ('sensor_summaries', 'device_id'),
    ('dog_sub_baselines', 'dog_id'),
    ('recovery_events', 'dog_id'),
    ('anticipation_events', 'dog_id'),
    ('baseline_drift_monitor', 'dog_id'),
    ('walk_quality', 'dog_id'),
    ('routine_stability', 'dog_id'),
    ('user_config', 'user_id'),
    ('user_config', 'dog_id')
)
SELECT 'FK|'
       || child.relname || '|'
       || child_att.attname || '|'
       || parent.relname || '|'
       || parent_att.attname
  FROM pg_constraint con
  JOIN pg_class child ON child.oid = con.conrelid
  JOIN pg_namespace child_ns ON child_ns.oid = child.relnamespace
  JOIN pg_class parent ON parent.oid = con.confrelid
  JOIN LATERAL unnest(con.conkey) WITH ORDINALITY child_key(attnum, ord) ON true
  JOIN LATERAL unnest(con.confkey) WITH ORDINALITY parent_key(attnum, ord)
    ON parent_key.ord = child_key.ord
  JOIN pg_attribute child_att
    ON child_att.attrelid = child.oid
   AND child_att.attnum = child_key.attnum
  JOIN pg_attribute parent_att
    ON parent_att.attrelid = parent.oid
   AND parent_att.attnum = parent_key.attnum
  JOIN critical_fk_columns wanted
    ON wanted.table_name = child.relname
   AND wanted.column_name = child_att.attname
 WHERE con.contype = 'f'
   AND child_ns.nspname = 'public'
 ORDER BY child.relname, child_att.attname, parent.relname, parent_att.attname;

SELECT 'PK|'
       || rel.relname || '|'
       || string_agg(att.attname, ',' ORDER BY key_col.ord)
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace ns ON ns.oid = rel.relnamespace
  JOIN LATERAL unnest(con.conkey) WITH ORDINALITY key_col(attnum, ord) ON true
  JOIN pg_attribute att
    ON att.attrelid = rel.oid
   AND att.attnum = key_col.attnum
 WHERE con.contype = 'p'
   AND ns.nspname = 'public'
   AND rel.relname IN (
     'users',
     'dogs',
     'devices',
     'sensor_summaries',
     'dog_sub_baselines',
     'baseline_drift_monitor',
     'routine_stability',
     'user_config'
   )
 GROUP BY rel.relname
 ORDER BY rel.relname;

SELECT 'INDEX|'
       || table_rel.relname || '|'
       || index_rel.relname || '|'
       || idx.indisunique::text || '|'
       || string_agg(att.attname, ',' ORDER BY key_col.ord)
  FROM pg_index idx
  JOIN pg_class table_rel ON table_rel.oid = idx.indrelid
  JOIN pg_namespace ns ON ns.oid = table_rel.relnamespace
  JOIN pg_class index_rel ON index_rel.oid = idx.indexrelid
  JOIN LATERAL unnest(idx.indkey) WITH ORDINALITY key_col(attnum, ord) ON key_col.ord <= idx.indnkeyatts
  JOIN pg_attribute att
    ON att.attrelid = table_rel.oid
   AND att.attnum = key_col.attnum
 WHERE ns.nspname = 'public'
   AND index_rel.relname IN (
     'uq_sensor_summaries_ingestion_id',
     'idx_sensor_summaries_device_timestamp'
   )
 GROUP BY table_rel.relname, index_rel.relname, idx.indisunique
 ORDER BY table_rel.relname, index_rel.relname;

-- Full ELI column semantics. This catches precision/default/nullability drift,
-- including PostgreSQL FLOAT (double precision) vs REAL (float4). Physical
-- column position is deliberately ignored: ALTER TABLE appends columns while a
-- fresh Drizzle baseline emits declaration order, but callers address columns
-- by name and the order does not change the data contract.
WITH eli_tables(table_name) AS (
  VALUES
    ('dog_sub_baselines'),
    ('recovery_events'),
    ('anticipation_events'),
    ('baseline_drift_monitor'),
    ('walk_quality'),
    ('routine_stability'),
    ('user_config')
)
SELECT 'ELI_COLUMN|'
       || c.table_name || '|'
       || c.column_name || '|'
       || c.data_type || '|'
       || c.udt_name || '|'
       || COALESCE(c.character_maximum_length::text, '-') || '|'
       || c.is_nullable || '|'
       || COALESCE(c.column_default, '-')
  FROM information_schema.columns c
  JOIN eli_tables wanted ON wanted.table_name = c.table_name
 WHERE c.table_schema = 'public'
 ORDER BY c.table_name, c.column_name;

-- Compare CHECK meaning without depending on constraint names, which differ
-- between column-level historical SQL and explicitly named Drizzle checks.
SELECT 'ELI_CHECK|'
       || rel.relname || '|'
       || regexp_replace(pg_get_constraintdef(con.oid, true), '\s+', ' ', 'g')
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace ns ON ns.oid = rel.relnamespace
 WHERE con.contype = 'c'
   AND ns.nspname = 'public'
   AND rel.relname IN (
     'dog_sub_baselines',
     'recovery_events',
     'anticipation_events',
     'routine_stability',
     'user_config'
   )
 ORDER BY rel.relname, pg_get_constraintdef(con.oid, true);

-- Include all ELI primary-key shapes, including serial event tables.
SELECT 'ELI_PK|'
       || rel.relname || '|'
       || string_agg(att.attname, ',' ORDER BY key_col.ord)
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace ns ON ns.oid = rel.relnamespace
  JOIN LATERAL unnest(con.conkey) WITH ORDINALITY key_col(attnum, ord) ON true
  JOIN pg_attribute att
    ON att.attrelid = rel.oid
   AND att.attnum = key_col.attnum
 WHERE con.contype = 'p'
   AND ns.nspname = 'public'
   AND rel.relname IN (
     'dog_sub_baselines',
     'recovery_events',
     'anticipation_events',
     'baseline_drift_monitor',
     'walk_quality',
     'routine_stability',
     'user_config'
   )
 GROUP BY rel.relname
 ORDER BY rel.relname;

-- pg_get_indexdef exposes sort direction as well as indexed columns. Drizzle
-- renders DESC on these NOT NULL timestamp keys as explicit "DESC NULLS LAST"
-- while the historical shorthand omits a NULL-order token. Because NULL is
-- impossible for both keys, normalize only that unreachable syntax. DESC itself
-- remains in the fingerprint and is still enforced.
SELECT 'ELI_INDEX|'
       || table_rel.relname || '|'
       || index_rel.relname || '|'
       || replace(pg_get_indexdef(idx.indexrelid), ' NULLS LAST', '')
  FROM pg_index idx
  JOIN pg_class table_rel ON table_rel.oid = idx.indrelid
  JOIN pg_namespace ns ON ns.oid = table_rel.relnamespace
  JOIN pg_class index_rel ON index_rel.oid = idx.indexrelid
 WHERE ns.nspname = 'public'
   AND index_rel.relname IN (
     'idx_recovery_events_dog_time',
     'idx_anticipation_events_dog_time',
     'idx_walk_quality_dog_date'
   )
 ORDER BY table_rel.relname, index_rel.relname;

-- Dataset authority semantics from migration 0001. This intentionally compares
-- storage precision, defaults, keys and the useful FCI lookup index. The legacy
-- updated_at triggers and the redundant explicit breed_slug index are tracked as
-- separate reconciliation debt rather than silently promoted into fresh Drizzle.
WITH dataset_tables(table_name) AS (
  VALUES
    ('dataset_registry'),
    ('dataset_versions'),
    ('breed_canonical'),
    ('imu_activity_profiles'),
    ('imu_discrimination_thresholds'),
    ('imu_shake_filter')
)
SELECT 'DATASET_COLUMN|'
       || c.table_name || '|'
       || c.column_name || '|'
       || c.data_type || '|'
       || c.udt_name || '|'
       || c.is_nullable || '|'
       || COALESCE(c.column_default, '-')
  FROM information_schema.columns c
  JOIN dataset_tables wanted ON wanted.table_name = c.table_name
 WHERE c.table_schema = 'public'
 ORDER BY c.table_name, c.column_name;

SELECT 'DATASET_FK|'
       || child.relname || '|'
       || child_att.attname || '|'
       || parent.relname || '|'
       || parent_att.attname || '|'
       || con.confdeltype
  FROM pg_constraint con
  JOIN pg_class child ON child.oid = con.conrelid
  JOIN pg_namespace child_ns ON child_ns.oid = child.relnamespace
  JOIN pg_class parent ON parent.oid = con.confrelid
  JOIN LATERAL unnest(con.conkey) WITH ORDINALITY child_key(attnum, ord) ON true
  JOIN LATERAL unnest(con.confkey) WITH ORDINALITY parent_key(attnum, ord)
    ON parent_key.ord = child_key.ord
  JOIN pg_attribute child_att
    ON child_att.attrelid = child.oid
   AND child_att.attnum = child_key.attnum
  JOIN pg_attribute parent_att
    ON parent_att.attrelid = parent.oid
   AND parent_att.attnum = parent_key.attnum
 WHERE con.contype = 'f'
   AND child_ns.nspname = 'public'
   AND child.relname IN (
     'dataset_versions',
     'imu_activity_profiles',
     'imu_discrimination_thresholds',
     'imu_shake_filter'
   )
 ORDER BY child.relname, child_att.attname;

SELECT 'DATASET_PK|'
       || rel.relname || '|'
       || string_agg(att.attname, ',' ORDER BY key_col.ord)
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace ns ON ns.oid = rel.relnamespace
  JOIN LATERAL unnest(con.conkey) WITH ORDINALITY key_col(attnum, ord) ON true
  JOIN pg_attribute att
    ON att.attrelid = rel.oid
   AND att.attnum = key_col.attnum
 WHERE con.contype = 'p'
   AND ns.nspname = 'public'
   AND rel.relname IN (
     'dataset_registry',
     'dataset_versions',
     'breed_canonical',
     'imu_activity_profiles',
     'imu_discrimination_thresholds',
     'imu_shake_filter'
   )
 GROUP BY rel.relname
 ORDER BY rel.relname;

SELECT 'DATASET_UNIQUE|'
       || rel.relname || '|'
       || string_agg(att.attname, ',' ORDER BY key_col.ord)
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace ns ON ns.oid = rel.relnamespace
  JOIN LATERAL unnest(con.conkey) WITH ORDINALITY key_col(attnum, ord) ON true
  JOIN pg_attribute att
    ON att.attrelid = rel.oid
   AND att.attnum = key_col.attnum
 WHERE con.contype = 'u'
   AND ns.nspname = 'public'
   AND rel.relname IN (
     'breed_canonical',
     'imu_discrimination_thresholds',
     'imu_shake_filter'
   )
 GROUP BY rel.relname, con.oid
 ORDER BY rel.relname, string_agg(att.attname, ',' ORDER BY key_col.ord);

SELECT 'DATASET_INDEX|'
       || table_rel.relname || '|'
       || index_rel.relname || '|'
       || pg_get_indexdef(idx.indexrelid)
  FROM pg_index idx
  JOIN pg_class table_rel ON table_rel.oid = idx.indrelid
  JOIN pg_namespace ns ON ns.oid = table_rel.relnamespace
  JOIN pg_class index_rel ON index_rel.oid = idx.indexrelid
 WHERE ns.nspname = 'public'
   AND index_rel.relname = 'idx_breed_canonical_fci'
 ORDER BY table_rel.relname, index_rel.relname;
