# EmoPet v6 — Installation guide (local)

> EmoPet fournit des observations et tendances. Il ne s’agit pas d’un diagnostic et cela ne remplace pas l’avis d’un vétérinaire.

Ce guide décrit une installation locale pour une démo/bêta technique sous Windows.

## 1) Pré‑requis
- Windows + PowerShell
- Python 3.11+

## 2) Installer les dépendances (venv)
```powershell
cd C:\Users\utilisateur\emopet_v6
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -U pip
pip install -r requirements.txt
```

## 3) Lancer l’API
```powershell
python -m uvicorn src.api.emopet_api:app --reload --host 127.0.0.1 --port 8000
```

Vérifier:
```powershell
Invoke-RestMethod "http://127.0.0.1:8000/healthz"
Invoke-RestMethod "http://127.0.0.1:8000/meta"
```

## 4) (Optionnel) Activer une clé API
Par défaut, l’API accepte les requêtes sans authentification.  
Si `EMOPET_API_KEY` est défini, il faut envoyer `X-API-Key`.

```powershell
$env:EMOPET_API_KEY="change-me"
python -m uvicorn src.api.emopet_api:app --reload --host 127.0.0.1 --port 8000
```

Exemple d’appel:
```powershell
Invoke-RestMethod "http://127.0.0.1:8000/healthz" -Headers @{ "X-API-Key" = "change-me" }
```

## 5) Tests
```powershell
python -m pytest -q
python smoke_test.py
```

## 6) UI Streamlit (optionnelle)
Voir `ui/README_UI.md`.

