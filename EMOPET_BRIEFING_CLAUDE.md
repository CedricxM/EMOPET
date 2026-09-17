# EMOPET — Briefing dépôt pour une instance sans accès au code

Document de synthèse produit par lecture du dépôt Git local `/home/user/EMOPET`.
Instantané : commit `c099581` du 2026-08-31 (identique sur `main`, `origin/main`
et la branche de travail `claude/emopet-repo-synthesis-12kxl1`).

Convention : **CONSTATÉ** = vérifié dans un fichier cité. **SUPPOSÉ** = déduction.
**NON TROUVÉ** = recherché sans résultat. Aucun build, install ou test n'a été
exécuté ; `node_modules` est absent, donc aucune affirmation de ce document ne
constitue une preuve de compilation ou de passage des tests.

---

## 1. Cartographie

### 1.1 Arborescence racine (CONSTATÉ)

| Dossier | Rôle observé |
|---|---|
| `apps/web/` | Next.js 15 / React 19, port 3100. 342 fichiers (~58 % du dépôt) : pages, composants, primitives UI, Route Handlers `app/api/**`, couche `lib/` (données, RAG, i18n, moteur de contexte). |
| `apps/mobile/` | Application Expo 52 / React Native 0.76 / React 18 (`expo-router`). 64 fichiers. |
| `backend/` | API Hono 4 + TypeScript (`backend/api`), schémas Drizzle/PostgreSQL, migrations et seeds (`backend/db`), tests `node:test` (`backend/test`). |
| `packages/` | 4 paquets partagés : `shared` (types + Zod), `eli-engine` (EKF, RSM, vetos), `ble-protocol` (trames MAT/TAG), `ai-personality` (moteur de contenu « Bleiz »). |
| `firmware/` | 7 fichiers seulement : 3 modules capteurs en C + un en-tête de version. |
| `docs/` | 48 fichiers Markdown répartis en 12 sous-dossiers thématiques (compliance, control, privacy, security, api-layer, scientific_basis…). |
| `data/` | Données de référence et démo. 41 Mo, dominé par `data/vbo/vbo.json` (38 Mo). |
| `config/` | Deux fichiers JSON : `config/compliance/hardware-decisions.json`, `config/privacy/data-inventory.json`. |
| `scripts/`, `tools/` | Utilitaires d'ingestion (TS), `scripts/init_db.sh`, `tools/security/evaluate-pnpm-audit.mjs`. |
| `.github/` | 2 workflows + `dependabot.yml` + un modèle de PR. |

### 1.2 Stack (CONSTATÉ)

- Monorepo **pnpm 10.33.0** + **Turbo 2** (`pnpm-workspace.yaml`, `turbo.json`, `package.json`). Node ≥ 20.
- Web : Next.js ^15.5.21, React ^19, HeroUI ^3, Tailwind ^4, `mapbox-gl` ^3.24, `animejs`.
- Mobile : Expo ~52, RN ~0.76, `react-native-ble-plx`, `zustand`, TanStack Query.
- Backend : Hono ^4.12, `@hono/zod-validator`, `drizzle-orm` ^0.45, `postgres`, `jose` (JWT).
- Firmware : C, sans système de build (**NON TROUVÉ** : `CMakeLists.txt`, `platformio.ini`, `sdkconfig`).
- Tests : `vitest` (eli-engine), `node --test` (web via `apps/web/scripts/run-tests.mjs`, backend, ai-personality).
- CI : uniquement `.github/workflows/security-supply-chain.yml` (audit pnpm, Semgrep, CodeQL, SBOM, secret scan, provenance) et `p0-db-baseline.yml` (validation Drizzle sur PostgreSQL 16 jetable). **Aucun workflow de lint / typecheck / build / test applicatif** n'existe.
- `pnpm-workspace.yaml` contient un durcissement notable : `minimumReleaseAge: 10080`, `blockExoticSubdeps: true`, `trustPolicy: no-downgrade` et ~20 `overrides` de versions.

### 1.3 Volumétrie (CONSTATÉ)

586 fichiers suivis par Git ; 62 Mo hors `.git` ; `.git` = 16 Mo.
Extensions : 280 `.ts`, 122 `.tsx`, 81 `.md`, 31 `.json`, 16 `.mjs`, 8 `.sql`, 7 `.css`, 4 `.h`, 3 `.c`.
Lignes : ~49 000 en `.ts`, ~21 000 en `.tsx`, ~7 900 en `.md`, ~2 400 en `.sql`, 381 en C.

Langue : les textes d'interface et une partie des commentaires sont en français ;
la documentation racine (README, ARCHITECTURE, SECURITY*) et la majorité des
commentaires de code sont en anglais. Comptage heuristique par fichier :
52 Markdown à dominante anglaise contre 29 à dominante française ; sur les
400 premiers fichiers TS/TSX, 316 anglais contre 84 français. Le dépôt est donc
**bilingue et non homogène** (CONSTATÉ).

---

## 2. Le produit

EMOPET est présenté (`CLAUDE.md`, `README.md`) comme un dispositif **non médical**
de monitoring du bien-être canin : un tapis instrumenté (**MAT** : PVDF, IMU,
cellules de charge, BME280) et un collier (**TAG** : IMU, micro, piezo, NTC),
un moteur d'inférence **ELI**, une application companion **Breiz AI**, le tout
opéré depuis Lorient (Bretagne).

### 2.1 Sous-systèmes et état réel

**MAT / TAG (firmware)** — État réel : embryonnaire. Trois modules capteurs
existent : `firmware/mat/main/sensors/rr_variability.c` (79 l.),
`firmware/collar/main/sensors/activity_variability.c` (64 l.),
`firmware/collar/main/sensors/tremor_detector.c` (81 l.), plus
`firmware/FIRMWARE_VERSION.h` qui déclare la version 6.0.0. Il n'y a **ni boucle
principale, ni pilote capteur, ni pile BLE, ni build**. `docs/firmware_protocol.md`
décrit un protocole complet et signale lui-même un défaut connu de `#define`
mal placé dans `rr_variability.c`. Écart : le `CHANGELOG.md` annonce un
« Firmware 6.0.0 » comme livré ; le dépôt ne contient que trois modules de calcul.

**ELI (moteur d'inférence)** — 2 392 lignes dans `packages/eli-engine/src` :
EKF 3D (`ekf/`, état arousal/valence/load, seuils de publication 0.70 / dégradation
0.40), machine d'état de fiabilité par capteur (`rsm/index.ts`), baselines,
vetos (285 l.), trackers de récupération et d'anticipation, 6 suites de tests
Vitest. C'est la partie la plus soignée du dépôt. **Écart majeur (CONSTATÉ)** :
`@emopet/eli-engine` est déclaré en dépendance de `backend` et `apps/web` mais
n'est **importé nulle part**. Les seules occurrences hors `package.json` sont
`apps/web/next.config.mjs` (transpilePackages) et un commentaire dans
`apps/web/lib/eli/catalog.ts`. Le web dispose de sa propre implémentation
parallèle (`apps/web/lib/eli/`, dont `mock.ts` et `breed-aware-interpretation.ts`).
Le moteur canonique est donc un îlot non branché.

**Plateforme (backend)** — `backend/api/index.ts` monte 8 groupes de routes
derrière un middleware JWT et un rate-limit. Mais `backend/api/routes/auth.ts`
laisse `register`, `login` et `refresh` en `TODO` retournant des objets factices,
et `routes/sensors.ts` laisse en `TODO` l'ingestion de télémétrie, l'historique
ELI et les baselines. Autrement dit **la chaîne capteur → base → ELI n'existe pas**.
15 marqueurs `TODO` au total dans le code applicatif.
Persistance : trois chemins coexistent — schémas Drizzle/PostgreSQL, stores
mémoire côté backend, et un store JSON `apps/web/.data/` piloté par les Route
Handlers Next.js, avec replis `localStorage`. `README.md` qualifie lui-même les
deux derniers de « prototype paths ». Les migrations sont marquées `BLOCKED`
(voir §3).

**Breiz (assistant régional + couche régionale)** — Réellement implémenté côté
web : `apps/web/app/api/breiz/route.ts` construit un prompt système régional,
appelle l'API Anthropic si `ANTHROPIC_API_KEY` est présent, sinon signale un
repli RAG local (`apps/web/lib/breiz-rag/`). Métadonnées de transparence IA
émises à chaque réponse (`aiSystem`, `evidenceLevel`, `medicalStatus:
'non_diagnostic'`). `packages/ai-personality` fournit ~9 600 lignes de gabarits
de contenu « Bleiz » avec garde-fous (`required_fields`, budgets anti-spam,
`never_say`). Un registre de sources bretonnes existe
(`apps/web/lib/data/breiz/sourceRegistry.ts`) mais **la quasi-totalité des
entrées ont `license: null`**.

**World** — `apps/web/app/world/page.tsx` + `apps/web/components/world/`
(WorldBuilder, ResourceBar, BuildInventory, WorldScene). C'est un module de
construction avec ressources, coûts et quêtes, alimenté par `lib/mock-world.ts`.
**Aucun projet Unity ni intégration Nakama** dans le dépôt (**NON TROUVÉ**), ce
que `README.md` et `docs/APP_OVERVIEW.md` déclarent explicitement comme
`ABSENT_IN_REPOSITORY / GATED`.

**Mobile** — 64 fichiers, écrans `(auth)`, `(tabs)`, réglages. `src/services/ble.ts`
est un stub (`TODO: implement with BleManager`). Le mobile utilise encore la
typographie **Fraunces / Source Sans 3** (`apps/mobile/src/components/ui/text.tsx`,
paquets `@expo-google-fonts/*`) alors que le web est passé à **Sora**
(`apps/web/styles/tokens.css`). Divergence de charte constatée entre les deux apps.

### 2.2 Écarts documentation / code les plus nets (CONSTATÉ)

1. `README.md` affirme « No GitHub Actions … observed → `OPEN` » alors que deux
   workflows existent depuis le commit `5201565`.
2. `README.md` avertit que `docker-compose.yml` et `scripts/init_db.sh`
   « référencent encore la stack Python/FastAPI/Alembic » ; ces deux fichiers ont
   été réécrits (commit `25a334a`) et ne contiennent plus rien de tel.
3. `docs/DEMO.md` reste intégralement obsolète : Alembic, Uvicorn, Streamlit,
   `flutter run`, `scripts/ingest_fci_pdf.py` (script **NON TROUVÉ**).
4. `docs/scientific_basis/Choix_des_seuils/physiology_reference.md` renvoie à
   `src/api/schemas.py` et `src/processing/fusion_module.py`, chemins inexistants.
5. `docs/api-layer/API_PROVIDER_MATRIX.md` recense **79 providers** ; seuls
   **12 adaptateurs** existent dans `apps/web/lib/api/adapters/`.
6. `CLAUDE.md` interdit toute gamification ; `apps/web/lib/gamification.ts`,
   `apps/web/components/gamification/index.tsx` (badges, médaillons, niveaux) et
   le module World l'implémentent. `CLAUDE.md` signale lui-même ce conflit et
   demande de ne pas le trancher unilatéralement. Un test
   (`apps/web/lib/__tests__/gamification.test.ts`) impose l'invariant « c'est le
   propriétaire qui est gamifié, jamais le chien ».
7. `PROMPT_PROTOTYPE_BRETAGNE.md` décrit une proposition historique explicitement
   déclassée par l'addendum de `CLAUDE.md`.

---

## 3. Système documentaire

**Ce qui existe (CONSTATÉ).** 17 Markdown à la racine et 48 dans `docs/`. Il
existe une convention de **statut en tête de fichier**, entre backticks, par
exemple : `P0 SECURITY INTAKE ACTIVE / PRODUCT NOT RELEASED` (`SECURITY.md`),
`CONTROLLED DRAFT / NOT DPO OR LEGAL SIGN-OFF` (`docs/privacy/DPIA_P0.md`),
`PREPARED / NOT EXECUTED` (`backend/db/DISPOSABLE_POSTGRES_VALIDATION_RUNBOOK.md`),
`P0 CONTROLLED READINESS / NOT CE DECLARATION`
(`docs/compliance/HARDWARE_COMPLIANCE_MATRIX.md`). Un vocabulaire de gates
récurrent est utilisé dans le texte : `OPEN`, `BLOCKED`, `GATED`, `CANDIDATE`,
`TO_CONFIRM`, `NOT PRODUCTION AUTHORITY`.

**Les seules portes numérotées** trouvées sont les gates base de données
`DB-G1` à `DB-G7`, définies dans `backend/db/MIGRATION_BASELINE_RECONCILIATION.md`
et partiellement instrumentées par `.github/workflows/p0-db-baseline.yml` ;
`docs/control/P0_DB_DISPOSABLE_VALIDATION_EVIDENCE.md` en enregistre les preuves,
avec `DB-G6` (upgrade d'une base existante) laissé `OPEN`.

**Ce qui manque (NON TROUVÉ).** Aucune occurrence de nomenclature `M-G*` ou
`T-G*` (gates MAT / TAG) dans le dépôt, aucun numéro de document normalisé,
aucun champ « version de document » ou « package de révision », aucun statut
`RELEASED` sur un document (le mot n'apparaît que dans « NOT CE RELEASED » et
« PRODUCT NOT RELEASED »), aucun `CODEOWNERS`, aucun fichier `LICENSE`.
Si un système documentaire contrôlé M-G/T-G existe, **il est hors dépôt**.

**Périmé / à jour.** À jour : `ARCHITECTURE.md`, `docs/control/*`,
`docs/compliance/*`, `docs/privacy/*`, `docs/security/*`, `backend/db/*.md`
(tous produits ou révisés fin août 2026). Périmé : `docs/DEMO.md`,
`docs/user_manual/*` (qui se signalent eux-mêmes comme obsolètes),
`docs/scientific_basis/*` (renvois Python), les avertissements Docker et CI du
`README.md`. `AUDIT.md` et `SKILLS_REPORT.md` sont des rapports d'outillage
d'agent IA (juin 2026) sans lien avec le produit, versionnés à la racine.

---

## 4. Propriété intellectuelle et contributeurs — SECTION PRIORITAIRE

### 4.1 Auteurs Git — liste exhaustive (CONSTATÉ)

27 commits au total. **Trois identités Git, une seule personne.**

| Auteur | Email | Commits | Première | Dernière | Fichiers principaux |
|---|---|---|---|---|---|
| Cedric Mian | `160498027+CedricxM@users.noreply.github.com` | 25 | 2026-01-14 | 2026-08-31 | tout le dépôt : `README.md` (commit initial), landing `apps/web/components/landing/*`, tokens de marque, puis docs `docs/control|compliance|privacy|security`, CI, `backend/db` |
| Cedric Mian | `cedricmian13@gmail.com` | 1 | 2026-07-02 | 2026-07-02 | merge « Merge GitHub main with local EMOPET baseline » |
| CedricxM | `cedricmian13@gmail.com` | 1 | 2026-07-02 | 2026-07-02 | « Initial EMOPET v6 baseline » — **534 fichiers en un seul commit** |

Committers : `GitHub <noreply@github.com>` sur 16 commits (signature `E`, donc
opérations passées par l'interface / les PR GitHub), l'auteur lui-même sur 11.

**Aucun contributeur autre que le fondateur** n'apparaît dans l'historique.
**NON TROUVÉ** : aucun trailer `Co-Authored-By`, `Signed-off-by`, aucune mention
d'agent IA dans les messages de commit, aucun `CODEOWNERS`, aucune autre branche
distante que `main` et la branche de travail.

**Point critique (CONSTATÉ)** : 534 des 586 fichiers sont arrivés dans le commit
unique `b4966fa` du 2026-07-02. L'historique Git **ne documente donc pas la
genèse** de la quasi-totalité du code (ELI, backend, mobile, firmware, seeds,
docs). Toute question de paternité sur cette masse ne peut pas être tranchée
depuis ce dépôt (SUPPOSÉ : le développement antérieur a eu lieu hors Git ou dans
un autre dépôt).

### 4.2 Traces de tiers (CONSTATÉ)

- **Aucun fichier LICENSE ni en-tête de copyright** dans tout le dépôt. Le code
  est donc, par défaut, « tous droits réservés » sans mention explicite.
- **Assets** : 13 fichiers images versionnés, tous sous `apps/web/public/assets/brand/`
  (logos, `emopet-mat.png`, `emopet-tag.png`, `social-preview.png`,
  `brand-identity*.jpg/webp`) plus `docs/architecture/data_flow_diagram.png`.
  Aucune mention d'auteur, d'agence ou de licence pour ces visuels
  (**NON TROUVÉ**). Aucun modèle 3D, aucun fichier de police versionné.
- **Polices** : le web ne charge aucune police (ni `next/font`, ni `@font-face`,
  ni Google Fonts) — `apps/web/styles/tokens.css` ne fait que nommer « Sora » et
  « JetBrains Mono » avec repli système. Le mobile dépend réellement de
  `@expo-google-fonts/fraunces`, `-jetbrains-mono`, `-source-sans-3` (polices
  sous SIL Open Font License, SUPPOSÉ d'après l'usage standard de ces paquets).
- **Datasets externes déclarés** (`data/registry/real-datasets.json`) : dataset
  IMU comportement chien (Vehkaoja et al., Tampere / Helsinki, DOI
  10.17632/vxhx934tbn.4, CC-BY-4.0) ; dataset posture (Marcato et al., Tyndall /
  UCC, DOI 10.17632/mpph6bmn7g.1, CC-BY-4.0) ; Vertebrate Breed Ontology
  (Monarch Initiative, CC-BY-4.0) ; base médicaments vétérinaires ANMV/Anses
  (CC-BY). Attribution et interdits d'usage renseignés ; `checksumSha256: null`
  partout. Le fichier de 38 Mo `data/vbo/vbo.json` est le VBO effectivement
  versionné — obligation d'attribution CC-BY à honorer dans le produit.
- **OpenStreetMap** : `apps/web/lib/osm-spots.ts` interroge l'API Overpass et
  mentionne « © contributeurs OpenStreetMap (ODbL) ». **ODbL est une licence de
  base de données à partage à l'identique** : tout produit dérivé de la base OSM
  peut être contaminé. L'attribution dans l'UI se limite à une étiquette
  (`MapboxMap.tsx:70`).
- **Point de risque le plus net** : `backend/db/seeds/local-directory-lorient.ts`
  (41 entrées : cliniques vétérinaires, éducateurs, pensions de la région de
  Lorient, avec adresses, coordonnées GPS, téléphones, horaires, notes
  `ratingAvg`/`ratingCount`). Son en-tête déclare : *« Source : public directories
  (Ordre des Vétérinaires, OSM, Pages Jaunes) »*. Pages Jaunes (Solocal) est une
  base propriétaire dont la réutilisation est contractuellement restreinte ; les
  notes moyennes ressemblent à des données de plateforme d'avis. Origine réelle
  et droit de réutilisation **non établis** dans le dépôt.
- **Mapbox** : `mapbox-gl@3.24.0` est utilisé dans 10 fichiers web. Depuis la v2,
  mapbox-gl-js n'est plus BSD mais sous conditions de service Mapbox, avec
  facturation à l'usage et interdiction de réimplémenter le rendu — **clause
  commerciale à valider** avant toute distribution. `docs/STACK_GAPS.md`
  mentionne « Carte | Mapbox GL (token Cédric) », c'est-à-dire un compte personnel.
- **Copyleft logiciel** : recherche dans `pnpm-lock.yaml` (1 790 paquets) sans
  détection de paquet GPL/AGPL/LGPL connu. **Réserve importante** : `pnpm-lock.yaml`
  ne stocke pas les licences et `node_modules` est absent ; cette vérification est
  donc **incomplète** et doit être refaite avec un outil de type
  `license-checker` / SBOM. Le workflow `security-supply-chain.yml` génère bien
  un SBOM CycloneDX/SPDX, mais aucun rapport de licences n'est versionné.
- **Références scientifiques externes** citées (Homma & Masaoka 2008, Robert et
  al. 2009, McEwen) : citations, pas de code copié ; `.gitignore` exclut
  `docs/scientific_basis/Litterature_Scientifique/` et tous les PDF.
- **Code copié depuis une source externe** : **NON TROUVÉ**. Les trois fichiers C
  du firmware sont courts, commentés en propre, sans en-tête fournisseur ni
  extrait de datasheet identifiable.
- **Entreprise / école / stage** : aucune mention d'employeur, d'établissement ou
  de stage (**NON TROUVÉ**). Les seuls tiers nommés sont les propriétaires de
  datasets (universités de Tampere, Helsinki, Tyndall/UCC), cités comme sources.
  `SKILLS_REPORT.md` et `AUDIT.md` citent des dépôts de skills tiers
  (`anthropics/skills`, `vercel-labs/agent-skills`, `emilkowalski/skill`,
  `pbakaus/impeccable`, `leonxlnx/taste-skill`, `arvindrk/extract-design-system`)
  utilisés comme outillage de développement, pas intégrés au produit.
- Personnes nommées : `CLAUDE.md` / `AGENTS.md` citent « Cédric Mian (CEO) » et
  « Mohamed (CTO) ». Mohamed n'apparaît dans **aucun commit**.

---

## 5. Sécurité

Aucun secret en clair n'a été trouvé. Balayage des 586 fichiers suivis sur les
motifs `sk-…`, `pk.…`, `ghp_…`, `AKIA…`, `re_…`, `xox…`, blocs `PRIVATE KEY` :
**aucune correspondance**. Recherche d'affectations littérales de
`secret|token|password|apiKey` hors `process.env` : **aucune**.

Points à connaître, sans valeurs :

- `.env.example` (racine) et `apps/web/.env.example` sont versionnés et ne
  contiennent que des placeholders explicites (`replace-with-…`, `*_placeholder`,
  `pk.placeholder`, `example.com`). `.gitignore` exclut `.env`, `.env*.local`,
  `apps/*/.env*`, `backend/.env*`, `apps/web/.data/`, `.claude/`, `.codex/`.
- `SECURITY_ROTATION_REQUIRED.md` liste **19 noms de variables** à faire tourner
  parce qu'un ancien `.env.example` aurait pu contenir des valeurs non-placeholder
  (`AUTH_SECRET`, `JWT_SECRET`, `ADMIN_TOKEN`, `STRIPE_*`, `ANTHROPIC_API_KEY`,
  `S3_*`, `DATABASE_URL`, `NEXT_PUBLIC_MAPBOX_TOKEN`…). Le fichier précise que la
  vérification d'historique Git n'a pas pu être faite à l'époque. **Elle n'a pas
  été refaite ici sur l'historique complet** : le balayage porte sur l'arbre
  courant, pas sur les 27 révisions.
- Repli de secret en dur, à surveiller : `backend/api/middleware/auth.ts:11` et
  `backend/api/services/vet-report.ts:10` acceptent la chaîne littérale
  `dev-secret-change-in-production`, mais **uniquement** si `NODE_ENV=test` ;
  sinon le processus lève une exception au démarrage. Comportement fail-closed
  correct, mais la valeur reste écrite dans le code.
- `apps/web/.env.example` expose ~90 variables de feature flags providers, dont
  des identifiants OAuth (`API_GOOGLE_CALENDAR_CLIENT_SECRET`) et des couples
  utilisateur/mot de passe (`API_MOVEBANK_PASSWORD`) — noms uniquement, valeurs vides.
- Données personnelles réelles : **NON TROUVÉ**. Les données de démo sont
  pseudonymisées (`data/extensions/dogs/Rex_01/community_profile.json` →
  `"Doux-Renard-4810"`). Les seules adresses e-mail non fictives du dépôt sont
  `onboarding@resend.dev` (domaine de test du fournisseur) et `i@izs.me`
  (dans `pnpm-lock.yaml`). Les numéros de téléphone présents sont soit des
  exemples (`+33 6 12 34 56 78`), soit les 41 coordonnées professionnelles de
  `backend/db/seeds/local-directory-lorient.ts` (voir §4.2 — enjeu de droits
  plus que de RGPD, mais les professionnels indépendants restent des personnes
  physiques).
- `config/privacy/data-inventory.json` et `docs/privacy/DPIA_P0.md` recensent les
  catégories de données mais laissent `legalBasis` et `retention` à
  `TO_CONFIRM_BEFORE_PRODUCTION` sur toutes les catégories.

---

## 6. Points de fragilité (lecture d'ingénieur externe)

1. **Le cœur technique n'est branché sur rien.** `packages/eli-engine`, la partie
   la plus élaborée et la mieux testée, n'a aucun consommateur. Le web maintient
   une seconde implémentation ELI, non testée contre la première. Risque de
   divergence silencieuse.
2. **La chaîne de données n'existe pas de bout en bout.** Ingestion capteurs,
   historique ELI, baselines et authentification sont des `TODO`. Le produit
   démontrable repose sur des mocks (`lib/mock-data.ts`, `lib/mock-world.ts`,
   `lib/eli/mock.ts`).
3. **Trois systèmes de persistance concurrents** (PostgreSQL/Drizzle, mémoire,
   JSON `.data/` + localStorage) sans contrat unique ; les migrations sont
   `BLOCKED` et `DB-G6` (upgrade d'une base existante) reste `OPEN`. Une mise en
   production impliquerait aujourd'hui une base repartie de zéro.
4. **Pas de CI applicative.** Rien ne vérifie `lint`, `typecheck`, `build` ou
   `test` sur une PR. Les seuls workflows portent sur la supply chain et la base.
   Le dépôt peut être rouge sans que personne le sache.
5. **Firmware quasi inexistant** face à un `CHANGELOG.md` qui annonce une version
   6.0.0 livrée. Pour un projet deeptech dont la valeur est matérielle, c'est
   l'écart le plus important entre le discours et le dépôt.
6. **Un seul contributeur, un commit de 534 fichiers.** Aucun bus factor, aucune
   revue croisée, et une traçabilité de paternité impossible sur l'essentiel du code.
7. **Zone grise juridique** : pas de LICENSE, données annuaire d'origine
   partiellement propriétaire, ODbL par OSM, conditions commerciales Mapbox,
   inventaire de licences des 1 790 dépendances non produit.
8. **Contradiction de charte non résolue** : la règle « pas de gamification » de
   `CLAUDE.md` coexiste avec un module World à ressources/quêtes et un catalogue
   de badges. Le dépôt documente le conflit sans le trancher.
9. **Divergence de design entre web (Sora) et mobile (Fraunces/Source Sans)**, et
   web qui ne charge aucune police : le rendu réel dépendra des polices système.
10. **Ampleur déclarative excessive** : 79 providers d'API catalogués pour 12
    adaptateurs, ~9 600 lignes de gabarits de contenu, 38 Mo d'ontologie de races
    versionnés — beaucoup de surface pour peu de chemin d'exécution vérifié.
11. **Documentation auto-référentielle abondante** : plans, rapports d'audit et
    rapports d'outillage IA versionnés à la racine, dont plusieurs se contredisent
    ou sont périmés — risque réel de suivre une instruction obsolète.

---

## Questions que je poserais au fondateur

1. Où se trouve l'historique de développement antérieur au 2026-07-02 ? Le commit
   `b4966fa` (534 fichiers) a-t-il été produit seul, avec un cofondateur, un
   prestataire, ou majoritairement par assistance IA ? Existe-t-il une trace ?
2. Quel est le statut contractuel de « Mohamed (CTO) » cité dans `CLAUDE.md` et
   absent de tout commit ? Existe-t-il une cession de droits écrite le concernant ?
3. Les visuels de marque (`apps/web/public/assets/brand/*`) ont-ils été créés en
   interne ou par un prestataire ? Y a-t-il une cession de droits pour le logo ?
4. D'où viennent réellement les 41 entrées de `local-directory-lorient.ts`, et le
   droit de réutilisation Pages Jaunes / notes d'avis est-il établi ?
5. Le compte Mapbox est-il personnel ou société, et les conditions commerciales
   ont-elles été validées pour une distribution produit ?
6. Existe-t-il, hors dépôt, un système documentaire contrôlé avec gates M-G* /
   T-G* et packages de révision ? Si oui, doit-il être importé ici ?
7. La gamification (badges, World, ressources) est-elle une décision produit
   assumée ou un reliquat à retirer ? Qui tranche la contradiction avec `CLAUDE.md` ?
8. Quel est le plan pour brancher `packages/eli-engine` : le backend consomme-t-il
   le moteur, ou l'inférence part-elle sur l'appareil ? La double implémentation
   web est-elle temporaire ?
9. Le firmware complet MAT/TAG existe-t-il dans un autre dépôt ? Si oui, sous quel
   contrôle de version et avec quelle licence de SDK fournisseur ?
10. Le dépôt doit-il rester sans LICENSE (tous droits réservés implicites) ou
    faut-il ajouter un en-tête propriétaire explicite avant toute diffusion,
    y compris à un investisseur ou à un futur salarié ?
11. Un audit de licences des 1 790 dépendances a-t-il déjà été mené ailleurs ?
12. Les 19 variables de `SECURITY_ROTATION_REQUIRED.md` ont-elles effectivement
    été renouvelées, et l'historique Git complet a-t-il été scanné depuis ?
