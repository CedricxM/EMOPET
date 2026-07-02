# EmoPet v6 — Architecture (résumé)

> EmoPet fournit des observations et tendances. Il ne s’agit pas d’un diagnostic et cela ne remplace pas l’avis d’un vétérinaire.

Ce document décrit l’architecture logicielle du repo (niveau “lecture rapide”), sans revendication clinique.

## 1) Vue d’ensemble (produit)
- **MAT (station de repos)** : référence de mesure au repos (meilleure interprétabilité, moins d’artefacts).
- **Mini‑gadget** : contexte hors repos (activité, environnement), sans prétendre mesurer finement la physiologie en mouvement.
- **API FastAPI** : expose des endpoints “core” (predict/insights/reports) + des endpoints d’extensions (optionnels, feature flags).
- **Stockage** : logs CSV pour le core ; stockage JSON local pour les extensions (démo).

## 2) Structure du code (repères)
- `src/api/` : application FastAPI, routes, schémas (`src/api/emopet_api.py`, `src/api/schemas.py`).
- `src/processing/` : moteurs “core” (insights, daily_summary, night_report, alerts, weekly_report, daily_coach, latent_state).
- `src/emotion_predictor.py` : modèle déterministe (interprétable) valence/arousal + confidence damping.
- `src/utils/` : utilitaires (logger CSV, time windows, chemins logs, rotation, cache, sécurité).
- `src/extensions/` : extensions optionnelles (feature flags, storage JSON, routers/services/schemas par domaine).
- `src/app/` : clients/outils locaux (scripts d’appel) et code “dashboard” historique côté Python.
- `ui/` : UI Streamlit de démo (fallback mock si API indisponible).

## 3) Flux de données (simplifié)
1) **Mesure** (timestamp + signaux MAT/gadget/env) → `POST /predict` / `POST /insights`
2) **Interprétation prudente** → propagation d’une qualité/confiance + horizons (instantané/24h/nuit/7 jours)
3) **Persistance démo** → écriture dans un log CSV (`data/logs/...`) ; lecture pour rapports et tableaux de bord
4) **Rapports** → endpoints “report” lisent l’historique (fenêtres temporelles explicites)

## 4) Conventions importantes
- Toujours distinguer **observé** (capteurs) / **déclaré** (humain) / **interprétation** (EmoPet).
- Hors MAT (OFF_MAT), rester sur des indicateurs de contexte ; éviter toute conclusion physiologique fine.
- Quand la qualité baisse, limiter l’interprétation (neutralité, confidence damping, messages prudents).

