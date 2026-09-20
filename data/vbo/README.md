# VBO generated SQL authority

`breed_canonical_insert.legacy.sql` preserves the pre-INT-03B checked-in SQL artifact for audit/history only. It is not current execution authority.

`breed_canonical_insert.sql` is intentionally a fail-closed regeneration guard when a current generated artifact is not checked in. Regenerate it with the repository-managed toolchain:

```bash
pnpm --dir backend exec tsx ../scripts/ingest_vbo.ts --skip-download
```

Generated VBO upserts explicitly own their update timestamp with `updated_at = NOW()` on conflict.

This slice proves writer/schema behavior only. It does **not**:
- activate historical migration `0014_dataset_writer_authority.sql`;
- claim historical-vs-fresh trigger reconciliation;
- prove the VBO snapshot is current or scientifically authoritative;
- clear product-use rights;
- replace the missing original upstream retrieval receipt.

The committed-snapshot evidence remains traceability-only and keeps product-use clearance false.
