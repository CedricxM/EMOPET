# EMOPET — Politique de contexte (NON MÉDICALE)

> Implémentée par `apps/web/lib/context-engine/policies/nonMedicalPolicy.ts`.
> EMOPET est **non médical**. La couche contexte explique des **conditions externes
> possibles** ; elle ne conclut **jamais** sur l'état biologique ou émotionnel de l'animal.
> Une donnée externe est un **signal**, pas une preuve d'état animal.

## Contexte AUTORISÉ

- enrichissement contextuel (météo, qualité de l'air, environnement) ;
- contexte ville / territoire ;
- contexte calendaire / routine ;
- connaissance chien pour l'onboarding (races, contenu éducatif) ;
- personnalisation de l'expérience utilisateur ;
- explications **non médicales** ;
- contexte de motif prudent (« cautious pattern »), sans conclusion.

## Interprétations INTERDITES

- diagnostic ;
- détection de pathologie / maladie ;
- détection de stress comme fait ;
- détection / inférence émotionnelle comme fait ;
- alerte santé / médicale ;
- interprétation vétérinaire ;
- stockage d'audio brut ;
- monitoring invasif.

## Règles de formulation

1. **Décrire l'environnement, pas l'animal.** Le contexte parle du monde extérieur
   (température, humidité, AQI…), jamais d'un état interne du chien.
2. **Jamais de causalité animal ← signal.** Ne pas relier un signal externe à un état
   supposé de l'animal.
3. **Prudence par défaut.** En cas de conflit/incertitude des sources, renvoyer
   « contexte indisponible ou incertain », pas une valeur forcée.
4. **Pas de vocabulaire médical/émotionnel attribué au chien** (cf. invariants
   `CLAUDE.md` et `scripts/forbidden-vocab.mjs`).
5. **Rediriger vers le vétérinaire** pour toute question qui relève d'un avis médical —
   avec chaleur, mais sans ambiguïté, et sans formuler l'avis soi-même.

## Exemples

✅ **Autorisé**
- « Aujourd'hui est inhabituellement chaud et humide, ce qui peut influer sur les routines. »
- « La qualité de l'air est dégradée aujourd'hui dans votre secteur ; vous pourriez
  préférer une sortie plus courte. » *(contexte, choix laissé à l'humain)*
- « C'est un jour férié : votre routine de balade peut différer de l'habitude. »

❌ **Interdit**
- « Le chien est stressé parce qu'il fait chaud. »
- « Détection d'un risque cardiaque lié à la pollution. »
- « L'air pollué rend votre chien anxieux. »
- « Alerte santé : la chaleur a déclenché un problème. »

Forme correcte si les sources météo se contredisent fortement :

```
status        = conflicting_sources
confidence    = low
recommendation = "Contexte externe incertain. Aucune interprétation à formuler."
```

## Garde-fou runtime

`findMedicalClaims(text)` signale toute formulation attribuant un état à l'animal ou tout
claim médical ; `cautiousUnavailable(category)` renvoie un `ArbitratedSignal` neutre
(`value: null`, `confidence: 0`) sans jamais forcer de conclusion. Toute sortie agrégée
porte le tampon `{ nonMedical: true, noDiagnosis: true, noEmotionInference: true }`.
