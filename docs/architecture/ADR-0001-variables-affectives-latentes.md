# ADR-0001 — Les variables affectives sont latentes et ne sont jamais exposées

- **Statut :** ACCEPTÉ
- **Date :** 23 juillet 2026
- **Portée :** tout le dépôt (API, applications, exports, journaux, réponses de modèles)
- **Référence d'audit :** `AUDIT.md`, point D2

## Contexte

Le positionnement produit est constitutif : EMOPET n'affiche aucune étiquette émotionnelle et ne produit aucun diagnostic. Le moteur d'inférence, lui, manipule des variables affectives internes nécessaires au calcul :

- `arousal` (proxy d'activation, borné 0 à 1), `eli_states.arousal` ;
- `valence` (proxy de valence, borné -1 à 1), `eli_states.valence` ;
- `peak_arousal` (`eli-v5`) ;
- les compteurs dérivés `elevated_arousal_episodes_week` et `elevated_arousal_episodes_avg` dans `packages/shared/src/types/sensor.ts`.

L'intention correcte existait déjà dans le code, mais uniquement sous forme de commentaire (`Valence proxy v_t. Internal to V1, NOT published`) et de bonne pratique de la projection `eliToDisplay`. Un commentaire n'est pas exécutoire. Les routes `sensors` sont encore des points d'entrée non implémentés : la surface d'exposition n'existe pas encore, c'est donc le moment de poser la règle avant qu'elle n'apparaisse.

Le risque concret n'est pas théorique : il suffit qu'une future implémentation renvoie une ligne `eli_states` telle quelle pour que `arousal` et `valence` deviennent une surface publique, ce qui contredirait le positionnement et exposerait une interprétation affective non validée.

## Décision

**Les variables affectives internes sont latentes. Elles ne sortent jamais du moteur d'inférence vers une surface observable par un utilisateur ou par un tiers.**

Sont interdites dans toute charge utile sortante : `arousal`, `valence`, `peak_arousal`, `peakArousal`, ainsi que toute clé dont le nom contient `arousal` ou `valence`, quelle que soit la casse ou la convention de nommage.

Surfaces couvertes :

1. réponses des routes HTTP de `backend/api` (publiques et authentifiées) ;
2. données rendues dans `apps/web` et `apps/mobile` ;
3. exports, partages de rapport, liens de partage ;
4. journaux applicatifs et messages d'erreur ;
5. invites et sorties de modèles de langage (`packages/ai-personality`).

**Ce qui reste autorisé et publié :** la sortie de projection `eliToDisplay`, à savoir statut de gate, libellé non émotionnel (`calme`, `activation`, `tension_possible`), valeur ELI `load`, bande d'incertitude, points de confiance, explication et suggestion. La valeur `load` est l'indicateur produit ; elle est publiée avec sa bande et son niveau de confiance, jamais seule.

**Ce qui reste autorisé en interne :** persistance en base, calcul dans `packages/eli-engine`, validation par `ELIStateSchema`, transport entre composants internes de calcul. La décision porte sur l'exposition, pas sur le calcul ni sur le stockage.

## Conséquences

- Toute nouvelle route qui lit `eli_states` doit passer par une projection explicite. Le renvoi direct d'une ligne de base est interdit.
- Le contrat est vérifié automatiquement par `backend/test/contract-affective-exposure.test.mjs`, qui échoue si un identifiant interdit apparaît dans une couche d'exposition ou dans une charge utile testée.
- Une exception ponctuelle et justifiée doit porter le marqueur `ADR-0001-EXEMPT` sur la ligne concernée et être argumentée en revue. L'usage du marqueur sans justification écrite est un défaut.
- Le vocabulaire du code (`load` nommé « charge émotionnelle ») reste à réconcilier avec le discours produit. Point ouvert, sans effet sur la présente décision.

## Alternatives écartées

- **Renommer les variables internes** (par exemple en `activation` et `polarité`) : réduit l'ambiguïté de vocabulaire mais ne protège pas contre l'exposition, et impose une migration de schéma. Écarté à ce stade, non exclu plus tard.
- **S'appuyer sur la revue de code seule** : c'est la situation actuelle, elle a déjà produit un invariant non exécutoire. Insuffisant.
- **Filtrer à la sérialisation par un intergiciel global** : efficace mais masque le problème au lieu de forcer une projection explicite, et donne une fausse sécurité si un chemin contourne l'intergiciel. Un garde-fou de test est préféré, un intergiciel pourra le compléter.
