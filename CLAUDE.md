# CLAUDE.md — Contexte permanent EMOPET

> [!IMPORTANT]
> **READ FIRST — C-BARQ / ELI / behaviour / Penn**
> Avant toute tâche liée à C-BARQ, University of Pennsylvania / Penn Vet, James Serpell, ELI scientifique, questionnaires comportementaux, validation longitudinale ou mapping capteurs → comportement, lire **en entier** :
> `docs/science/EMOPET_CBARQ_UPENN_SCIENTIFIC_AUTHORITY_2026-09-23.md`
>
> Le fichier `AI_READ_FIRST.md` est le gate racine de contexte obligatoire. Ne pas inférer une licence C-BARQ, une validation ELI ou un endorsement Penn à partir d'un article, d'un prototype ou d'un ancien deck.

Ce fichier est lu automatiquement par Claude Code à chaque session.
Il résume les garde-fous de travail. En cas de conflit, les autorités contrôlées citées ci-dessous priment sur ce résumé.

---

## Autorités à lire avant une décision de fond

- Stratégie fondateur : `docs/strategy/FOUNDER_STRATEGIC_LOCKS_2026-09-07.md`
- Care / observation produit : `docs/product/EMOPET_CARE_PRODUCT_MASTER_v0.1.md`
- Marque actuelle : `docs/brand/BRAND-AUTHORITY-001_EMOPET_Current_Visual_Authority_2026-08-25.md`
- Terminologie capteurs : `docs/architecture/SENSOR_MODALITY_GLOSSARY_2026-09-07.md`
- Mémoire / supersessions : `docs/records/memory/INDEX.md`

Une implémentation existante, un ancien deck ou un ancien BOM ne devient pas une autorité simplement parce qu'il est plus détaillé ou déjà codé.

---

## Stack observée

Le brief `PROMPT_PROTOTYPE_BRETAGNE.md` décrit une proposition historique. Les manifests et points d'entrée actuels font foi pour l'état d'implémentation, sans transformer cet état en décision produit :

- Monorepo pnpm 10 + Turbo. App web : **`apps/web`** (Next.js 15 + React 19, port 3100).
- App mobile : **`apps/mobile`** (Expo 52 + React 18 + React Native 0.76).
- Backend : **`backend`** (Hono 4 + TypeScript + Drizzle/PostgreSQL). Ce n'est pas NestJS. L'inscription, la connexion et le renouvellement de jeton restent des stubs `TODO`.
- Le web contient aussi des Route Handlers Next.js avec stockage JSON `.data/` et replis localStorage. Ce plan prototype n'est pas l'autorité durable et reste à réconcilier avec le backend/PostgreSQL.
- Navigation sidebar observée : `/dashboard`, `/journal`, `/quartier`, `/world`, `/breiz`, `/profil`. Des routes hors sidebar existent, notamment `/rapport`, `/contact` et `/admin`.
- Design system maison : `apps/web/styles/tokens.css` et primitives `apps/web/components/ui/*`. HeroUI 3 et Tailwind 4 sont également installés.
- Le moteur canonique `packages/eli-engine` (EKF, vetoes, confidence, RSM) n'est importé par **aucun module runtime**. `apps/web/lib/eli/catalog.ts` duplique ses valeurs localement « pour éviter tout import cross-package » et le dashboard consomme `lib/eli/mock`. Ce qui est affiché à l'utilisateur ne vient donc pas du moteur scientifique. Gate ouverte : #118. Constat daté : `docs/records/memory/CURRENT_REPO_AUTHORITY_CONFLICT_AUDIT_2026-09-17.md`.
- Aucun projet Unity et aucune intégration Nakama ne sont présents sur les branches distantes observées. Ces workstreams restent `GATED / NOT PRODUCTION AUTHORITY`.
- Les commandes documentées dans les manifests sont des surfaces disponibles, pas une preuve de build, de CI ou de production.
- Le code contient encore des surfaces historiques de gamification et de score global. Ne pas les étendre ni les traiter comme décisions produit sans revue contre les autorités actuelles.

---

## Projet

**EMOPET** est un projet deeptech français basé à Lorient (Bretagne), centré sur l'observation longitudinale non médicale du bien-être canin.

Architecture stratégique actuelle :

- **MAT + TAG + application** ;
- MAT = surface de repos instrumentée et contexte de référence qualifié ;
- TAG = continuité mobile et contextuelle ;
- l'application compare principalement le chien à ses propres références contextuelles ;
- ELI = architecture d'interprétation sous incertitude, avec qualité, provenance, gating et abstention ;
- Breiz = compagnon contextuel borné, jamais source d'autorité scientifique.

### MAT Phase 0 : résumé technique actuel

Ne plus résumer le MAT par `PVDF + IMU + cellules de charge + BME280` comme si tous ces éléments étaient figés.

Chaînes actuellement contrôlées :

1. **Respiratoire** : quatre canaux de câble piézoélectrique **PVDF coaxial blindé**, front-end analogique indépendant par canal, acquisition synchrone ; fusion seulement entre canaux piézo lorsque les gates l'autorisent.
2. **Cellules de charge** : présence, poids, répartition, mouvement grossier, stabilité et eligibility/gating. Elles ne sont pas fusionnées dans l'estimation respiratoire ou cardiaque.
3. **Référence vibration environnementale** : canal candidat bas/châssis pour contamination/confiance/veto/analyse ; le choix exact du capteur reste à figer par preuve.

PCB de production, Gerbers finaux, seuils, fusion finale et stack définitif restent **non figés** tant que la faisabilité n'est pas démontrée.

Dans le code, `pvdf` peut rester un alias de modalité pour les canaux coaxiaux PVDF actuels. Il ne signifie pas `film plat`, `LDT0-028K`, `six zones` ou `chest strap`.

Fondateur : Cédric Mian (CEO). Cofondateur indiqué dans le contexte projet : Mohamed (CTO).

---

## Règles produit et scientifiques

### 1. Pas d'anthropomorphisation non étayée

Ne pas transformer des signaux en récit émotionnel humain.

- Interdit comme conclusion capteur : `il est triste`, `il s'ennuie`, `il a peur`, `il a fait un bon rêve`.
- Préférer des observations : `activité réduite observée`, `repos plus fragmenté`, `interaction détectée`, avec contexte, référence, source et limites.

### 2. Pas de labels émotionnels certains

ELI n'est pas un classifieur d'émotions discrètes. Une architecture dimensionnelle peut exister en interne, mais la publication utilisateur est plus étroite que l'ancien prototype.

Sous l'autorité Care actuelle, l'arousal/activation est le seul latent actuellement autorisé pour publication utilisateur sous la V1 citée ; la valence reste interne/gated.

### 3. Pas de claims diagnostiques

EMOPET n'est pas un dispositif médical et ne pose pas de diagnostic.

Ne pas convertir `variation`, `proxy`, `pattern` ou `absence de signal` en maladie, diagnostic ou alerte clinique.

### 4. Pas de score global nu

La stratégie est **relationship-first**, pas metric-first.

Le dashboard historique contient encore des surfaces `ELI 72`, jauges globales, WQI/RSI et autres composites. Leur présence dans le code ne prouve pas leur autorisation produit.

Care impose : observation + contexte + fenêtre temporelle + référence + provenance + qualité/confiance + limites + modèle/version + état de publication.

**No naked number.**

### 5. Abstention = comportement produit valide

Quand l'évidence est insuffisante, afficher explicitement l'absence d'observation fiable plutôt qu'un score faible ou une pseudo-conclusion.

---

## Marque actuelle

L'autorité actuelle est **BRAND-AUTHORITY-001**, datée du 25 août 2026.

### Système actif

- Display / titres / wordmark : **Fraunces**
- Corps : **Instrument Sans**
- Technique / données / métadonnées : **JetBrains Mono**
- Marque principale : **aperture mark + wordmark EMOPET**
- Identité principale : species-agnostic
- Palette : sable / granit / ardoise / pierre / terre cuite / lichen

Valeurs contrôlées principales :

- Sable `#F4EFE6`
- Sable clair `#FAF6EE`
- Sable profond `#EAE2D3`
- Granit `#1F2A36`
- Granit clair `#2E3B47`
- Ardoise `#5A6570`
- Pierre `#D8D0C2`
- Pierre claire `#E4DDD0`
- Terre cuite `#C97B5A`
- Terre cuite sombre `#A65E3F`
- Lichen `#6B8E6F`
- Lichen sombre `#4F6F53`

Reliability states :

- VALID `#7A9B7E`
- DEGRADED `#C9A55A`
- SUPPRESSED `#9AA0A6`

Les anciens profils Playfair/Montserrat puis Sora + navy/orange/teal + paw/spiral sont **historiques/superseded**. Le code web contient encore une partie de cette ancienne identité. Ne pas traiter cette implémentation comme l'autorité actuelle et ne pas faire de migration visuelle massive sans pilote + QA.

Deux pièges observés dans le code, à connaître avant tout audit visuel :

1. **`tokens.css` a conservé les NOMS de tokens de la charte actuelle (`--granit-*`, `--terracotta-*`, `--lichen-*`, `--cream-*`) en remplaçant leurs VALEURS par navy/orange/teal.** Un `grep terracotta` renvoie donc du vert alors que le rendu est l'ancienne charte. Vérifier les valeurs hexadécimales, jamais les noms.
2. **`apps/web/BRAND_AUTHORITY.md` (8 août 2026) se déclarait « single source of truth » et marquait `#C97B5A`, `#6B8E6F`, `#1F2A36` comme « DEPRECATED — DO NOT USE » — or ce sont la terre cuite, le lichen et le granit prescrits par BRAND-AUTHORITY-001 (25 août 2026).** Le fichier porte désormais un en-tête `HISTORICAL / SUPERSEDED` et sa Rule 1 est marquée « do not execute ». Ne pas la ré-exécuter.

Le statut de la tagline historique `Smart care. Strong bond.` / `Soins intelligents. Lien fort.` reste à confirmer séparément. Ne pas inventer une nouvelle tagline.

---

## Maturité et preuves

Toujours distinguer :

- décidé ;
- implémenté ;
- testé ;
- validé ;
- proposé/candidat ;
- ouvert ;
- bloqué ;
- historique/superseded.

Rappels :

- code présent ≠ preuve physique ;
- test synthétique ≠ validation bench ;
- bench ≠ validation animale ;
- supplier candidate ≠ fournisseur sélectionné ;
- RFQ envoyée ≠ engagement contractuel ;
- beau document ≠ maturité technique.

---

## Workflow attendu

1. Lire la base existante et les autorités pertinentes avant changement.
2. Ne pas écraser/supprimer un artefact contrôlé ou historique sans décision explicite ; préférer une nouvelle révision ou un record de supersession.
3. Faire des étapes incrémentales et auditables.
4. Pour un changement UI, vérifier la cohérence avec Care, Founder Strategic Locks et Brand Authority avant de suivre le prototype existant.
5. Pour un changement capteur/protocole, vérifier le `SENSOR_MODALITY_GLOSSARY_2026-09-07.md` et ne pas renommer des champs contractuels à l'aveugle.
6. Pour une claim scientifique, indiquer la maturité, la provenance, les limites et les gates.
7. Ne pas réintroduire une décision historique depuis un ancien BOM/deck sans vérifier la source actuelle.
