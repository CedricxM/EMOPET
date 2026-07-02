# Résolution de conflits — Arbitrage de contexte EMOPET

> Implémenté par `apps/web/lib/context-engine/arbitration/*` et `scoring/providerTrust.ts`.
> Principe : plusieurs API peuvent se contredire. EMOPET ne fait JAMAIS confiance à la
> dernière réponse reçue. Pour le contexte numérique sûr, on calcule un **consensus
> pondéré** après retrait des outliers ; en cas de désaccord trop fort, on renvoie une
> **incertitude** — jamais une conclusion forcée. La **provenance** est toujours conservée.

## Étapes (numérique sûr)

1. **Normalisation** (`evidenceResolver.toNumericReadings`) : on extrait une lecture
   numérique par signal via un accesseur (ex. `tempC`, `pm25`), avec unité et horodatage.
2. **Pondération** : `poids = trust(catégorie, provider) × facteurFraîcheur × confianceSignal`
   (borné ≥ 0,01). Poids de confiance dans `scoring/providerTrust.ts`.
3. **Précision de localisation & fraîcheur** : la fraîcheur module le poids
   (`fresh` 1 · `acceptable` 0,8 · `stale` 0,4 · `unknown` 0,6) ; un signal `stale`
   pèse moins et bascule le statut en `stale` si toutes les sources le sont.
4. **Détection d'outliers** : z-score modifié de Iglewicz-Hoaglin
   (`0,6745·(x−médiane)/MAD`), seuil `|z| > 3,5`. MAD nulle → aucun outlier.
5. **Consensus pondéré** : moyenne pondérée des inliers.
6. **Désaccord** : si l'étendue relative des inliers dépasse le seuil (`conflictSpread`,
   défaut 0,2), le statut devient `conflicting_sources` et la valeur `null`.
7. **Confiance** : `poidsMoyen × (0,6 + 0,4·accord) × (1 − 0,15·nbOutliers)`, bornée 0..1.
8. **Provenance** : chaque source garde `value`, `weight`, `freshness`,
   `usedInConsensus`, `outlier` — pour l'audit.

## Contexte sensible

Pour un contexte sensible (`sensitive: true`), le seuil de désaccord est durci (0,03) :
tout écart notable bascule en `conflicting_sources`. **On ne moyenne pas, on n'infère
pas de comportement.** On renvoie l'incertitude.

## Statuts d'un signal arbitré

`confirmed` (source unique fiable) · `consensus` (plusieurs sources concordent) ·
`fallback_used` · `stale` · `conflicting_sources` · `insufficient_data` ·
`provider_error` · `outlier_removed` · `not_available`.

## Exemples (tests `arbitration.test.ts`)

**Conflit léger — outlier retiré**
```
open-meteo 29 °C · openweathermap 30 °C · weatherapi 42 °C
→ 42 °C retiré (z modifié ≈ 8) ; status = consensus ; valeur ≈ 29,4 °C
→ confiance ABAISSÉE mais acceptable (~0,57) ; provenance conservée
```

**Désaccord fort — aucune conclusion**
```
open-meteo 25 °C · openweathermap 38 °C · weatherapi 12 °C
→ aucun outlier net ; étendue relative ≈ 1,0 > seuil
→ status = conflicting_sources ; valeur = null
→ recommandation : « Contexte externe incertain. Aucune interprétation à formuler. »
```

## Poids de confiance par catégorie (extrait)

- **Météo** : open-meteo / met.no `1.0` ; weatherapi / openweathermap `0.6` ; wttr.in `0.3`.
- **Air** : OpenAQ `1.0` ; AQICN `0.8` ; IQAir `0.75` ; PurpleAir `0.5`.
- **Géocodage** : BAN / geo.api.gouv `1.0` ; Geoapify `0.6` ; IP geoloc `0.2`.
- **Calendrier** : Nager.Date `1.0` ; Calendarific `0.6`.
- Provider inconnu d'une catégorie → `DEFAULT_TRUST = 0.5`.

## Garde-fou non médical

Quel que soit le résultat numérique, l'agrégateur (`contextAggregator`) tamponne la
sortie `{ nonMedical, noDiagnosis, noEmotionInference }` et n'attribue jamais d'état à
l'animal. Un contexte arbitré décrit l'environnement, pas le chien (cf.
`EMOPET_CONTEXT_POLICY.md`).
