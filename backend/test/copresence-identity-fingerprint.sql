\set ON_ERROR_STOP on

-- ID-01 / PRIV-01 semantic fingerprint for copresence dog identity.
-- Constraint names are intentionally ignored; identity target and delete action
-- are part of the contract.

SELECT 'COPRESENCE_COLUMN|'
       || c.column_name || '|'
       || c.data_type || '|'
       || c.udt_name || '|'
       || c.is_nullable
  FROM information_schema.columns c
 WHERE c.table_schema = 'public'
   AND c.table_name = 'copresence_events'
   AND c.column_name IN ('dog_a_id', 'dog_b_id')
 ORDER BY c.column_name;

SELECT 'COPRESENCE_FK|'
       || child_att.attname || '|'
       || parent.relname || '|'
       || parent_att.attname || '|'
       || con.confdeltype::text
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
   AND child.relname = 'copresence_events'
   AND child_att.attname IN ('dog_a_id', 'dog_b_id')
 ORDER BY child_att.attname;
