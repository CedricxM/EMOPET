# AGENTS.md — Contexte permanent EMOPET

Ce fichier est lu automatiquement par Codex à chaque session.
Il contient les règles non négociables et la charte graphique du projet.

---

## ⚠ Addendum stack observée (2026-08-29)

Le brief `PROMPT_PROTOTYPE_BRETAGNE.md` décrit une proposition historique. Les manifests et points d'entrée actuels font foi pour l'état d'implémentation, sans transformer cet état en décision produit :

- Monorepo pnpm 10 + Turbo. App web : **`apps/web`** (Next.js 15 + React 19, port 3100).
- App mobile : **`apps/mobile`** (Expo 52 + React 18 + React Native 0.76).
- Backend : **`backend`** (Hono 4 + TypeScript + Drizzle/PostgreSQL). Ce n'est pas NestJS. L'inscription, la connexion et le renouvellement de jeton restent des stubs `TODO`.
- Le web contient aussi des Route Handlers Next.js avec stockage JSON `.data/` et replis localStorage. Ce plan prototype n'est pas l'autorité durable et reste à réconcilier avec le backend/PostgreSQL.
- Navigation sidebar observée : `/dashboard`, `/journal`, `/quartier`, `/world`, `/breiz`, `/profil`. Des routes hors sidebar existent, notamment `/rapport`, `/contact` et `/admin`.
- Design system maison : `apps/web/styles/tokens.css` et primitives `apps/web/components/ui/*`. HeroUI 3 et Tailwind 4 sont également installés.
- Aucun projet Unity et aucune intégration Nakama ne sont présents sur les branches distantes observées. Ces workstreams restent `GATED / NOT PRODUCTION AUTHORITY`.
- Les commandes documentées dans les manifests sont des surfaces disponibles, pas une preuve de build, de CI ou de production.
- La règle produit n'interdit plus tout système ludique en bloc : elle interdit **strictement** la gamification de la santé/bien-être canin, de l'émotion inférée, de la qualité de relation, du risque vétérinaire et de la performance réelle du chien. Les systèmes ludiques optionnels de World restent séparément gouvernés, gated, non approuvés par leur seule présence dans le code, et ne doivent jamais transformer MAT/TAG/ELI, pas, sommeil, activité ou repos en XP, score, rang, streak ou récompense.

---

## Projet

**EMOPET** est une startup deeptech française basée à Lorient (Bretagne) qui développe un dispositif de monitoring du bien-être canin **non médical**. Le kit comprend un tapis instrumenté (MAT) avec capteurs PVDF, IMU, cellules de charge, BME280 — et un collier wearable (TAG) avec IMU, microphone, piezo, NTC. L'algorithme ELI v6 (Extended Kalman Filter avec confidence gating) traite les signaux. L'application companion s'appelle Breiz AI.

Fondateur : Cédric Mian (CEO). Cofondateur : Mohamed (CTO).

---

## Règles absolues — NON NEGOCIABLES

Ces règles sont **le positionnement stratégique d'EMOPET** et différencient le projet de concurrents qui revendiquent du quasi-médical (Invoxia notamment). Toute violation casse la cohérence du produit.

### 1. PAS d'anthropomorphisation

Le chien n'est PAS un personnage qui ressent des émotions humaines.

- ❌ Interdit : "Capitaine a fait un bon rêve", "il s'ennuie", "il est triste de ton absence"
- ✅ Autorisé : "sommeil profond 7h28", "phase de repos prolongée", "activité réduite observée"

### 2. PAS de labels émotionnels

Les émotions ne sont pas mesurables par des capteurs. EMOPET observe des comportements, pas des sentiments.

- ❌ Interdit : "anxiété", "stress", "dépression", "joie", "peur"
- ✅ Autorisé : "agitation observée", "activité élevée", "phase d'éveil intense", "interaction sociale détectée"

### 3. PAS de claims diagnostiques

EMOPET n'est pas un dispositif médical et ne pose aucun diagnostic.

- ❌ Interdit : "détection problème cardiaque", "risque d'obésité", "anomalie respiratoire", "alerte santé"
- ✅ Autorisé : "tendance baisse d'activité sur 7 jours", "à discuter avec votre vétérinaire", "variation observée"

### 4. PAS de gamification du chien réel

La ludification ne doit jamais transformer les données du chien ou la relation Guardian–dog en performance.

- ❌ Interdit : points/XP/niveaux/streaks/leaderboards/récompenses dérivés de MAT/TAG/ELI, des pas, de la distance, du sommeil, du repos, de l'activité, du bien-être, d'une émotion inférée, d'un risque vétérinaire ou d'un score de relation.
- ❌ Interdit : score de « bon Guardian », score de bonheur/santé du chien, classement public des chiens, progression conditionnée par la performance réelle du chien.
- ✅ Potentiellement autorisé sous gates World/Community séparés : activités coopératives, décoration d'espace, keepsakes symboliques, découverte non compétitive, interactions sociales prédéfinies, à condition qu'elles restent indépendantes de la performance/bien-être du chien et puissent fonctionner sans nouveau signal MAT/TAG/ELI.

La présence actuelle de mécaniques ludiques dans le prototype ne constitue pas une autorisation de release. Voir `docs/product/EMOPET_EXPERIENCE_DOCTRINE_v0.1.md` et les gates World/Community.

### Procédure de vérification

Avant tout commit/livraison, faire une recherche dans le code et les textes UI pour :
- `anxiété`, `stress`, `dépression`, `triste`, `heureux`, `joie`, `peur`
- `santé`, `maladie`, `diagnostic`, `risque`, `alerte`, `anomalie`
- `ressent`, `a fait un rêve`, `s'ennuie`, `est content`

Si l'un de ces termes apparaît, le remplacer immédiatement.

---

## ⚠ Charte visuelle emopet 2026 (REBRAND — supersède la v2 ci-dessous)

Cédric a fourni le 2026-05-30 une nouvelle charte de marque officielle. Elle **remplace** la palette/typo « EMOPET v2 » historique. Les valeurs ont été remappées dans `apps/web/styles/tokens.css` **en conservant les noms d'échelle** (`granit/terracotta/lichen/cream`) pour ne rien casser — seules les valeurs changent.

- **Marque** : `emopet` (minuscules). Tagline : « Soins intelligents. Lien fort. » / « Un cœur breton. Une care intelligente. »
- **Logo** : patte navy + spirale orange (vagues bretonnes / lien infini). Voir `PawSpiralMark` dans `components/sidebar.tsx`.
- **Palette** :
  - Navy `#1D1A6A` → `--granit-800` (marque + texte)
  - Orange `#FE502D` → `--terracotta-500` (accent / CTA)
  - Teal `#2CB7AB` → `--lichen-500` (secondaire)
  - Cream `#F6EFE7` → `--cream-100` (fond)
  - Gris `#6B6F76` → `--granit-500` (texte atténué)
- **Typographie** : **Sora** (police principale, titres + corps, `--font-sans`/`--font-serif`). JetBrains Mono conservé pour données tabulaires + kickers. *(Fraunces/Source Sans retirés.)*
- Les patterns ⊙ aperture, kickers mono caps, notch boxes restent valides (couleurs remappées automatiquement).

---

## Charte graphique EMOPET v2 (historique — conservée pour référence)

### Tokens CSS — référence canonique : `apps/web/styles/tokens.css`

Synonymes brief → tokens réels :
- `--granit` → `--granit-800` (texte principal), `--granit-900` (titres)
- `--granit-c` → `--granit-700` (texte courant)
- `--ardoise` → `--granit-500` (texte secondaire)
- `--terre` → `--terracotta-500` (accent chaud)
- `--terre-dark` → `--terracotta-700` (hover/press)
- `--lichen` → `--lichen-500` (validation/équilibre)
- `--pierre` → `--cream-300`/`--cream-400` (séparateurs)
- `--sable-cl` → `--cream-100` (fond principal beige clair)
- `--sable-pr` → `--cream-200` (fond cartes)
- `--prudence` → `--prudence-bg` (fond notch info)

### Typographie (déjà chargée dans `tokens.css`)

- **Fraunces** (display) : titres, italiques éditoriaux, opsz 9..144
- **Source Sans 3** (body) : corps de texte
- **JetBrains Mono** (mono) : kickers, données, captions tracking-caps

### Patterns visuels signatures

- **Aperture mark** : symbole `⊙` utilisé en signature partout (header, sections, séparateurs)
- **Kicker mono caps tracked** : style mono 11-12px, letter-spacing 0.18-0.22em, couleur `--terracotta-700`
- **Italic Fraunces lead** : citations et phrases d'ambiance en Fraunces italic 19-22px, couleur `--granit-700`
- **Notch boxes** : fond `--prudence-bg` + barre gauche `--terracotta-500` 8-10px
- **Numérotation sections** : 01, 02, 03 en Fraunces italic grande taille couleur `--terracotta-500`

### Vocabulaire breton intégré (ponctuel)

- **Demat** = Bonjour
- **Ar Pemdez** = Le quotidien
- **Ki** = Chien
- **Veute** / **Ar Veute** = Meute / Communauté
- **Breizh** = Bretagne

---

## Cibles utilisateurs

- **Camille & Antoine** (35-42 ans, CSP+, Bretagne, Labrador) — 60% du CA an 3
- **Marie** (55-65 ans, retraitée active, CSP+, Border Collie) — 25%
- **Julien** (28-38 ans, ingénieur télétravail, Husky/Border) — 15% (persona prescripteur tech)

---

## Stack technique observée

- **Monorepo pnpm 10 + Turbo** (racine `pnpm-workspace.yaml`)
- App web : **Next.js 15 + React 19** (`apps/web`)
- App mobile : **Expo 52 + React 18 / React Native 0.76** (`apps/mobile`)
- Backend : **Hono 4 + TypeScript + Drizzle/PostgreSQL** (`backend`)
- Firmware : sources partielles MAT/TAG en C (`firmware`), sans build firmware complet observé
- Packages partagés : `packages/{shared, eli-engine, ai-personality, ble-protocol}`
- Persistance actuelle : schémas PostgreSQL, stores mémoire backend, store JSON Next.js et replis navigateur ; l'unification reste `OPEN`
- Migration propre : `BLOCKED` tant que la baseline Drizzle et le chemin d'upgrade ne sont pas réparés et validés

### UI (web)

- Primitives maison `apps/web/components/ui/*` — **par défaut**
- `@heroui/react@^3` + Tailwind v4 — pour Modal/Drawer/Switch/RadioGroup/Tooltip et toute interaction riche
- Animations CSS only (keyframes + transitions, respect `prefers-reduced-motion`). `animejs` disponible mais préférer CSS.

---

## Workflow attendu

1. **Lire la base existante** avant tout changement (`ls apps/web/app/`, lire `package.json`, comprendre les routes)
2. **Demander confirmation** avant d'écraser ou supprimer un fichier
3. **Petites étapes incrémentales** : un écran à la fois, validation visuelle entre chaque
4. **Vérification finale** : aucun terme interdit (cf. règles absolues) dans le code ou les textes UI
5. **Ludification sous autorité séparée** : aucune mécanique ne peut gamifier santé/bien-être, émotion inférée, relation, risque vétérinaire ou performance réelle du chien. Les mécaniques World/Community purement ludiques restent optionnelles, gated et indépendantes de MAT/TAG/ELI.
