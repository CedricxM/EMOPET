# EMOPET / Breiz — Aperçu complet de l'application web

> Document d'orientation pour toute personne (ou agent) qui découvre `apps/web`.
> But : comprendre **ce que fait chaque page**, **d'où viennent les données**, et **les règles non négociables**.
> Stack réelle : **Next.js 15 (App Router) + React 19**, primitives maison + `tokens.css`, HeroUI v3 (modals/riches), **Mapbox GL** (carte), API via **Route Handlers Next + store JSON serveur** (`lib/server/store.ts`, remplaçable par Drizzle/Postgres). Tests `node:test` via `pnpm test`.

---

## 1. Ce qu'est EMOPET

Deeptech canine de Lorient (Bretagne). Kit **MAT** (tapis instrumenté) + **TAG** (collier), algorithme **ELI v6** (EKF bayésien + confidence gating) produisant des **indicateurs de bien-être NON médicaux**. L'app companion s'appelle **Breiz**.

### Invariants non négociables (s'appliquent à tout le code et tous les textes)
1. **No medical claims** — aucun diagnostic, aucune pathologie nommée, aucun chiffre clinique. Renvoi vétérinaire avec chaleur.
2. **No emotional labeling du chien** — le chien est *calme/actif*, jamais *heureux/triste/anxieux*. (⚠ Le mockup de marque montrait « Mood: Happy » → **interdit**, non implémenté.)
3. **No anthropomorphisation** — le chien n'est pas un avatar et ne « monte pas de niveau ».
4. **Gamification du PROPRIÉTAIRE uniquement** — « VOUS avez exploré 10 plages », jamais le chien.
5. **Charte emopet 2026** (rebrand) — voir §2.
6. **RGPD** — consentement explicite, anonymat par défaut sur la carte, droit à l'effacement.
7. **Accessibilité** WCAG 2.1 AA · **8. TypeScript strict** (pas de `any`).

---

## 2. Design system (charte emopet 2026)

Tokens : `apps/web/styles/tokens.css`. Le rebrand a **remappé les valeurs** des échelles existantes (les noms `granit/terracotta/lichen/cream` sont conservés) :
- **Navy `#1D1A6A`** → `--granit-800` (marque + texte)
- **Orange `#FE502D`** → `--terracotta-500` (accent / CTA)
- **Teal `#2CB7AB`** → `--lichen-500` (secondaire)
- **Cream `#F6EFE7`** → `--cream-100` (fond) · Gris `#6B6F76` → `--granit-500`
- Police principale **Sora** (`--font-sans`/`--font-serif`), JetBrains Mono pour données/kickers.
- Logo : patte navy + spirale orange (`PawSpiralMark` dans `components/sidebar.tsx`), wordmark `emopet`.
- Primitives maison : `components/ui/*` (`Button, Card, Eyebrow, Icon, Meter, Pill, Disclaimer, Typography`). HeroUI réservé aux modals/interactions riches.
- Signature `⊙` (aperture), kickers mono caps, notch boxes (`--prudence-bg` + barre orange).

---

## 3. Navigation (sidebar gauche — `components/sidebar.tsx`)

| Route | Libellé | Rôle |
|---|---|---|
| `/` | Accueil (mobile) | Aperçu de l'app mobile (iOS frame) |
| `/dashboard` | ELI · Dashboard | Vue ELI « aujourd'hui » |
| `/bien-etre` | Bien-être · ELI v6 | Vue scientifique ELI (cœur deeptech) |
| `/breiz` | Breiz | Assistant conversationnel |
| `/journal` | Journal | Carnet du chien |
| `/local` | Local · Veute | Carte Bretagne + annuaire |
| `/communaute` | Communauté | Cercles, posts, événements |
| `/contact` | Parler à l'équipe | Demande de contact humain |
| `/donnees` | Données | RGPD / données |
| `/rapport` | Rapport 14 j | Rapport vétérinaire |
| `/profil` | Profil | Gamification + chien + capteurs + réglages |
| `/admin` | *(hors sidebar)* | File de modération (équipe) |

---

## 4. Description page par page

### `/` — Accueil (aperçu mobile)
Rend l'app **mobile** dans un cadre iOS (`components/mobile-preview/*` : tab bar + écrans home/chat/journal/local/profile). Vitrine du produit mobile. Données mock.

### `/dashboard` — ELI aujourd'hui *(pré-existant)*
Aperçu du jour : indice ELI + état (`Pill` valid/degraded), carte « Anticipation » (motif d'éveil avant départ), Repos (interruptions/durée/confiance), Récupération (temps de retour au calme), tendance 14 jours (barres). Données `lib/mock-data.ts`. Disclaimer non médical en pied.

### `/bien-etre` — Journal scientifique ELI v6 *(Sprint 03, réaligné sur le modèle v6)*
- **Indice de bien-être (ELI)** : jauge globale 0-100 + **gating PUBLISH/DEGRADE/REJECT** (§13 du modèle).
- **WQI = Walk Quality Index** : qualité de balade = exercice 40 % + exploration 35 % + social 25 % (§7).
- **RSI = Routine Stability Index** : similarité cosinus 24 h vs moyenne 14 j (seuils 80/50, §8).
- **4 familles** (Activité, Repos, Régulation, Sociabilité) cliquables → 23 proxies → graphe détail (SVG maison) baseline ±2σ.
- **Recovery speed** (McEwen type 3) + **Anticipation index** (v6).
- **5 sous-baselines contextuelles** (§4) · **quality tier** GOLD/SILVER/BRONZE/REJECTED (§11).
- **Baseline figée à J+14** + alerte de dérive >30 j → suggestion véto factuelle (§9).
- Sélecteur 7/30/90 j · badges de confiance VALID/DEGRADED/SUPPRESSED · footer scientifique + mention RGPD · déclaration de contexte (veto manuel) · export `window.print()`.
- Données : **mock déterministe** `lib/eli/mock.ts` (90 j). Catalogue : `lib/eli/catalog.ts`.

### `/breiz` — Assistant conversationnel *(Sprint, RAG + ancrage régional)*
Chat. Chaque message passe par `/api/breiz` (serveur) qui **assemble un prompt système régional** (moteur commun + profil Bretagne + savoir filtré) et appelle **l'API Anthropic si `ANTHROPIC_API_KEY`**, sinon **repli RAG** (`lib/breiz-rag/`). Intentions : **santé → renvoi vétérinaire**, **météo → Open-Meteo temps réel**, sinon récupération sourcée (corpus open data + 11 races extraites du référentiel FCI). Marqueur visuel « donnée ELI · ton verrouillé » quand la réponse touche une donnée ELI.

### `/journal` — Carnet du chien *(Sprint 02, serveur R3)*
Timeline éditoriale groupée par jour, navigation mensuelle, résumé. **5 types d'entrées** (souvenir photo+texte, balade, jalon, observation, visite véto — union discriminée). Éditeur wizard (création), **météo réelle** auto-capturée sur les balades (Open-Meteo), **export carte postale** PNG (canvas), **détection de jalons** (sujet : propriétaire). Données : **serveur** `/api/journal` (seed de 10 entrées démo), repli localStorage. `lib/journal.ts` + `lib/milestones.ts`.

### `/local` — Veute (carte + annuaire) *(Sprint 01, Mapbox + serveur R3)*
- **Carte Mapbox GL** de la Bretagne (token `NEXT_PUBLIC_MAPBOX_TOKEN`), POI réels OpenStreetMap, repli carte SVG maison si pas de token.
- **Spots communautaires** : 8 catégories, filtres, ajout (anonyme par défaut, quota 5/j), fiche détail + commentaires. Données : **serveur** `/api/map/spots` (seed 14), repli localStorage.
- **Événements** des cercles affichés comme **RDV** sur la carte (lecture `/api/community/events`).
- **Bandeau météo** réel (Open-Meteo, Lorient).
- **Annuaire local** (vétos/parcs/éducateurs/urgences) filtrable — données `MOCK_LOCAL`.

### `/communaute` — Cercles & communauté *(Sprint 04, serveur R3)*
Liste des **5 cercles** bretons (Lorient/Vannes/Rennes/Brest/Quimper) + agenda perso. Rejoindre = **consentement RGPD explicite** (prénom + ville, jamais l'adresse). Détail cercle : **feed de posts** (question/discussion/annonce) + **événements**. Création de post (**filtre mots interdits serveur**), réponses, **signalement → auto-masquage à 2 flags**, création d'événement (RDV → carte). Charte communautaire. Données : **serveur** `/api/community/posts` (+ `/replies`, `/flag`) et `/api/community/events`. Memberships en localStorage (en attente d'auth).

### `/contact` + `/contact/mes-demandes` — Mise en relation humaine *(serveur R3 + Resend)*
Approche **sobre** : l'app DEMANDE et PLANIFIE un contact (téléphone/visio), elle **n'héberge aucune visio**. Formulaire : canal → motif (**jamais « santé »**) → créneaux → coordonnée → **consentement RGPD obligatoire**, mention non médicale visible. Suivi + annulation (effacement). Données : **serveur** `/api/contact` ; **Resend** notifie l'équipe si `RESEND_API_KEY`+`TEAM_EMAIL`. `lib/contact.ts`.

### `/profil` — Profil & gamification *(Sprint 05, compteurs serveur)*
Onglets : **Progression** (niveau d'expérience canine *du propriétaire*, points, prochains objectifs, défis collectifs), **Badges** (5 catégories), **Apprentissage** (fiches de connaissance sourcées → points), **Compte** (chien, capteurs MAT/TAG, réglages). **Compteurs dérivés des vraies données serveur** (`fetchServerCounters` : spots/carnet/événements), repli localStorage. Invariant : tout est sur le propriétaire. `lib/gamification.ts`.

### `/donnees` — Données / RGPD *(pré-existant)*
Sections RGPD + export des données (`components/donnees/*`).

### `/rapport` — Rapport 14 jours *(pré-existant)*
Synthèse sur 14 jours pour le vétérinaire (tendance ELI). Données mock.

### `/admin` — File de modération *(équipe, hors sidebar)*
Gate par token (`x-admin-token` == `ADMIN_TOKEN`, ouvert en dev si non défini). Deux panneaux : **demandes de contact** (programmer/terminer/annuler, créneau retenu, notes) + **posts signalés** (masquer/ré-afficher/rejeter). API `/api/admin/*`.

---

## 5. Backend / API (Route Handlers Next, store JSON serveur)

`lib/server/store.ts` expose `collection<T>()` (un fichier JSON par collection dans `apps/web/.data/`, gitignoré) — **interface volontairement minimale, remplaçable par Drizzle/Postgres** sans toucher les appelants.

| Route | Méthodes | Rôle |
|---|---|---|
| `/api/breiz` | POST | Prompt système régional → Anthropic (si clé) ou repli RAG |
| `/api/contact` | GET/POST/DELETE | Demandes de contact (+ notif Resend) |
| `/api/map/spots` | GET/POST | Spots carte (seed démo) |
| `/api/map/spots/[id]/comments` | POST | Commentaire de spot |
| `/api/journal` | GET/POST/DELETE | Entrées du carnet |
| `/api/community/posts` | GET/POST | Posts (filtre modération) |
| `/api/community/posts/[id]/replies` | POST | Réponse |
| `/api/community/posts/[id]/flag` | POST | Signalement (auto-hide à 2) |
| `/api/community/events` | GET/POST | Événements |
| `/api/admin/moderation` | GET | File de modération |
| `/api/admin/contact/[id]` | PATCH | Traiter une demande |
| `/api/admin/posts/[id]` | PATCH | Modérer un post |

Pattern général : **serveur autoritaire au chargement, repli localStorage hors-ligne**.

Backend séparé existant (non câblé au web) : `backend/` (**Hono + Drizzle + Postgres**, schémas community/dogs/eli-v5/freemium/users). Cible de migration quand une `DATABASE_URL` sera disponible.

---

## 6. Bibliothèques clés (`apps/web/lib/`)

- `eli/catalog.ts` + `eli/mock.ts` — modèle ELI v6 (familles, 23 proxies, 11 vetoes, sous-baselines, gating, WQI/RSI, génération mock).
- `regional/` — **moteur d'ancrage régional duplicable** : `types`, `engine` (4 garde-fous), `build-system-prompt`, `filter-knowledge` (déterministe, plafond 800 tokens), `detect-region` (44 → Bretagne), `initiate` (conservateur), profils `bretagne`/`test-region`.
- `breiz-rag/` — corpus open data + races FCI (`breeds.generated.ts` via `scripts/gen-breeds.mjs`), `retrieve` (lexical, sans embeddings), `askBreiz`.
- `journal.ts` + `milestones.ts` — carnet.
- `community.ts` — cercles/posts/événements + filtre modération + builders.
- `gamification.ts` — badges/niveaux/points/fiches/défis + compteurs serveur.
- `contact.ts` — validation + builder.
- `weather.ts` — Open-Meteo (sans clé).
- `server/store.ts`, `server/notify.ts` (Resend), `server/admin.ts` (gate).

---

## 7. Tests (`pnpm test` — `node:test` via tsx)

**32 tests** : moteur régional (11), ELI (intégrité + invariant no-medical), gamification (**invariant propriétaire-only**), contact (consentement/no-santé/futur), communauté (modération/validations). Plus `npm run typecheck` (tsc strict) et `npm run lint` (eslint, 0 warning).

---

## 8. Configuration (`apps/web/.env.local`, gitignoré)

| Variable | Effet si présente |
|---|---|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Active la vraie carte Mapbox (sinon SVG) |
| `ANTHROPIC_API_KEY` | Breiz répond via le modèle (sinon RAG) |
| `RESEND_API_KEY` + `TEAM_EMAIL` | Notif équipe des demandes contact |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | Analytics RGPD (sans cookie) |
| `ADMIN_TOKEN` | Protège `/admin` (sinon ouvert en dev) |

---

## 9. Différé (besoin compte/clé/décision — voir `docs/STACK_GAPS.md`)

Auth (scoper par utilisateur/chien, sécuriser `/admin`, participation par-utilisateur), Stripe (freemium), Object storage R2 (photos carnet, aujourd'hui data URL), Postgres (swap du store JSON), Sentry. Décision produit en attente : fusion/rôles de `/dashboard` vs `/bien-etre` vs `/rapport` (3 vues ELI).
