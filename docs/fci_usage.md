# FCI usage in EmoPet

## Scope

FCI standards are used as an offline personalization brick only.
They provide:
- official group / section
- origin
- FCI standard number
- soft UX priors (`size_class`, `coat_type`, `work_type`, `expected_activity_band`)

They do **not** provide diagnosis, risk scoring, or medical thresholds.

## Data pipeline

Build local JSON artifacts from PDFs:

```powershell
python core/scripts/extract_fci_from_pdfs.py
python core/scripts/build_fci_traits.py
```

Inputs:
- `docs/fci_breeds/**/*.pdf`

Outputs:
- `core/data/fci_catalog.json`
- `core/data/fci_traits.json`

## Runtime integration

Core function:
- `core/emopet/fci/catalog.py -> build_breed_context(breeds: list[str])`

Daily output:
- `out/daily_summary.json` includes `breed_context`

## Do / Don't

Do:
- use FCI metadata as stable descriptive context
- keep uncertain extractions as `"unknown"`
- keep wording qualitative and non-medical

Don't:
- infer pathology from breed
- generate clinical thresholds from FCI
- override sensor evidence with breed priors
