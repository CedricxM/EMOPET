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
- derived outputs that are lawful, small and scientifically justified.

## Reproducible receipt

After obtaining a source file from the registered source, run:

```bash
node scripts/data/register-dataset-file.mjs <datasetId> <file> [recordCount]
```

The script computes SHA-256 and writes a provenance receipt under `data/registry/receipts/`.

A receipt proves file identity only. It does not promote the dataset to production evidence.

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
