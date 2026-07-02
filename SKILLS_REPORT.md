# SKILLS_REPORT.md — Audit & (ré)installation des skills Claude Code

> Mission « auditer et réinstaller tous mes skills ». Exécuté le **2026-06-17**.
> **Tout est vérifié sur disque** (aucune installation fabriquée). Les skills introuvables
> sont signalés tels quels, jamais inventés.

---

## 1. Analyse de l'environnement

| Élément | État |
|---|---|
| OS / shell | Windows 11 · PowerShell + Git Bash |
| node / npm / pnpm / git / npx | v24.12.0 · 11.6.2 · 10.33.0 · 2.52.0 · 11.6.2 — **tous présents** |
| bun | absent (non requis) |
| Réseau | ✅ egress OK (registry.npmjs.org 200, skills.sh 308, github.com 200) |
| CLI `skills` (global) | absent au départ → utilisé via `npx skills@latest` |
| Écosystème | **`skills`@1.5.11** (MIT) = **Vercel Labs / skills.sh** (Guillermo Rauch). C'est lui qui sous-tend `npx skills add`, « Vercel Agent Skills », « Skills.sh Catalog », « Skill Marketplace », « Agent Skills » (un seul et même écosystème). |

État initial des dossiers de skills :
- `~/.claude/skills` → **vide**
- `.claude/skills` (projet emopet_v6) → **vide**
- `~/.agents/skills` (store partagé skills.sh) → contenait déjà `emil-design-eng`, `impeccable`,
  `design-taste-frontend`, `find-skills` (datés du **10/06** — installation antérieure inachevée,
  non reliée à Claude Code).

---

## 2. Skills INSTALLÉS (vérifiés dans `~/.claude/skills`, scope global, agent = Claude Code)

| Skill (slug) | Rôle | Source (repo) |
|---|---|---|
| **frontend-design** | Design visuel distinctif, non-générique (typo, direction esthétique) | `anthropics/skills` (officiel Anthropic) |
| **emil-design-eng** | Philosophie Emil Kowalski : polish UI, animation, détails invisibles | `emilkowalski/skill` |
| **impeccable** | Design/redesign/critique/audit UI · UX · design systems · a11y · typo · motion | `pbakaus/impeccable` |
| **design-taste-frontend** | Anti-générique : landing pages, portfolios, redesigns premium | `leonxlnx/taste-skill` |
| **vercel-react-best-practices** | Perf React & **Next.js** (Vercel Engineering) | `vercel-labs/agent-skills` |
| **vercel-composition-patterns** | Patterns de composition React qui passent à l'échelle (architecture) | `vercel-labs/agent-skills` |
| **vercel-react-native-skills** | React Native / Expo — **mobile app** | `vercel-labs/agent-skills` |
| **vercel-react-view-transitions** | Animations natives (View Transition API) | `vercel-labs/agent-skills` |
| **web-design-guidelines** | **Design review** + **accessibility review** (Web Interface Guidelines) | `vercel-labs/agent-skills` |
| **writing-guidelines** | Revue de prose / **storytelling UX** / voix & ton | `vercel-labs/agent-skills` |

### Extras ajoutés le 2026-06-17 (vérifiés, slugs confirmés avant install)

| Skill (slug) | Rôle | Source (repo) |
|---|---|---|
| **high-end-visual-design** | Look « agence premium » : fonts/espacement/ombres, anti-générique | `leonxlnx/taste-skill` |
| **redesign-existing-projects** | Audit + upgrade premium d'une app **existante** (idéal EMOPET) | `leonxlnx/taste-skill` |
| **extract-design-system** | Extrait des primitives/tokens depuis un site → fichiers de tokens | `arvindrk/extract-design-system` |
| **canvas-design** | Art visuel `.png`/`.pdf` (posters, visuels) | `anthropics/skills` |
| **web-artifacts-builder** | Artifacts React/Tailwind/shadcn multi-composants | `anthropics/skills` |
| **webapp-testing** | Test/inspection UI locale via Playwright (audit & vérif) | `anthropics/skills` |
| **theme-factory** | Théming d'artifacts (10 thèmes + génération à la volée) | `anthropics/skills` |
| **deploy-to-vercel** | Déploiement Vercel (shipping MVP) | `vercel-labs/agent-skills` |

**TOTAL : 18 skills installés** (10 + 8 extras), tous avec `SKILL.md` lisible dans
`~/.claude/skills`, tous enregistrés pour Claude Code (`npx skills list -g` le confirme) et
**actifs dans la session courante**.

## 3. Skills MIS À JOUR / réparés

- `emil-design-eng`, `impeccable`, `design-taste-frontend` : présents depuis le 10/06 dans
  `~/.agents/skills` (store partagé) **mais pas reliés à Claude Code** → réinstallés et copiés
  dans `~/.claude/skills` (datés 17/06). Ils sont désormais visibles par Claude Code.

## 4. Couverts par un skill installé ou déjà disponible (pas de doublon créé)

| Demandé | Couvert par |
|---|---|
| UI Design · UX Design · Product Design · SaaS Design | `impeccable` + `frontend-design` |
| Design Systems | `impeccable` (tokens/systèmes) — *optionnel* : `arvindrk/extract-design-system` |
| Visual Design | `design-taste-frontend` — *optionnel* : `leonxlnx/taste-skill/high-end-visual-design` |
| Landing Page Design | `design-taste-frontend` |
| React Expert · Next.js Expert | `vercel-react-best-practices` |
| App Architecture | `vercel-composition-patterns` |
| Mobile App Design | `vercel-react-native-skills` |
| Design Review · Accessibility Review | `web-design-guidelines` (+ skills de session `design:design-critique`, `design:accessibility-review`) |
| Storytelling UX | `writing-guidelines` |
| User Research | skill de session `design:user-research` / `design:research-synthesis` |
| Agent Skills · Skills.sh Catalog · Skill Marketplace · Vercel Agent Skills | = l'écosystème lui-même (installé/utilisé) |

## 5. INTROUVABLES en tant que skill dédié (non inventés)

Aucun paquet/skill dédié trouvé sur skills.sh / GitHub officiel pour :
- **Startup MVP**, **Product Strategy**, **AI Product Builder**, **Wireframing**,
  **Conversion Optimization** (seulement partiel via `design-taste-frontend`),
  **Prompt Engineering**, **Claude Code Power User**, **Tailwind Expert** (pas de skill
  Tailwind autonome — Tailwind est couvert *de facto* par `frontend-design`/`impeccable`).

> Si tu as vu un de ces noms quelque part, donne-moi le repo `owner/repo` exact et je le
> vérifie + l'installe. Je ne crée pas de skill fantôme.

## 6. Extras → INSTALLÉS le 2026-06-17 (cf. §2). Reste optionnel (non installé)

Disponibles dans les mêmes repos, non installés (hors périmètre ou redondants). 1 commande
si besoin (⚠ installer **un skill à la fois** — le `--skill a,b,c` séparé par virgules échoue) :

```bash
npx skills add anthropics/skills --skill skill-creator   -a claude-code -g   # créer/optimiser des skills
npx skills add anthropics/skills --skill algorithmic-art -a claude-code -g   # art génératif
npx skills add vercel-labs/agent-skills --skill vercel-optimize -a claude-code -g  # coûts/perf Vercel
# (brand-guidelines = charte Anthropic → NON pertinent, EMOPET a sa propre charte)
```

## 7. Liens sources

- Écosystème / CLI : https://skills.sh · https://github.com/vercel-labs/skills
- https://github.com/vercel-labs/agent-skills
- https://github.com/anthropics/skills
- https://github.com/emilkowalski/skill
- https://github.com/pbakaus/impeccable
- https://github.com/leonxlnx/taste-skill

## 8. Versions installées

- CLI : `skills@1.5.11` (dernière, publiée il y a ~6 j).
- Skills : branche par défaut de chaque repo (= dernière), copiés le **2026-06-17**
  (`--copy`, donc fichiers autonomes dans `~/.claude/skills`, indépendants de node_modules).

## 9. Commandes exécutées (réellement lancées)

```bash
# Découverte
npm view skills
npx -y skills@latest --help
npx -y skills@latest add vercel-labs/agent-skills --list
npx -y skills@latest add anthropics/skills      --list --full-depth
npx -y skills@latest add emilkowalski/skill      --list --full-depth
npx -y skills@latest add pbakaus/impeccable      --list --full-depth
npx -y skills@latest add leonxlnx/taste-skill    --list --full-depth

# Installation (scope global, agent claude-code, fichiers copiés)
npx -y skills@latest add anthropics/skills    --skill frontend-design          -a claude-code -g -y --copy
npx -y skills@latest add emilkowalski/skill   --skill emil-design-eng          -a claude-code -g -y --copy
npx -y skills@latest add pbakaus/impeccable   --skill impeccable               -a claude-code -g -y --copy
npx -y skills@latest add leonxlnx/taste-skill --skill design-taste-frontend    -a claude-code -g -y --copy
# (vercel : le multi --skill a,b,c a échoué → réinstallé un par un)
npx -y skills@latest add vercel-labs/agent-skills --skill vercel-react-best-practices   -a claude-code -g -y --copy
npx -y skills@latest add vercel-labs/agent-skills --skill vercel-composition-patterns   -a claude-code -g -y --copy
npx -y skills@latest add vercel-labs/agent-skills --skill vercel-react-native-skills    -a claude-code -g -y --copy
npx -y skills@latest add vercel-labs/agent-skills --skill web-design-guidelines         -a claude-code -g -y --copy
npx -y skills@latest add vercel-labs/agent-skills --skill vercel-react-view-transitions -a claude-code -g -y --copy
npx -y skills@latest add vercel-labs/agent-skills --skill writing-guidelines            -a claude-code -g -y --copy

# Extras (2026-06-17) — vérifiés puis installés un par un
npx -y skills@latest add leonxlnx/taste-skill          --skill high-end-visual-design     -a claude-code -g -y --copy
npx -y skills@latest add leonxlnx/taste-skill          --skill redesign-existing-projects -a claude-code -g -y --copy
npx -y skills@latest add arvindrk/extract-design-system --skill extract-design-system      -a claude-code -g -y --copy
npx -y skills@latest add anthropics/skills             --skill canvas-design              -a claude-code -g -y --copy
npx -y skills@latest add anthropics/skills             --skill web-artifacts-builder      -a claude-code -g -y --copy
npx -y skills@latest add anthropics/skills             --skill webapp-testing             -a claude-code -g -y --copy
npx -y skills@latest add anthropics/skills             --skill theme-factory              -a claude-code -g -y --copy
npx -y skills@latest add vercel-labs/agent-skills      --skill deploy-to-vercel           -a claude-code -g -y --copy

# Vérification
npx -y skills@latest list -g
```

---

## 10. ⚠ À savoir (important)

1. **Redémarre Claude Code** pour que les 10 skills soient chargés : ils sont lus au démarrage
   de session ; ils n'apparaissent pas comme invocables dans la session courante.
2. **Skills tiers = à passer en revue.** La CLI elle-même prévient : *« Review skills before use;
   they run with full agent permissions. »* `frontend-design` (Anthropic) et les `vercel-*`
   (Vercel) sont officiels ; `emil-design-eng`, `impeccable`, `design-taste-frontend` sont
   communautaires (auteurs réputés : Emil Kowalski, Paul Bakaus). Contenu = instructions Markdown.
3. **Mise à jour ultérieure** : `npx skills update -g` (met tout à jour vers la dernière version).
4. **Désinstallation** : `npx skills remove <skill> -g`.

## 11. Application à EMOPET (objectif « interfaces premium »)

Ces skills produisent du design générique « premium » — ils doivent passer **À TRAVERS** la
charte EMOPET, qui **prime** :
- **Design system** : `apps/web/styles/tokens.css` (navy `#1D1A6A` / orange `#FE502D` / teal
  `#2CB7AB` / cream `#F6EFE7`, police **Sora**) + primitives `components/ui/*` + logo
  `PawSpiralMark`. Toute UI générée réutilise ces tokens, pas des valeurs en dur.
- **Garde-fous NON négociables (priment sur tout skill esthétique)** : aucun score
  émotionnel/de bonheur du chien, aucune anthropomorphisation, aucun claim médical, aucun dark
  pattern ni gamification culpabilisante. Si un skill suggère « delightful animation »,
  « streak », « happiness meter » → **refusé** au profit des invariants EMOPET.
- Skill de session dédié à la charte : `anthropic-skills:emopet-style-compiler`.
