# EmoPet — Physiology & context reference (tech, non médical)

> EmoPet fournit des observations et tendances. Il ne s’agit pas d’un diagnostic et cela ne remplace pas l’avis d’un vétérinaire.

Ce document décrit les **signaux** et leur **usage technique** dans EmoPet v6, tels qu’ils apparaissent dans les payloads API et le pipeline de features.

Portée:
- ce document n’est pas une référence clinique (pas de normes, pas d’interprétation médicale).
- les plages ci‑dessous sont des garde‑fous de plausibilité *logiciels* (anti‑données aberrantes).

Référence code:
- `src/api/schemas.py` (inputs)
- `src/processing/fusion_module.py` (features + qualité)

## 1) Signaux observés (inputs API)

### 1.1 MAT (au repos)
- `mat.resp_bpm` (bpm)  
  Utilisation: variation relative au repos (`resp_rel`).  
  Plausibilité (garde‑fou): ~5 à 80 (tech).

- `mat.temp_animal_c` (°C, tendance)  
  Utilisation: variation relative (`temp_rel`).  
  Plausibilité (garde‑fou): ~33.0 à 41.5 (tech).

- `mat.rest_agitation_idx` (0..1)  
  Utilisation: agitation relative (`agitation_rel`).  
  Plausibilité: 0..1.

- `mat.posture` (string)  
  Utilisation: encodage en `posture_score` (0..1) puis `posture_rel`.  
  Valeurs usuelles: `lying_lateral`, `lying_sternal`, `sitting`, `standing` (compat: `lateral`, `sternal`, `sit`, `stand`, `unknown`).

### 1.2 Gadget / environnement (contexte)
- `gadget.activity_level` (0..1)  
  Utilisation: `activity` (contexte, pas physiologie fine).

- `gadget.ambient_noise_db` / `env.ambient_noise_db` (dB)  
  Utilisation: bruit relatif `noise_rel` (écart à une baseline foyer).
  Plausibilité (garde‑fou): ~0 à 120 (tech).

- `gadget.ambient_temp_c` / `env.ambient_temp_c` (°C)  
  Utilisation: `amb_temp_rel` (écart à une baseline foyer).
  Plausibilité (garde‑fou): ~-5 à 50 (tech).

## 2) Features normalisées (pipeline)
Dans `src/processing/fusion_module.py`, les signaux sont transformés en features normalisées:
- `resp_rel` : (resp - baseline_resp) / baseline_resp (clippé)
- `temp_rel` : (temp_animal - baseline_temp_animal) / 5 (clippé)
- `agitation_rel` : agitation - baseline_agitation (clippé)
- `posture_score` : encodage posture (0..1)
- `posture_rel` : posture_score - baseline_posture_score (clippé)
- `activity` : activité (0..1)
- `noise_rel` : (noise_db - baseline_noise_db) / 40 (clippé)
- `amb_temp_rel` : (ambient_temp - baseline_ambient_temp) / 15 (clippé)

## 3) Qualité / confiance (gating)
Le pipeline calcule un score `q_total` (0..1) basé sur:
- présence et plausibilité des signaux (MAT pèse plus que le gadget),
- garde‑fous sur des plages “techniques” (anti‑aberrations).

Règle produit (prudence):
- quand la qualité baisse, l’interprétation est limitée (neutralité, damping, explications “données insuffisantes”).

