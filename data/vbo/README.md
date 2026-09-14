# VBO generated SQL authority

`breed_canonical_insert.legacy.sql` is the preserved pre-DATASET-01 snapshot. It is retained for audit/history only and must not be executed as current authority.

`breed_canonical_insert.sql` is intentionally a fail-closed regeneration guard when a current generated artifact is not checked in. Regenerate it from the canonical source file with:

```bash
npx tsx scripts/ingest_vbo.ts --skip-download
```

Current generated VBO upserts explicitly own their update timestamp with `updated_at = NOW()` on conflict. Migration `0014_dataset_writer_authority.sql` removes the historical permanent `updated_at` triggers/helper function and the redundant explicit `breed_slug` index after checking for unexpected user triggers.

This reconciliation concerns database/write authority only. It does not assert that the VBO snapshot is current, scientifically complete, or production-approved.
