# État des onze conflits d'administration C-BARQ après #712 — 2026-09-29

**Date de contrôle :** 2026-09-29
**Statut :** `CONTROLLED RECORD — CONSTAT DATÉ`
**Périmètre :** ce record **constate** ce qui est en vigueur dans `main` et ce qui reste à trancher. Il ne tranche rien, ne promeut rien, et n'autorise aucune publication.
**Sources :** `docs/research/cbarq-breiz-integration.md` §D.5–D.6 (conflits `C1`–`C11`), `docs/research/cbarq-demo-p-spec.md`, et le code fusionné par #712 (`d19ca8d`).

---

## 1. Pourquoi ce record existe

`cbarq-breiz-integration.md` §D.5 énonce onze conflits et dit, à juste titre pour sa date : **« Aucun n'est tranché ici. »** Depuis, #712 a livré le runtime d'administration. Chaque conflit y a reçu une **valeur par défaut conservatrice**, choisie précisément pour ne rien préempter.

C'est exactement la situation que le dépôt sait dangereuse, et dans les deux sens :

- **« code présent ≠ décision produit »** (CLAUDE.md) : la présence d'un défaut conservateur dans `main` ne ratifie rien ;
- **mais un défaut non ratifié devient la politique par inertie.** Personne ne se réveille un matin en décidant que la détection de fatigue reste invisible : cela devient vrai parce que `silent_flag` était le défaut et que personne n'a relu.

Ce record sert donc une chose : rendre les onze arbitrages **ratifiables en une séance**, en mettant en regard, pour chacun, ce qui est en vigueur, si c'est *appliqué* ou seulement *déclaré*, qui décide, et quelle preuve trancherait.

Il corrige aussi §D.5 sur un point factuel : **il n'y a plus de conflit « non implémenté ».** Les onze ont tous un comportement en vigueur.

---

## 2. Tableau de ratification

`APPLIQUÉ` = un test ou une contrainte de base le fait échouer si on s'en écarte. `DÉCLARÉ` = présent dans le code mais rien ne l'impose. `ABSENT` = pas de surface produit.

| Réf | En vigueur dans `main` après #712 | Force | Tranché par | Ce qui trancherait |
|---|---|---|---|---|
| `C1` | `fatigueResponseMode` par défaut **`silent_flag`** — la fatigue est un drapeau serveur invisible, soit l'option **c**, la plus conservatrice. `boundary_offer` (option b) et `immediate_offer` sont disponibles mais non activés | `APPLIQUÉ` (défaut en base + `decideFatigueResponse`) | Fondateur, puis Penn (Q6) | Position de Penn sur une proposition de pause réactive ; à défaut, décision fondateur de rester en `silent_flag` |
| `C2` (fidélité) | Intitulé de section = canal B, composant figé, empreinte `titleRenderDigest`, `llmInvolved = false` imposé par contrainte SQL | `APPLIQUÉ` | — résolu techniquement | — |
| `C2` (validité) | `titleIsPartOfInstrument` par défaut **`false`** — aucun intitulé n'est annoncé | `APPLIQUÉ` (défaut en base) | Penn (Q5) | Mise en page de l'instrument licencié : les intitulés de section sont-ils imprimés ? |
| `C3` | Registre de **contrôles de séance** versionné, chaînes fixes non génératives, sept entrées, sept motifs interdits (dont retour sur le rythme, cadrage de perte, séries) ; le LLM reste interdit de question | `APPLIQUÉ` (`validateRegistry`, G10) | Fondateur — **correction adoptée de fait** | Ratifier la correction de G5, ou la refuser et retirer les contrôles |
| `C4` | Idée 6.5 niveau 3 retirée ; aucune donnée MAT/TAG/ELI ne peut atteindre le choix d'une coupure, son moment ou son contexte | `APPLIQUÉ` (embargo capteur, G9/G11 + `assertSignalsAllowed`) | **Déjà tranché** (`D.2.4`) | — |
| `C5` | La segmentation réellement subie est enregistrée **dans le hachage** du journal ; détecteur d'effet de position livré | `APPLIQUÉ` | Penn (Q1) | Données réelles sous licence, volume suffisant ; la démonstration `P` montre seulement que l'effet serait **détectable** |
| `C6` | La politique fixe un **plafond** `maxScientificUseStatus` ; le statut effectif est calculé à la clôture sur la forme observée, puis borné | `APPLIQUÉ` (`effectiveScientificUseStatus`) | Fondateur — **correction adoptée de fait** | Ratifier la règle de calcul (nombre de séances, durée, dispersion) |
| `C7` | Plafond de **deux** relances par séance manquée, refusé par le code **et** par la base | `APPLIQUÉ` pour le plafond — **`ABSENT` pour le couplage au budget Breiz**, voir §3.1 | Fondateur | Décider si la relance d'instrument cède la priorité au contenu communautaire, ou l'inverse |
| `C8` | Avis d'échéance **factuel et sans perte**, texte figé et versionné ; il a son propre compteur (`deadlineWarningSentAt`, une seule fois) et **ne consomme pas** le quota de relances | `APPLIQUÉ` — mais répond de fait à la question laissée ouverte, voir §3.2 | Fondateur | Ratifier « hors quota », ou basculer l'avis dans le quota |
| `C9` | Aucune surface de restitution n'existe : `P` a été construit **sans interface**, sur décision explicite | `ABSENT` | Fondateur | Décider avant d'écrire la première ligne d'interface : déblocage indexé sur les **sections** (constantes) ou sur les **séances** (variables) |
| `C10` | Liste **fermée** de trois signaux d'adaptation : durée médiane de séance, taux de complétion, fréquence de pause. Tout nom de signal préfixé `sensor.` / `computed.` / `eli.` / `mat.` / `tag.` est refusé | `APPLIQUÉ` (`ALLOWED_ADAPTIVE_SIGNALS`, `assertSignalsAllowed`, G11) | Fondateur + juridique | Ratifier la liste fermée ; toute entrée supplémentaire est une décision RGPD, pas une évolution technique |
| `C11` | Chaque point de coupure porte son `authority` (`licensed` / `emopet_proposed` / `emopet_approved`) et un `breakpointSetVersion` ; seuls `licensed` et `emopet_approved` sont utilisables | `APPLIQUÉ` (`APPROVED_BREAKPOINT_AUTHORITIES`) | Penn (Q1) | Penn fournit-il les points de coupure intra-section, ou faut-il lui soumettre ceux d'EMOPET ? |

---

## 3. Deux constats qui ne sont pas dans §D.5

Ces deux points sont apparus en relisant le code fusionné contre le document. Ils sont **nouveaux**, et ce sont les seuls éléments de ce record qui demandent une action plutôt qu'une ratification.

### 3.1 `C7` — le plafond est appliqué, le couplage au budget Breiz n'existe pas

Le plafond de deux relances est solide : refusé par `declineInvitation` et par `chk_session_reminder_cap`. Mais `C7` portait sur autre chose — la **concurrence** avec `DAILY_CHANNEL_BUDGET` (`push: 1`, `chat_message: 1` par jour), déjà `[ÉTABLI]` dans `packages/ai-personality`.

`[ÉTABLI]` **Aucun couplage n'existe.** Le chemin de relance d'instrument ne passe pas par `publishDecision` ni par l'ordonnanceur de contenu Bleiz : les deux systèmes ne se touchent nulle part. Rien n'empêche donc aujourd'hui une relance d'instrument de s'ajouter au budget quotidien au lieu de s'y inscrire.

Ce n'est pas une régression : `P` n'a livré aucune surface de notification, il n'y a donc rien qui émette encore. Mais c'est une **dette à inscrire avant la première notification réelle**, et le document la présentait comme un simple arbitrage de priorité alors qu'il y a aussi un raccordement à faire.

Recommandation inchangée par rapport à §D.5 — sous-budget à l'intérieur du budget existant, jamais en supplément — plus l'observation que le raccordement est à écrire, et qu'un test devrait échouer si une relance d'instrument peut émettre hors de `publishDecision`.

### 3.2 `C8` — la question ouverte a reçu une réponse de fait

§D.5 laissait ouvert : *« une alerte d'échéance doit-elle consommer le quota de relances, ou être hors quota ? »*

`[ÉTABLI]` Le code répond **hors quota** : `deadlineWarningSentAt` est un champ distinct, envoyé une seule fois, qui n'incrémente pas `reminderCount`. C'est défendable — l'avis est factuel, sans perte, et une fois par fenêtre — mais c'est une décision en vigueur, pas une question ouverte, et il faut soit la ratifier soit la changer.

---

## 4. Ce que ce record ne fait pas

- Il ne tranche aucun des onze conflits, et ne doit pas être cité comme les ayant tranchés.
- Il ne débloque rien de ce qui est marqué `[BLOQUÉ-LICENCE]`. **Le statut de licence C-BARQ reste `NOT GRANTED`** ; `licenseStatus` vaut `demo_only` et le magasin de contenu réel est délibérément non implémenté.
- Il ne crée pas l'ADR-0001 (arousal seul publiable, valence interne/gated), dont un brouillon reste proposé en annexe de `cbarq-breiz-integration.md`. Le formaliser est un acte de gouvernance.
- Il n'établit aucune validité psychométrique : la démonstration `P` tourne sur données synthétiques et contenu factice préfixé `DEMO`.
- Il ne modifie ni ne remplace `cbarq-breiz-integration.md` §D.5, qui reste l'énoncé de référence des conflits. Ce record en est le **constat d'état daté**, pas une révision.

---

## 5. Sur quoi la ratification porte, en une phrase

Cinq conflits (`C3`, `C4`, `C6`, `C10`, et la moitié fidélité de `C2`) attendent une **ratification de corrections déjà en vigueur** ; quatre (`C1`, la moitié validité de `C2`, `C5`, `C11`) sont **fermés par défaut en attendant Penn** et ne demandent rien avant sa réponse ; deux (`C7`, `C9`) demandent une **décision avant d'écrire du code** — le raccordement au budget Breiz et l'indexation du déblocage ; et `C8` demande de confirmer une réponse que le code donne déjà.
