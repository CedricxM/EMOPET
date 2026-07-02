# AUDIT.md — Skills installés & standards de travail EMOPET

> **Phase 0 du protocole « Standards skills.sh ».** Découverte factuelle des skills
> réellement présents sur la machine, avant toute écriture de code.
> Méthode : inspection disque (les `SKILL.md` font autorité), **aucune supposition de mémoire**.
> Date : 2026-06-16.

---

## 0. Résultat en une phrase

**Les six skills nommés par le protocole — Emil Kowalski, Taste, Impeccable, Product
Thinking, Clean Code, Test — sont INTROUVABLES sur cette machine.** Aucun n'est installé,
ni dans le projet, ni dans le profil utilisateur, ni dans le cache de l'app. Je ne peux
donc pas les appliquer « selon leur SKILL.md » : ces SKILL.md n'existent pas ici.
Conformément à la consigne (« si un skill attendu est absent ou vide, signale-le ; ne
l'invente pas »), je ne fabrique aucun de leurs contenus.

---

## 1. Méthode de découverte (traçable)

| # | Recherche | Cible | Résultat |
|---|-----------|-------|----------|
| 1 | `Skill("skills")` | lister les skills de la session | ❌ `/skills` est une commande UI, non invocable par l'agent |
| 2 | Glob `**/SKILL.md` | racine projet `emopet_v6` | **0 fichier** |
| 3 | Glob `.claude/**` | `.claude` du projet | seulement `launch.json` + `settings.local.json` — **pas de dossier `skills/`** |
| 4 | Glob `**/SKILL.md` | `C:\Users\utilisateur\.claude` (profil) | **0 fichier** |
| 5 | Glob `**/SKILL.md` | `C:\Users\utilisateur\AppData\Roaming\Claude` | **~90 fichiers** (cache app Desktop — voir §3) |
| 6 | Grep `kowalski\|impeccable\|product.thinking\|clean.code` | tout le cache skills | **0 vraie occurrence** (1 faux positif dans un doc Wix React) |
| 7 | Lecture directe des SKILL.md analogues | cache Desktop | OK (voir §4) |

**Conclusion de méthode :** dans **cette** session Claude Code (CLI), **aucun skill
communautaire n'est enregistré**. Les seuls `SKILL.md` du disque appartiennent au cache
de **Claude Desktop** (`local-agent-mode-sessions`), un autre runtime — ils ne sont pas
« chargés » ici et ne sont pas ceux que le protocole vise.

---

## 2. Les six skills attendus — état réel

> Aucun n'a de `SKILL.md`. « Analogue » = skill réellement installé dont le rôle est
> proche, **mais ce n'est PAS le skill nommé** et son contenu n'a pas la même autorité.

| Skill attendu | Présent ? | Preuve | Analogue réel le plus proche |
|---|---|---|---|
| **Emil Kowalski** (craft animation/interaction) | ❌ ABSENT | grep + inventaire | `design-critique` (partiel), aucun équivalent sur l'animation/motion |
| **Taste** (goût visuel) | ❌ ABSENT | grep + inventaire | `design-critique` + `design-system` |
| **Impeccable** (barre de finition) | ❌ ABSENT | grep + inventaire | `design-critique` + `accessibility-review` |
| **Product Thinking** | ❌ ABSENT | grep + inventaire | `user-research` + `research-synthesis` |
| **Clean Code** | ❌ ABSENT | grep + inventaire | `code-review` |
| **Test** (tests écrits & passants) | ❌ ABSENT | grep + inventaire | `testing-strategy` (⚠ *stratégie*, pas « écrire des tests verts ») |

**Lecture importante :** ces analogues sont des skills génériques de plugins « rpm »
(design/engineering), pas les skills d'auteur signés (Emil Kowalski, etc.). Les prendre
pour les skills nommés serait une invention. Je ne le fais pas.

---

## 3. Inventaire réel (cache Claude Desktop — non actif dans ce CLI)

Tous sous `…\AppData\Roaming\Claude\local-agent-mode-sessions\…\skills\`.

**Skills EMOPET sur-mesure (authored pour ce projet — pertinents en esprit) :**
- `emopet-system-architect`, `emopet-system-auditor`, `emopet-style-compiler`,
  `emopet-scientific-writer`, `emopet-sensor-engineer`, `emopet-textile-engineer`

**Plugin « engineering » (rpm) :** `architecture`, `code-review`, `debug`,
`deploy-checklist`, `documentation`, `incident-response`, `standup`, `system-design`,
`tech-debt`, `testing-strategy`

**Plugin « design » (rpm) :** `accessibility-review`, `design-critique`,
`design-handoff`, `design-system`, `research-synthesis`, `user-research`, `ux-copy`

**Plugin « research » (rpm) :** `digest`, `knowledge-synthesis`, `search`,
`search-strategy`, `source-management`

**Skills documents (Anthropic) :** `pdf`, `docx`, `pptx`, `xlsx`
**Cowork / utilitaires :** `skill-creator`, `mcp-builder`, `canvas-design`, `learn`,
`schedule`, `setup-cowork`, `consolidate-memory`, `create-cowork-plugin`,
`cowork-plugin-customizer`
**Plugins tiers (hors sujet ici) :** Sanity (`sanity-*`, `portable-text-*`, …), Wix (`wix-*`)

---

## 4. Fiches des analogues réellement lus (autorité réelle, à défaut des six)

### 4.1 `code-review` — analogue de « Clean Code »
- **Rôle :** revue de diff/PR sous 4 angles.
- **Standards :** Sécurité (injection, authz, secrets, SSRF, path traversal) ; Performance
  (N+1, complexité O(n²) en hot path, fuites, requêtes non bornées) ; Correctness (cas
  limites null/empty/overflow, races, propagation d'erreurs, type safety) ; Maintenabilité
  (nommage, responsabilité unique, duplication, couverture, doc du non-évident).
- **Critère de validation propre :** sortie = tableau *Critical Issues* + *Suggestions*
  (avec sévérité) + *What Looks Good* + **Verdict** (Approve / Request Changes / Discuss).

### 4.2 `testing-strategy` — analogue de « Test »
- **Rôle :** concevoir une stratégie/plan de test (pas un exécuteur de tests).
- **Standards :** pyramide (beaucoup d'unitaires rapides → quelques E2E lents) ; stratégie
  par type de composant ; **couvrir** chemins critiques métier, gestion d'erreurs, cas
  limites, frontières de sécurité, intégrité données ; **ignorer** getters triviaux, code
  framework, scripts jetables.
- **Critère propre :** livrable = plan de test (quoi tester, type, cibles de couverture,
  cas d'exemple) + identification des trous de couverture.
- ⚠ **Écart vs le protocole** : le protocole exige « tests écrits ET passants » ; ce skill
  ne définit que la *stratégie*. La barre « verte » du protocole reste à tenir par moi.

### 4.3 `design-critique` — analogue de « Taste » / « Impeccable »
- **Rôle :** feedback design structuré.
- **Standards / grille :** (1) Première impression 2 s ; (2) Utilisabilité ; (3) Hiérarchie
  visuelle (ordre de lecture, emphase, whitespace, typo) ; (4) Cohérence avec le design
  system ; (5) Accessibilité (contraste, cibles tactiles, lisibilité).
- **Critère propre :** sortie = impression globale + tableaux Usability/Hierarchy/
  Consistency/A11y avec sévérité 🔴🟡🟢 + « What Works Well » + 3 recommandations priorisées.

### 4.4 `design-system` — support de « Taste »
- **Rôle :** auditer / documenter / étendre un design system.
- **Standards :** tokens (couleur, typo, espacement, bordures, ombres, motion) ; composants
  (variants, états default/hover/active/disabled/loading/error, tailles, a11y) ; patterns.
  Principes : cohérence > créativité ; flexibilité sous contrainte ; tout documenter ;
  versionner + migrer.
- **Critère propre :** audit chiffré (composants revus, issues, score /100 ; couverture de
  tokens vs valeurs en dur ; complétude par composant).

### 4.5 `ux-copy` — support du vocabulaire (clé pour EMOPET)
- **Rôle :** écrire/réviser microcopie, erreurs, empty states, CTA.
- **Standards :** Clair, Concis, Cohérent, Utile, Humain. CTA = verbe + spécifique. Erreur =
  quoi + pourquoi + comment réparer. Empty state = quoi + pourquoi vide + comment démarrer.
- **Critère propre :** copy recommandée + alternatives (ton, usage) + rationale + notes de
  localisation. **Synergie forte avec les garde-fous EMOPET** (vocabulaire prudent/factuel).

### 4.6 `accessibility-review` — support de « Impeccable »
- **Rôle :** audit WCAG 2.1 AA.
- **Standards :** contraste ≥ 4.5:1 (texte normal) / 3:1 (grand) ; tout au clavier ; focus
  visible + ordre logique ; cible tactile ≥ 44×44 px ; name/role/value (ARIA) ; labels de
  formulaire ; alt text.
- **Critère propre :** audit par principe POUR (Perceivable/Operable/Understandable/Robust)
  + table de contraste + navigation clavier + lecteur d'écran + fixes priorisés.

### 4.7 `user-research` — analogue de « Product Thinking »
- **Rôle :** planifier/mener/synthétiser la recherche utilisateur.
- **Standards :** choix de méthode selon le besoin (interviews 5-8, usability 5-8, survey
  100+, card sorting, diary, A/B) ; guide d'entretien en 5 temps ; analyse par affinity
  mapping / impact-effort / journey / **Jobs To Be Done**.
- **Critère propre :** plan de recherche + guide + rapport de synthèse (thèmes, insights,
  recommandations).

### 4.8 `emopet-system-auditor` (skill maison — bonus, vraiment pertinent)
- **Rôle :** auditeur deeptech : challenge le système, ne résume pas.
- **Standards :** validité scientifique, faisabilité physique, réalisme textile, fiabilité
  capteurs, intégration, réalité d'usage, modes de défaillance (« qu'est-ce qui casse
  d'abord ? qu'est-ce qui échoue silencieusement ? »).
- **Critère propre :** audit structuré = faiblesses critiques + risques majeurs +
  hypothèses cachées + priorités d'amélioration.

---

## 5. Conflits entre skills

1. **« Test » (protocole) vs `testing-strategy` (réel).** Le protocole veut des tests
   *écrits et verts* à chaque étape ; le skill réel ne définit qu'une *stratégie*. → La
   barre exécutable (typecheck + lint + test + build verts) reste portée par moi, pas par
   un skill. Pas de skill « exécute et fais passer les tests » sur disque.
2. **Skills design (`design-critique`, `ux-copy`) vs garde-fous EMOPET.** `ux-copy`
   encourage un ton « célébrateur » sur les succès ; EMOPET interdit l'anthropomorphisation
   et la gamification émotionnelle. → **Garde-fous EMOPET priment** (consigne explicite :
   « priment sur tout, y compris les skills esthétiques »).
3. **Aucun conflit entre analogues eux-mêmes** (angles complémentaires : code/test/design/
   a11y/copy/research).
4. **Conflit de plateforme :** ces skills vivent dans le cache **Desktop**, pas dans ce CLI
   → ils ne se déclenchent pas automatiquement ici ; je les appliquerais « à la main » en
   suivant leurs grilles.

**Ordre de priorité retenu (consigne) en cas de conflit :**
Garde-fous produit EMOPET → **Qualité produit > UX > Maintenabilité > Rapidité**. Tout
arbitrage sera explicité (quel conflit, quel principe gagne, pourquoi).

---

## 6. Résumé & impact sur le protocole

- ✅ Découverte faite, traçable, sans invention.
- ❌ **Bloquant :** la « grille de validation » du protocole référence six SKILL.md qui
  **n'existent pas ici**. Je ne peux pas cocher « selon son SKILL.md » pour Emil Kowalski /
  Taste / Impeccable / Product Thinking / Clean Code / Test sans fabriquer leur contenu —
  ce que la consigne interdit.
- ✅ **Alternatives réelles disponibles** : 7 analogues lus (code-review, testing-strategy,
  design-critique, design-system, ux-copy, accessibility-review, user-research) + skills
  EMOPET maison. Leurs grilles sont citées ci-dessus et peuvent servir de critères réels.
- ✅ Les **garde-fous produit EMOPET** et l'**ordre de priorité** sont, eux, parfaitement
  applicables (ils ne dépendent d'aucun skill manquant).

---

## 7. Décision retenue (2026-06-16)

Après la pause de validation, instruction « continue » donnée alors que les six skills
restent non installés (re-vérifié : pas de `.claude/skills/`, 0 occurrence). **Chemin
adopté : option 2 — les analogues réels installés servent de standards opératoires**,
mappés explicitement aux six standards visés, augmentés des skills EMOPET maison.

Règles de l'application :
- **Garde-fous produit EMOPET et ordre de priorité priment** sur tout skill esthétique.
- Je ne **coche jamais** « selon son SKILL.md » pour Emil Kowalski / Taste / Impeccable /
  Product Thinking / Clean Code / Test : ces fichiers n'existent pas. Je cite à la place le
  **vrai** skill analogue appliqué (`code-review`, `testing-strategy`, `design-critique`,
  `design-system`, `ux-copy`, `accessibility-review`, `user-research`).
- Toute extension de couverture (ex. liste de termes interdits) est **vérifiée par
  exécution** (scan + barre verte), jamais devinée.
- Étapes atomiques ; après chaque étape : typecheck + lint + test + vocab + build verts.

> Si tu installes les vrais skills plus tard (`npx skills add …`) ou colles leurs SKILL.md,
> je relance la Phase 0 et bascule sur l'option 1 (autorité des vrais contenus).

### Journal d'application
| Étape | Standards appliqués (réels) | Statut |
|---|---|---|
| 01 — Durcir l'outil de garde-fou vocabulaire (`vocab-audit`) : source unique testable (`scripts/forbidden-vocab.mjs`) + 6 tests + couverture élargie (anthropomorphisation + claims médicaux, précision avant rappel) | `code-review`, `testing-strategy` + garde-fous EMOPET | ✅ fait — typecheck 0, lint 0, test 90/90, vocab 0, build OK |
| 02 — Élargir la couverture (émotion attribuée au chien, scoring émotionnel) **avec ALLOWLIST** neutralisant disclaimers/négations (« ne mesure pas l'anxiété »). Bug corrigé : `\b` cassé après accents (é) → frontière `END` accent-sûre, prouvée par test | `code-review`, `testing-strategy` + garde-fous EMOPET | ✅ fait — typecheck 0, lint 0, test 91/91, vocab 0, build OK |
| 03 — Orchestrateur de barre verte `scripts/verify.mjs` : `pnpm verify` (complet) + `pnpm check` (rapide, sans build). Séquence, stoppe à la 1ʳᵉ rouge, récap par étape. Délègue aux scripts existants (DRY) | `code-review` (vérif reproductible) | ✅ fait — `pnpm verify` : 5/5 vert (typecheck/lint/test/vocab/build) |
| 04 — Contraste WCAG AA des boutons (rebrand) : encre **navy** au lieu de blanc sur orange/teal — **couleurs de marque inchangées**. accent 3.28→**4.54**, accent2 2.48→**6.01** ; 6 états (rest/hover/press) ≥4.5 prouvés. Fix au niveau token (`--accent-ink`/`--accent-2-ink`) → répare aussi le bouton d'envoi du dock | `accessibility-review` (WCAG 1.4.3), `design-system` (token), `code-review` | ✅ vérifié — contraste math 6/6, couleur runtime navy confirmée (preview_inspect), `pnpm verify` 5/5 |
| 05 — Focus clavier visible + labels (WCAG 2.4.7 / 4.1.2) : `outline:none` inline retiré sur **5 champs réels** (breiz, dock, FciBreedSelect, donnees/modals, LocalKnowledgePanel) → l'anneau `:focus-visible` global (déjà défini) s'applique enfin ; `aria-label` ajouté au champ `/breiz`. Off-nav `mobile-preview` laissé tel quel | `web-design-guidelines` (2.4.7), `impeccable`, `accessibility-review` | ✅ vérifié — règle `:focus-visible` live dans le bundle, `outline:none` résiduel = mobile-preview uniquement, `pnpm verify` 5/5 |
| 06 — Noms accessibles des champs restants (WCAG 4.1.2 / 3.3.2) : `aria-label` sur la recherche `LocalKnowledgePanel` et le champ de confirmation `donnees/modals`. `FciBreedSelect` laissé (déjà dans un `<label>` visible — éviter le « label in name » §2.5.3) | `web-design-guidelines`, `accessibility-review` | ✅ `pnpm verify` 5/5 |
| 07 — Contraste du **texte atténué** (WCAG 1.4.3) : `--fg-muted` décroché de la grise de marque → **#61656C** (4.43→**5.14** sur cream, ≥4.5 sur surface/sunk) ; grise de marque inchangée. `--fg-hint` gardé comme palier désactivé/décoratif (exempt) ; seul le texte réel mal placé (« X min ») repassé en `--fg-muted` | `accessibility-review`, `design-system` | ✅ `pnpm verify` 5/5 |
| 08 — Contraste de **l'anneau de focus** (WCAG 1.4.11 / 2.4.11) : `:focus-visible` passe du mix orange 40 % (~1.3:1 sur cream, échec) à `--accent-press` (#C2350F, **4.83:1**), solide, on-brand | `accessibility-review`, `web-design-guidelines` | ✅ `pnpm verify` 5/5 |

### Bilan passe accessibilité (WCAG 2.1 AA) — étapes 04→08
- ✅ Contraste boutons (1.4.3) · ✅ focus clavier visible (2.4.7) · ✅ noms de champs (4.1.2/3.3.2)
  · ✅ contraste texte atténué (1.4.3) · ✅ contraste de l'anneau de focus (1.4.11).
- **Non-text 1.4.11 (bordures teal/orange)** : pas d'action — usages = data-viz (jauges/points
  de légende/barres, accompagnés de libellés chiffrés) + fonds de chips décoratifs (texte
  `lichen-700` interne conforme 4.61:1), tous exemptés.
- Marque préservée partout (navy/orange/teal/cream, Sora, logo) ; garde-fous EMOPET intacts.
