# EmoPet v6

Demo stack:
- Flutter app: `flutter_app/`
- API: `src/api/emopet_api.py`
- DB: PostgreSQL 16 + SQLAlchemy 2 + Alembic
- FCI ingestion: `scripts/ingest_fci_pdf.py` (local PDFs only)

## Official Backend Entry Point

- Official backend for local development and `docker compose`: `src.api.emopet_api:app`
- Legacy compatibility entrypoint: `app.main:app`
- For new development, always launch the backend via `src.api.emopet_api:app`

Non-medical by design:
- observations and trends only,
- no diagnosis,
- privacy-first (no raw audio storage, no automatic media capture).

## Run in 5 Minutes (Windows)

### 1) Setup
```powershell
cd C:\Users\utilisateur\emopet_v6
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -U pip
pip install -r requirements.txt
Copy-Item .env.example .env -Force
```

### 2) Start Postgres
```powershell
docker compose up -d db
docker compose ps
```

### 3) Migrations (always use `python -m alembic`)
```powershell
python -m alembic upgrade head
python -m alembic current -v
```

### 4) Import FCI PDFs (local files)
```powershell
python scripts\ingest_fci_pdf.py --path data/fci/pdfs --lang fr --limit 5
# full import
python scripts\ingest_fci_pdf.py --path data/fci/pdfs --lang fr
# optional image extraction (1 image max per breed)
python scripts\ingest_fci_pdf.py --path data/fci/pdfs --extract-images true
```

### 5) Run API
```powershell
python -m uvicorn src.api.emopet_api:app --reload --host 127.0.0.1 --port 8000
```

### 6) Run Flutter Demo
```powershell
cd flutter_app
flutter pub get
flutter run -d windows
```

## One-command helpers (PowerShell)
- `scripts/dev.ps1`
- `scripts/run_api.ps1`
- `scripts/import_fci.ps1`
- `scripts/run_demo_flutter.ps1`

## Main API Endpoints
- `GET /healthz`
- `GET /meta`
- `GET /breeds?query=&limit=&offset=`
- `POST /dogs`, `GET /dogs/{id}`, `PUT /dogs/{id}`, `DELETE /dogs/{id}`
- `POST /fci/import`
- `POST /ingest/mat_session`
- `POST /ingest/tag_reading`
- `POST /ingest/garment_reading`
- `POST /weather/snapshot`
- `POST /presence/snapshot`
- `POST /checkin`
- `GET /journal/{dog_id}`, `POST /journal/{dog_id}`
- `GET /health/log?dog_id=...`, `POST /health/log?dog_id=...`, `GET /health/log/export?dog_id=...`
- `POST /insights/{dog_id}/compute`
- `GET /insights/{dog_id}`

## Notes
- No web scraping is used for breeds.
- FCI references come from local PDFs under `data/fci/pdfs`.
- For Windows shells, prefer `python -m alembic ...` instead of `alembic ...`.
