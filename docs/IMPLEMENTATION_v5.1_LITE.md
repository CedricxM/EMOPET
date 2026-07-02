# EmoPet — v5.1 LITE (latent state + smoothing) — note d’implémentation

> EmoPet fournit des observations et tendances. Il ne s'agit pas d'un diagnostic et cela ne remplace pas l'avis d'un vétérinaire.

Référence officielle (cadre produit, définitions, limites): `EMOPET_OFFICIAL_SPEC.md` (section 5).

But: ajouter une couche **stable** au-dessus des sorties instantanées (valence/arousal/label/confidence) afin d'éviter des oscillations ("yo-yo") d'une mesure à l'autre.

Principes:
- déterministe, explicable (règles simples + raisons courtes)
- prudent (confiance/qualité → limitation de l’interprétation)
- compatibilité API: ajouts **additifs** uniquement (aucun champ existant supprimé)

## Où c’est implémenté
- Moteur: `src/processing/latent_state.py`
  - `LatentStateEngine.infer(self, result: dict, history: list[dict]) -> dict`
- Intégration: `src/api/emopet_api.py` (réponse de `POST /insights`)
  - ajoute un champ `latent` (additif)
- Historique (fenêtre glissante): `src/utils/logger.py`
  - `tail_log_file(...)` / `tail_log_for_dog(...)` (lecture des N dernières lignes sans pandas)

## Sortie ajoutée dans `/insights` (exemple)
```json
"latent": {
  "latent_state": "NEUTRAL",
  "state_confidence": 0.73,
  "state_reason": ["arousal_high", "activity_high", "support=0.67"]
}
```

États (`latent_state`):
- `RESTFUL`
- `NEUTRAL`
- `ACTIVATED`
- `TENSION_POSSIBLE`

## Règles (résumé)
Entrées utilisées (si présentes):
- `prediction`: `valence`, `arousal`, `label`, `confidence`
- `features`: `activity`, `noise_rel`, `amb_temp_rel`
- `mode` / `is_on_mat`
- `quality.q_total`
- `history`: dernières lignes du CSV (tail 5)

Règles clés:
1) **Low confidence hold**  
   Si `confidence < 0.55`, pas de transition forte: rester `NEUTRAL` ou conserver l’état précédent.

2) **Hystérésis**  
   2 mesures consécutives cohérentes sont requises pour changer d’état.

3) **OFF_MAT restriction**  
   Hors mat, `RESTFUL` est fortement restreint (arousal bas + activité basse + bruit faible).

4) **TENSION_POSSIBLE**  
   Uniquement si activation élevée + (bruit élevé ou activité élevée) + `confidence >= 0.6`.

5) **Smoothing stateless (fenêtre glissante)**  
   Vote pondéré sur `history + mesure courante` (poids = confiance).

## Logs CSV (compatibles)
Deux colonnes **peuvent** être présentes:
- `latent_state`
- `state_confidence`

Compatibilité:
- si elles n’existent pas, le système continue (valeurs absentes = ignorées).

## Tests
```powershell
python -m pytest -q
```

Tests ciblés: `tests/test_latent_state.py`
- low confidence → pas de transition forte
- hystérésis → une mesure ne suffit pas
- OFF_MAT + activité élevée → pas RESTFUL
