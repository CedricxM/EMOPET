# EMOPET dataset receipts

This directory stores controlled provenance/integrity receipts for external dataset payloads.

A receipt is **not** legal clearance, scientific validation, production validation, or permission to make product claims.

A receipt is also **not reconstructed provenance**. It is evidence captured when a specific payload is deliberately landed and registered. Historical timestamps must never be invented, backdated, inferred from derivatives, or copied from unrelated metadata simply to make a receipt look complete.

## Create a receipt

```bash
node scripts/data/register-dataset-file.mjs <datasetId> <local-file> [recordCount]
```

The script:

1. requires the dataset to exist in `data/registry/real-datasets.json`;
2. refuses vague version tags such as `current`, `latest` or `controlled-at-retrieval`;
3. requires the landed payload to be inside the EMOPET working tree, normally under gitignored `data/external/`, so evidence never records an arbitrary machine path;
4. computes SHA-256 of the exact local payload;
5. writes a versioned JSON receipt here;
6. binds checksum, retrieval time, payload filename and controlled storage location back into `real-datasets.json`;
7. resets every product-use review field to an explicit `HOLD` state for the newly landed payload.

A new payload cannot inherit product-use authority from an older review merely because the dataset id or licence label is unchanged.

## Minimum receipt meaning

A receipt proves only that EMOPET recorded a specific local file with:

- dataset identity;
- version;
- source URL;
- recorded licence label;
- attribution text;
- retrieval timestamp;
- filename;
- controlled storage location;
- byte size;
- SHA-256;
- intended-use note.

The retrieval timestamp is the controlled landing/registration event represented by that receipt. If the actual historical retrieval event was not retained, do **not** create a replacement receipt that pretends otherwise.

## Release promotion remains a separate fail-closed decision

`scripts/data/dataset-rights-release-audit.mjs` treats every registry row as non-release-authorized unless the controlled registry explicitly carries a reviewed `GO` disposition with the required evidence categories.

A `GO` row must not rely on a source URL or licence label alone. The release predicate requires, at minimum:

- a controlled receipt + SHA-256 pair;
- an immutable version;
- the controlled retrieval timestamp, payload filename and storage location;
- an allowed-use summary;
- a transformations summary;
- an explicit commercial-use decision;
- an explicit derivative-works decision;
- reviewer role and non-future review timestamp;
- a repository evidence pointer for the rights review.

The current registry deliberately keeps unresolved rows at `HOLD`. Passing the audit means an incomplete row cannot silently promote itself to `GO`; it does **not** mean any dataset is legally cleared.

The audit also verifies a committed receipt, when present, is internally bound to the registry metadata and remains `RECEIPT_CAPTURED_NOT_RIGHTS_CLEARED`. The receipt itself is never the product-use authority.

## Reconstructed provenance is separate

When an older committed payload exists but its original controlled retrieval receipt was not retained, EMOPET may record independently verifiable provenance evidence separately from this directory.

Such evidence may establish facts such as:

- the SHA-256 of the committed payload;
- an immutable upstream commit or release identifier;
- an exact upstream Git blob match;
- a timestamp observed only in committed derivative metadata;
- repository-level licence/attribution evidence.

It must not silently promote those facts into proof of the original retrieval event, legal clearance, or product-use clearance.

Current example: `data/vbo/committed-snapshot-evidence.json` proves that the committed VBO payload is byte-identical to `vbo.json` at the recorded immutable upstream Git commit. Its historical retrieval receipt remains missing, so `data/registry/real-datasets.json` deliberately keeps `receiptPath: null` for VBO.

## External raw payloads

Some research datasets are intentionally landed outside Git, including the Mendeley movement/posture datasets under the local `data/external/...` workflow described in `docs/data/REAL_DATASET_INGESTION.md`.

For those datasets, the controlled sequence is:

1. resolve and record an exact immutable/versioned upstream source;
2. land the exact raw payload locally inside the controlled working tree;
3. run `register-dataset-file.mjs` immediately against that payload;
4. verify the generated SHA-256 and receipt metadata;
5. commit the receipt/registry evidence, not the raw research payload unless a separate policy explicitly permits it;
6. keep rights disposition on `HOLD` until the rights review is complete.

If the raw payload is absent, a checksum or receipt must not be guessed from dataset metadata alone.

## Rights review remains separate

Before any production/release use, the relevant controlled review must still establish:

- exact terms/licence applicable to the intended use;
- required attribution/notices;
- permitted transformations;
- commercial-use disposition;
- redistribution/caching constraints where relevant;
- reviewer role and date;
- controlled evidence pointer;
- final `GO | HOLD | REMEDIATE` disposition.

Do not place secrets, personal data, private contracts or account credentials in this directory.

Parent control: `docs/control/EMOPET_THIRD_PARTY_DATA_RIGHTS_REGISTER_v0.2.md` / issue #116.
