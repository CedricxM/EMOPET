# EMOPET Real Dataset Ingestion

Status: `P0 REGISTRY IMPLEMENTED / PAYLOAD INGESTION REQUIRES RECEIPTS`

## Registered sources

The P0 real-data registry contains:

- Mendeley Movement Sensor Dataset for Dog Behavior Classification, V4, CC BY 4.0;
- Mendeley Dog Posture Recognition dataset, V1, CC BY 4.0;
- Vertebrate Breed Ontology (VBO), CC BY 4.0;
- ANMV/Anses French veterinary medicines public database, CC Attribution.

## Why payloads are not committed

The research datasets are large and must not be copied into Git history. They are materialised outside Git under `data/external/` or an equivalent controlled storage location.

Git stores only:

- source registry metadata;
- immutable dataset/version identifiers;
- licence/attribution;
- ingestion code;
- checksum/provenance receipts;
- separately labelled reconstructed provenance evidence where a historical receipt is unavailable;
- derived outputs that are lawful, small and scientifically justified.

## Controlled landing sequence

For a new or refreshed external payload, use this order:

1. resolve an exact immutable/versioned upstream source;
2. obtain the exact source payload into controlled local storage;
3. register the payload **before** transformation or ingestion;
4. verify the generated SHA-256, byte size, source/version and receipt metadata;
5. commit the receipt and registry update;
6. run the relevant ingestion/normalisation pipeline;
7. retain rights disposition at `HOLD` until the separate rights review is complete.

Do not derive a checksum from metadata, a transformed file, a sample, or a later replacement payload.

## Reproducible receipt

Immediately after obtaining the exact source file from the registered source, run:

```bash
node scripts/data/register-dataset-file.mjs <datasetId> <file> [recordCount]
```

The script computes SHA-256 and writes a provenance receipt under `data/registry/receipts/`.

A receipt proves file identity and the controlled landing event represented by that receipt only. It does not promote the dataset to production evidence or rights clearance.

If an older payload exists but its original retrieval receipt was not retained, do not backfill a fake retrieval timestamp. Record independently verifiable reconstructed provenance separately and keep `receiptPath: null` until a genuine controlled landing receipt exists. See `data/registry/receipts/README.md`.

## Current receipt status

- **VBO:** the committed payload is bound byte-for-byte to an immutable upstream Git commit and has a recorded SHA-256 in `data/vbo/committed-snapshot-evidence.json`; the historical retrieval receipt is still missing.
- **Mendeley movement V4:** raw payload is expected outside Git; receipt/checksum remain open until the exact V4 payload is landed and registered.
- **Mendeley posture V1:** raw payload is expected outside Git; receipt/checksum remain open until the exact V1 payload is landed and registered.
- **ANMV/Anses:** receipt remains open and the exact immutable/versioned resource must be resolved at controlled landing before checksum capture.

These open receipt states are evidence gaps, not permission to substitute a current upstream payload for the originally observed one.

## Scientific gate

Before a dataset can affect EMOPET algorithms:

1. verify licence and attribution;
2. verify version and checksum;
3. document sensor placement, sampling rate, dog cohort and labels;
4. document differences from EMOPET MAT/TAG hardware;
5. separate training/exploration from independent validation;
6. prevent subject leakage across train/test splits;
7. report class balance and confidence intervals where applicable;
8. validate on EMOPET-collected data before any product claim.

Research posture/activity labels are not evidence of an individual dog's emotion or diagnosis.

## Code-licence boundary

Dataset licences do not automatically license associated GitHub code. In particular, code from an associated research repository must not be copied unless the repository/code licence is explicitly established.

## ANMV boundary

ANMV medication data is reference information. It must not be used by Breiz/ELI to recommend, prescribe, modify or diagnose treatment. Medication decisions remain veterinarian-led.
