# EmoPet v6 — API reference (FastAPI)

> EmoPet fournit des observations et tendances. Il ne s’agit pas d’un diagnostic et cela ne remplace pas l’avis d’un vétérinaire.

Base URL (local): `http://127.0.0.1:8000`

## 1) Auth (optionnelle)
Si `EMOPET_API_KEY` est défini, envoyer le header `X-API-Key`.

## 2) Encodage
Les réponses JSON utilisent `application/json; charset=utf-8`.

## 3) Endpoints core

### `GET /health` / `GET /healthz`
But: probe technique.

Réponse:
```json
{"status":"ok"}
```

### `GET /meta`
But: métadonnées runtime (démo/bêta technique).

Réponse (exemple de structure):
```json
{
  "version": "6.x",
  "date": "YYYY-MM-DDTHH:MM:SSZ",
  "env": {"timezone":"UTC","python":"3.x","platform":"Windows","platform_release":"..."}
}
```

### `POST /predict`
But: prédiction prudente “brute” (sans couche produit), loggée en CSV.

Query params:
- `dog_id` (optionnel)

Body (structure):
```json
{
  "timestamp": "YYYY-MM-DDTHH:MM:SS",
  "mat": {"resp_bpm": 22, "temp_animal_c": 38.6, "posture": "lying_sternal", "rest_agitation_idx": 0.12},
  "gadget": {"activity_level": 0.2, "ambient_noise_db": 45, "ambient_temp_c": 21},
  "env": {"ambient_temp_c": 21, "ambient_noise_db": 45, "humidity": null, "light_level": null}
}
```

Réponse (champs principaux):
- `timestamp`, `mode`, `is_on_mat`
- `prediction` (valence/arousal/label/confidence)
- `features`, `quality`, `inputs`

### `POST /insights`
But: `predict` + couche produit (scores prudents, alert flags) + état latent (anti‑yo‑yo), loggée en CSV.

Query params:
- `dog_id` (optionnel)

Body: même structure que `/predict`.

Réponse: mêmes champs que `/predict`, plus:
- `insights` (`wellbeing_score`, `rest_quality_score`, `alert_flags`, `notes`)
- `latent` (`latent_state`, `state_confidence`, `state_reason`)

### `GET /daily_summary`
But: résumé 24h + comparaison baseline.

Query params:
- `dog_id` (optionnel)

Réponse: résumé agrégé (date, counts, moyennes prudentes, narrative).

### `GET /night_report`
But: rapport d’une “nuit logique” (fenêtre configurable).

Query params:
- `start_hour` (défaut 22)
- `end_hour` (défaut 7)
- `date` (optionnel) : `YYYY-MM-DD` (date de fin de nuit)
- `dog_id` (optionnel)

Réponse: `window`, `counts`, `averages`, `weekly_baseline`, `alert_flags`, `narrative`.

### `GET /alerts`
But: signaux faibles multi‑nuits (non médicaux).

Query params:
- `start_hour`, `end_hour`
- `date` (optionnel) : `YYYY-MM-DD`
- `lookback_nights` (défaut 7)
- `dog_id` (optionnel)

Réponse: `date`, `nights_checked`, `alerts`, `narrative`.

### `GET /recommendations`
But: recommandations actionnables (non médicales) basées sur night_report + alerts.

Query params:
- `date` (obligatoire) : `YYYY-MM-DD`
- `start_hour`, `end_hour`, `lookback_nights`
- `dog_id` (optionnel)

Réponse: `date`, `narrative`, `actions`.

### `GET /weekly_report`
But: tendances hebdomadaires (lecture produit).

Query params:
- `end_date` (obligatoire) : `YYYY-MM-DD`
- `start_hour`, `end_hour`
- `nights_count` (défaut 7)
- `days_count` (défaut 7)
- `dog_id` (optionnel)

Réponse: `end_date`, `badge`, `top_factors`, `premium_story`, `metrics`, `flags`, `nights`, `days`, `narrative`.

### `GET /push_preview`
But: prévisualiser une notification (démo).

Query params:
- `date` (obligatoire) : `YYYY-MM-DD`
- `lookback_nights` (défaut 7)
- `dog_id` (optionnel)

Réponse: `date`, `push` (title/body/cta/severity), `context`.

### `GET /daily_coach`
But: coaching quotidien prudent (question “dois‑je m’inquiéter ?” + explication courte + objectif).

Query params:
- `date` (optionnel) : `YYYY-MM-DD`
- `lookback_nights` (défaut 7)
- `dog_id` (optionnel)

Réponse: `date`, `worry_level`, `simple_explanation`, `today_goal`, `micro_actions`, `streak`, `context`.

### `GET /dogs` / `POST /dogs/{dog_id}`
But: gestion simple d’un registre “chiens” (démo multi‑chien).

## 4) Endpoints d’extensions (optionnels)
Les endpoints d’extensions (`/food/*`, `/daily/*`, `/community/*`, `/local/*`, `/ecosystem/*`) ne sont disponibles que si les feature flags sont activés.  
Référence: `docs/EXTENSIONS.md`.

