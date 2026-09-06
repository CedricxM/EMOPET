# EMOPET dataset receipts

This directory stores controlled provenance/integrity receipts for external dataset payloads.

A receipt is **not** legal clearance, scientific validation, production validation, or permission to make product claims.

## Create a receipt

```bash
node scripts/data/register-dataset-file.mjs <datasetId> <local-file> [recordCount]
```

The script:

1. requires the dataset to exist in `data/registry/real-datasets.json`;
2. refuses vague version tags such as `current`, `latest` or `controlled-at-retrieval`;
3. computes SHA-256 of the exact local payload;
4. writes a versioned JSON receipt here;
5. binds the checksum and receipt path back into `real-datasets.json`;
6. leaves rights disposition at `HOLD` until reviewed.

## Minimum receipt meaning

A receipt proves only that EMOPET recorded a specific local file with:

- dataset identity;
- version;
- source URL;
- recorded licence label;
- attribution text;
- retrieval timestamp;
- filename;
- byte size;
- SHA-256;
- intended-use note.

## Rights review remains separate

Before any production/release use, the relevant controlled review must still establish:

- exact terms/licence applicable to the intended use;
- required attribution/notices;
- permitted transformations;
- redistribution/caching constraints where relevant;
- reviewer role and date;
- final `GO | HOLD | REMEDIATE` disposition.

Do not place secrets, personal data, private contracts or account credentials in this directory.

Parent control: `docs/control/EMOPET_THIRD_PARTY_DATA_RIGHTS_REGISTER_v0.1.md` / issue #116.
