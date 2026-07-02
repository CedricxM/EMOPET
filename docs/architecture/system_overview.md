# EmoPet v6 — System overview

> EmoPet fournit des observations et tendances. Il ne s’agit pas d’un diagnostic et cela ne remplace pas l’avis d’un vétérinaire.

Ce document complète `ARCHITECTURE.md` avec une vue “docs/architecture” (diagramme + flux), en restant descriptif et non médical.

## 1) Diagramme (repère)
- `docs/architecture/data_flow_diagram.png`

## 2) Composants
- **API**: `src/api/emopet_api.py` (FastAPI, endpoints core + inclusion optionnelle des extensions).
- **Schémas**: `src/api/schemas.py` (modèles Pydantic pour `POST /predict` et `POST /insights`).
- **Traitement core**: `src/processing/*` (insights, daily_summary, night_report, alerts, weekly_report, daily_coach, latent_state…).
- **Fusion & qualité**: `src/processing/fusion_module.py` (features normalisées + score de qualité).
- **Stockage core**: `data/logs/*` (CSV). Chemins: `src/utils/log_paths.py`.
- **Extensions**: `src/extensions/*` (routers/services/schemas optionnels + stockage JSON local).
- **UI**: `ui/` (Streamlit, fallback mock si API indisponible).

## 3) Flux de données (simplifié)
1) **Entrée mesure** (timestamp + `mat`/`gadget`/`env`) vers `POST /predict` ou `POST /insights`.
2) **Fusion** → features normalisées + score de qualité/confiance.
3) **Interprétation prudente** → valence/arousal + labels prudents + scores “produit”.
4) **Logs** → écriture CSV, puis lecture par les endpoints “report” (24h/nuit/semaine).

## 4) Conventions de communication (produit)
- Toujours distinguer: **observé** (capteurs) / **déclaré** (humain) / **interprétation** (EmoPet).
- Hors MAT (OFF_MAT), rester sur contexte (activité/environnement).
- Quand la qualité baisse, limiter l’interprétation (neutralité, damping).

