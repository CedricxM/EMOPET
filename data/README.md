# Data Folder Policy

This folder contains local runtime/demo data.

## FCI PDFs
- Expected path: `data/fci/pdfs/`
- Source: local files provided by the project owner
- No scraping, no external uncontrolled source
- Recommended for GitHub: do **not** version all PDFs in git history
  - use `.gitignore` for bulk PDFs, or
  - use Git LFS if sharing a controlled subset is required.

## FCI local references currently available
- `data/reference/fci_breeds.csv`
- `data/reference/fci_breeds.zip`
- `data/breed_profiles.json`

The TypeScript ingestion and search layer lives in `apps/web/lib/data/fci/`.
It treats FCI data as taxonomy/onboarding reference data only.

## Data intelligence architecture
The first modular data layer is documented in `apps/web/lib/data/README.md`.
It separates:
- territorial launch scoring;
- Breiz local knowledge ingestion and retrieval-ready chunks;
- Mapbox-ready local/community entities;
- FCI breed reference ingestion;
- future ELI sensor-data validation placeholders.

## Runtime files (do not commit)
- SQLite local DB files
- logs and caches
- generated assets from ingestion (for example `data/assets/breeds/*.jpg`)
