# EmoPet — Thresholds reference (tech, non médical)

> EmoPet fournit des observations et tendances. Il ne s’agit pas d’un diagnostic et cela ne remplace pas l’avis d’un vétérinaire.

Ce document liste des seuils *logiciels* utilisés par les heuristiques v6 / v5.1 LITE.  
Ils sont conçus pour la robustesse et la prudence (pas pour une interprétation clinique).

Références code:
- `src/emotion_predictor.py` (labels prudents)
- `src/processing/latent_state.py` (anti‑yo‑yo)

## 1) Labels prudents (EmotionPredictor)
Dans `src/emotion_predictor.py`:
- **Confidence damping**: la sortie valence/arousal est multipliée par `confidence` (0..1).
- **Label gating**:
  - si `confidence < 0.55` → label = `calme` (prudence: éviter un label “fort”)
  - sinon, si `arousal > 0.40`:
    - si `valence < -0.20` et `confidence >= 0.60` → `tension_possible`
    - sinon → `activation`
  - sinon → `calme`

## 2) Latent state (v5.1 LITE)
Dans `src/processing/latent_state.py`:
- si `confidence < 0.55` → “hold” (ne pas transitionner fortement; conserver l’état précédent ou rester `NEUTRAL`)
- hystérésis: 2 mesures consécutives cohérentes requises pour changer d’état
- restriction OFF_MAT: `RESTFUL` fortement restreint (règles prudentes)
- seuil “tension possible”: activation élevée + contexte (bruit/activité) + confiance suffisante (voir implémentation)

## 3) Limites d’interprétation
- Les seuils sont des garde‑fous “produit” et doivent être validés sur données terrain avant toute généralisation.
- Les sorties restent une lecture prudente (tendances, incertitude), sans promesse médicale.

