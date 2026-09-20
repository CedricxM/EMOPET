# EMOPET — Retrait de l'indice global du tableau de bord — 2026-09-20

**Statut :** `SUPERSESSION EXÉCUTÉE / DÉCISION FONDATEUR / RÉVERSIBLE`
**Portée :** `apps/web/app/dashboard/page.tsx` uniquement.
**Gate concernée :** `OPEN-UI-ELI-001`.
**Constat d'origine :** `CURRENT_UI_ELI_PRODUCT_DRIFT_AUDIT_2026-09-07.md`.

> Ce record ne crée aucune autorité. Il exécute une recommandation écrite, sur décision explicite du fondateur, et conserve la trace de ce qui a été retiré pour que la décision reste réversible et vérifiable.

## 1. Ce qui est retiré

La carte principale du tableau de bord et la tendance qui la prolongeait :

- le libellé `Indice d'équilibre (ELI)` / `Balance index (ELI)` ;
- la valeur numérique `MOCK_ELI.value` affichée en grand ;
- le delta hebdomadaire `+{MOCK_ELI.delta}` ;
- la jauge de progression `<Meter>` ;
- la section « Tendance 14 jours / ELI quotidien » et son graphe `TrendChart`.

Le composant `TrendChart`, devenu sans consommateur, est retiré avec elle, ainsi que les imports `DataXL`, `Meter` et `MOCK_TREND_14D`.

## 2. Pourquoi

Aucune autorité contrôlée n'autorise cette surface. Deux l'excluent.

### `FOUNDER_STRATEGIC_LOCKS_2026-09-07.md` — `PROJECT_DECISION / STRATEGIC AUTHORITY`

> EMOPET is relationship-first rather than metric-first.
> The product is intended to help the Owner understand changes in the dog's lived pattern over time, **not to flood the interface with generic scores**.

> — no unsupported **generic emotional score** ;
> — insufficient information may produce no output.

### `EMOPET_CARE_PRODUCT_MASTER_v0.1.md` — `PROPOSED PRE-PRODUCTION AUTHORITY`

Care **n'est pas** :

> — a **generic health score** ;
> — a **« good/bad day » meter**.

Et §2 : `arousal/activation proxy is the only latent variable currently authorised for user publication`. Un composite « équilibre / bien-être global » n'est pas l'arousal : c'est un jugement construit par-dessus.

**Le verrou fondateur suffit à lui seul.** Le Care Master, dont le statut reste `PROPOSED`, corrobore par une liste d'exclusions nommées.

### L'action était déjà prescrite

`CURRENT_UI_ELI_PRODUCT_DRIFT_AUDIT_2026-09-07.md` §8.3 :

> Remove/replace the global `Indice de bien-être / Indice d'équilibre` concept unless a later explicit scientific/product authority reauthorises it.

Ce record exécute cette recommandation. Il ne la découvre pas.

## 3. Ce qui est préservé, et pourquoi

§7 du même audit liste les motifs à conserver au travers de la refonte. Tous sont restés :

| Élément | État |
|---|---|
| États de confiance `VALIDE / DÉGRADÉ / SUPPRIMÉ` | conservé, sur la carte Repos |
| Message de capture insuffisante | conservé, inchangé |
| Affordance « Comprendre les indicateurs » | conservée |
| Avertissement non médical (`<Disclaimer />`) | conservé |
| Export de la synthèse | conservé, déplacé sur la carte Récupération |
| Cartes Anticipation et Récupération | conservées, inchangées |

La carte **Repos** prend l'emplacement principal. Elle porte déjà la forme que Care §4 exige : observation, fenêtre, confiance chiffrée, état de publication, et une phrase de limites — « capture partielle cette nuit, interprétation prudente ; les détails sont affichés mais non consolidés ».

## 4. Ce que ce retrait n'est pas

**Ce n'est pas un retrait pour cause de données simulées.** L'indice est retiré parce que le *type de surface* n'est pas autorisé, pas parce que sa valeur est factice. Les cartes conservées s'appuient elles aussi sur des constantes de développement ; cette question relève de `ELI-ARCH-G3` (#118) et reste ouverte.

Pour mémoire, la valeur retirée n'était pas même une simulation modélisée. `apps/web/lib/mock-data.ts` la déclare en dur :

```ts
export const MOCK_ELI = { state: 'valid', value: 72, delta: +4, captureMinutes: 142, … };
```

et la tendance « ELI quotidien » était une sinusoïde : `50 + 15·sin(i/2) + 1,2·i`. Le fichier ne porte aucun en-tête déclarant sa nature.

**Ce n'est pas non plus une décision scientifique.** Rien ici ne statue sur la validité d'un composite, sur WQI/RSI (`OPEN-UI-ELI-002`), ni sur les contrats de proxies en litige (#86–#91).

## 5. Réversibilité

Le retrait est réversible par simple `git revert`. La condition de retour est écrite dans l'audit du 7 septembre : **une autorité scientifique ou produit explicite et postérieure qui réautorise le concept.** Une préférence d'interface, une demande utilisateur ou une reprise du prototype historique n'y suffisent pas.

Si un indice revient, il devra porter les neuf attributs de Care §4 et ne pas reposer sur des proxies dont les contrats sont encore ouverts.

## 6. Portée de la gate

`OPEN-UI-ELI-001` — *reconcile dashboard global ELI score with founder strategic lock*.

Passe de `OPEN` à **`SURFACE RETIRÉE / RÉCONCILIATION PARTIELLE`**. Elle ne se ferme pas : `BienEtreSection`, encore accessible derrière « Comprendre les indicateurs », conserve des composites (WQI, RSI) que ce retrait ne touche pas. `OPEN-UI-ELI-002` à `OPEN-UI-ELI-005` restent ouvertes.
