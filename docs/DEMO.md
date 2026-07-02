# DEMO locale EmoPet

## 1) Base PostgreSQL
```powershell
docker compose up -d db
python -m alembic upgrade head
python -m alembic current -v
```

## 2) Ingestion FCI locale
```powershell
python scripts\ingest_fci_pdf.py --path data/fci/pdfs --lang fr
```

## 3) API
```powershell
python -m uvicorn src.api.emopet_api:app --host 127.0.0.1 --port 8000 --reload
```

Verifications:
```powershell
Invoke-RestMethod "http://127.0.0.1:8000/healthz"
Invoke-RestMethod "http://127.0.0.1:8000/meta"
```

## 4) Flutter demo UI
```powershell
cd flutter_app
flutter pub get
flutter run -d windows
```

## 5) Streamlit UI (optionnel)
```powershell
python -m streamlit run ui/app.py
```

## 6) Rappel non medical
EmoPet affiche des indices et tendances avec fiabilite, limites et suggestions douces.
Ce n'est pas un diagnostic.
