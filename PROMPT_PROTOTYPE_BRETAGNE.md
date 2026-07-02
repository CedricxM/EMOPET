# Brief produit — Prototype Carte Bretagne + Onglet Données RGPD

> **À donner à Claude Code une seule fois.**
> Le fichier `CLAUDE.md` à la racine du projet contient déjà les règles absolues EMOPET et la charte graphique — Claude Code le lira automatiquement.

---

## Mission

Ajouter **2 nouveaux écrans interactifs** à la codebase EMOPET existante :

1. **Carte Bretagne interactive** (onglet `Veute` / Communauté)
2. **Onglet Données / Consentement RGPD** best-in-class

---

## Instructions de démarrage

Avant de coder quoi que ce soit, fais ces 3 choses dans cet ordre :

1. **Lis le fichier `CLAUDE.md`** à la racine pour comprendre le contexte projet, les règles absolues et la charte graphique.
2. **Explore la base existante** : `ls src/`, lis `package.json`, repère les composants déjà construits, identifie l'écran d'accueil EMOPET s'il existe (avec le port breton et le Labrador).
3. **Propose-moi un plan d'intégration** AVANT de coder. Liste les fichiers à créer, les composants HeroUI que tu vas utiliser, les éventuelles dépendances à ajouter. Attends ma validation.

**Règle critique** : Ne JAMAIS écraser ou supprimer un fichier existant sans me demander. Tu intègres dans la base, tu ne la reconstruis pas.

---

## Écran 1 — Carte Bretagne interactive

### Objectif visuel

Une carte stylisée de la **Bretagne historique** (5 départements : Finistère 29, Côtes-d'Armor 22, Morbihan 56, Ille-et-Vilaine 35, Loire-Atlantique 44) inspirée de l'esthétique vintage maritime bretonne — référence : sérigraphies Le Corre, illustrations Nono, affiches vintage SNCM.

### Style graphique

- Carte en **SVG vectoriel**, traits noirs sérigraphiques
- Fond beige sable (`--sable-cl`)
- Mer en bleu très atténué ou hachures style gravure
- **Pas de textures photo**, pas de Google Maps moderne
- Tracé des départements **simplifié et stylisé**, pas un tracé administratif réaliste

### Éléments à inclure

**Villes principales** (avec petit pictogramme vintage SVG inline) :

| Ville | Dép. | Pictogramme | Note |
|---|---|---|---|
| Lorient | 56 | port + voilier | **Pin EMOPET ACTIF (Capitaine)** |
| Vannes | 56 | château médiéval | |
| Auray | 56 | clocher | Pin EMOPET |
| Quimper | 29 | clocher cathédrale | |
| Brest | 29 | phare + bateau | |
| Concarneau | 29 | port de pêche | **Pin EMOPET + événement balade** |
| Saint-Brieuc | 22 | port | |
| Rennes | 35 | porte médiévale | |
| Nantes | 44 | château ou pont | Cohérent avec Alqio, partenaire PVDF |

**Phares emblématiques** (icône phare SVG stylisée) :
- Phare d'Eckmühl (Penmarc'h, 29) — pointe sud Finistère
- Phare de la Vieille (Plogoff, 29) — pointe du Raz
- Phare de l'île Vierge (29) — nord Finistère

**Îles principales** (contour stylisé) :
- Île de Groix (face Lorient)
- Belle-Île-en-Mer (face Quiberon)
- Île d'Ouessant
- Archipel des Glénan (sud du Finistère)

### Animations autorisées (douces, jamais gamifiées)

1. **Vagues en mer** : ondulation horizontale CSS keyframes, 6s ease-in-out infinite, amplitude 2-3 px
2. **Soleil/lune selon heure réelle** : JavaScript `Date.getHours()`, arc gauche→droite, 6h-20h soleil (couleur `--terre`), 20h-6h lune (couleur `--pierre`)
3. **Pins chiens EMOPET** : pulse 3s ease-in-out infinite, couleur `--terre`, halo 30% opacity. Pin actif (Capitaine) plus marqué
4. **Phares** : flash 200ms toutes les 8s, offset différent par phare (pas synchronisés)
5. **Indicateur événement balade** sur Concarneau : cercle pulsant 2s qui grandit et fade out

### Éléments interdits

- ❌ Chien animé qui marche ou court (anthropomorphisation)
- ❌ Météo en temps réel
- ❌ Marées en temps réel
- ❌ Sons (pas de bruit de vagues, cloche, etc.)
- ❌ Particules type pluie/neige
- ❌ Gamification (pas de niveau, pas de XP, pas de récompense visuelle Sims)

### Interactions

1. **Tap sur une ville** : ouvre Modal ou Drawer HeroUI (style sheet iOS). Contenu : nom, nombre de chiens EMOPET dans la ville, événements à venir, mini-illustration SVG du lieu. Bouton CTA `Rejoindre la veute locale` couleur `--terre`.

2. **Tap sur un phare** : Tooltip HeroUI discret avec nom + 1 ligne d'histoire (ex. "Phare d'Eckmühl, 1897, second phare de France").

3. **Tap sur indicateur balade Concarneau** : Modal détaillée : *Balade aux Glénan — Dimanche 25 mai 10h — 12 propriétaires inscrits — gratuit — RDV port*.

### Données fictives (pins chiens à répartir)

```javascript
const dogsByCity = {
  lorient:     { count: 18, hasActive: true },  // Capitaine
  vannes:      { count: 12 },
  auray:       { count: 8 },
  quimper:     { count: 7 },
  concarneau:  { count: 5, hasEvent: true },
  brest:       { count: 6 },
  saintBrieuc: { count: 4 },
  rennes:      { count: 14 },
  nantes:      { count: 9 },
};
// Total : ~83 chiens (cohérent avec hypothèse pré-lancement 200 clients an 1)
```

### Header et footer de l'écran

**Header** :
- Kicker mono : `⊙ AR VEUTE — LA MEUTE`
- Titre Fraunces : `La meute bretonne`
- Sous-titre Fraunces italic : `83 chiens EMOPET en Bretagne historique`

**Footer** :
- Bouton HeroUI principal couleur `--terre` : `VOIR LA LISTE`
- Bouton HeroUI secondaire bordure `--pierre` : `ORGANISER UNE BALADE`
- Tab bar 4 onglets (cohérent avec écran d'accueil) : DEMAT / PEMDEZ / KI / VEUTE — VEUTE actif

---

## Écran 2 — Onglet Données / Consentement RGPD

### Objectif

Permettre à l'utilisateur de comprendre exactement quelles données EMOPET collecte sur son chien, et de contrôler finement le partage via **4 niveaux granulaires**. Cet écran est un **argument différenciant majeur** vs Tractive, Invoxia, Hector Kitchen qui collectent en mode opaque.

### Style graphique

- Même charte EMOPET v2 que l'écran Carte Bretagne (cf. `CLAUDE.md`)
- Structure éditoriale claire avec sections numérotées (01, 02, 03)
- Composants HeroUI : `Switch` pour toggles, `RadioGroup` pour niveaux, `Card` pour sections, `Modal` pour droits utilisateur
- Toggles HeroUI customisés : `--terre` quand ON, `--pierre` quand OFF
- **Pas d'iconographie agressive** (pas de lock, pas de shield)
- Ton **chaleureux et pédagogique**, pas légaliste

### Structure de l'écran (haut → bas)

#### Header
- Kicker mono : `⊙ TES DONNEES — TA MEUTE`
- Titre Fraunces : `Tu gardes le contrôle`
- Sous-titre italique : `Voici exactement ce que nous savons de Capitaine, et qui peut le voir.`

#### Section 01 — Vue d'ensemble
- **Notch info** (fond `--prudence`, barre `--terre`) :
  *"EMOPET ne vend JAMAIS vos données. Vous décidez chaque catégorie, vous pouvez tout supprimer en 1 clic."*
- **3 stats clés** dans un layout Cards :
  - `1 247` mesures collectées depuis 30 jours
  - `4` catégories actives
  - Niveau global de partage : `PRIVÉ` (par défaut)

#### Section 02 — 4 Niveaux de partage (RadioGroup HeroUI)

**Niveau 1 — PRIVÉ** (par défaut)
- Icône : `⊙`
- Couleur : `--granit`
- Texte : *"Tes données restent sur ton appareil et le serveur EMOPET. Personne d'autre n'y accède. Tu peux les voir et les exporter à tout moment."*
- Qui voit : **seulement toi**

**Niveau 2 — ANONYMISÉ**
- Icône : `⊙○`
- Couleur : `--lichen`
- Texte : *"Tes données sont agrégées sans nom, race ou géolocalisation précise. Elles aident à améliorer les recommandations pour TOUS les chiens, sans qu'on puisse jamais remonter à Capitaine."*
- Qui voit : **EMOPET en agrégat statistique**

**Niveau 3 — COMMUNAUTÉ EMOPET**
- Icône : `⊙⊙⊙`
- Couleur : `--terre`
- Texte : *"Tu partages avec les autres membres de la meute : ville (pas adresse exacte), race, âge, niveau d'activité général. Tu peux organiser des balades, comparer Capitaine à d'autres labradors de Bretagne."*
- Qui voit : **autres utilisateurs EMOPET dans ta ville/région**

**Niveau 4 — RECHERCHE SCIENTIFIQUE**
- Icône : `⊙*`
- Couleur : `--terre-dark`
- Texte : *"Tes données anonymisées peuvent être utilisées par des laboratoires partenaires (vétérinaires, universités) pour faire avancer la science du bien-être canin. Tu reçois 1 mois d'abonnement gratuit par an en remerciement."*
- Qui voit : **laboratoires partenaires sous accord scientifique encadré**

UI : 4 cards HeroUI avec RadioGroup. Un seul niveau actif global. Possibilité d'override par catégorie en section 03.

#### Section 03 — Détail par catégorie (6 catégories)

Chaque catégorie = une `Card` HeroUI contenant : nom + description + `Switch` ON/OFF + selector niveau + nombre de mesures collectées + capteurs concernés.

| # | Catégorie | Toggle | Niveau défaut | Mesures/mois | Capteurs |
|---|---|---|---|---|---|
| 1 | **Sommeil** (durée, cycles, qualité) | ON | 2 | 89 | PVDF + IMU |
| 2 | **Activité physique** (intensité, durée, type) | ON | 2 | 158 | IMU + cellules charge |
| 3 | **Phases d'agitation** ⚠ (pas "anxiété") | ON | 1 | 23 | IMU + microphone |
| 4 | **Environnement tapis** (T°, hygro, pression) | ON | 2 | 720 | BME280 |
| 5 | **Localisation** (ville uniquement) | **OFF par défaut** | 1 | — | GPS app |
| 6 | **Profil chien** (race, âge, sexe, taille) | ON | 1 | — | Manuel |

Tooltip sur catégorie 3 : *"EMOPET observe les phases d'agitation sans poser de diagnostic. À discuter avec votre vétérinaire."*

Tooltip sur catégorie 5 : *"EMOPET n'utilise jamais l'adresse précise. Si tu actives, seule la ville sera utilisée pour la communauté."*

Bouton `Voir mes données` à côté de chaque catégorie → ouvre Modal avec mini graphique de la catégorie.

#### Section 04 — Tes droits (4 boutons cards)

1. **VOIR MES DONNÉES** (icône `⊙`) : Modal avec table scrollable de toutes les mesures EMOPET
2. **EXPORTER MES DONNÉES** (icône `↓`) : Déclenche download fictif CSV ou JSON
3. **VOIR LES UTILISATIONS** (icône `⊙*`) : Modal dashboard des études utilisant les données anonymisées
   - Étude 1 fictive : *"Sommeil et race chez le Labrador" — INRAE Bretagne — 2026 — 234 chiens dont Capitaine*
   - Étude 2 fictive : *"Activité saisonnière chiens littoraux" — ENVA Nantes — 2026 — 1 247 chiens dont Capitaine*
4. **SUPPRIMER MES DONNÉES** (icône `✕`, couleur `--rouge`) : Modal de confirmation double validation, action irréversible

#### Section 05 — Consentement annuel

**Notch info** (fond `--prudence`, barre `--terre`) :
*"Ton consentement est renouvelé chaque année. Prochaine validation demandée : 15 mai 2027. Tu pourras tout reconfigurer à ce moment-là."*

---

## Contraintes techniques

### Responsive
- Optimisé **iPhone 390×844 viewport** en priorité
- Acceptable iPad (largeur 768+) en cas d'extension
- Pas de support desktop large prioritaire

### Accessibilité
- Contraste WCAG AA minimum sur tous les textes
- Zones tactiles 44×44 px minimum sur boutons et toggles
- `aria-label` sur icônes décoratives
- HeroUI gère déjà l'essentiel via React Aria

### Performance
- SVG inline (pas de fichier image externe)
- Animations CSS only (pas de GSAP, pas de Framer Motion lourd)
- Fonts Google Fonts via preconnect + preload

---

## Ordre d'exécution recommandé

1. **Étape 1** — Lire `CLAUDE.md` + explorer base existante + me proposer un plan d'intégration
2. **Étape 2** — Carte Bretagne SVG statique (départements + villes + phares + îles)
3. **Étape 3** — Pins chiens EMOPET + indicateurs événements
4. **Étape 4** — Animations Carte (vagues, soleil/lune, pulse pins, flash phares)
5. **Étape 5** — Interactions Carte (Modal ville, Tooltip phare, Modal événement)
6. **Étape 6** — Onglet Données — layout complet (Sections 01 à 05)
7. **Étape 7** — Interactions Données (toggles, modals droits utilisateur, export fictif)
8. **Étape 8** — Vérification finale (règles absolues + accessibilité + responsive iPhone)

**Validation entre chaque étape**. Pas de "fait tout d'un coup".

---

## Critères de succès

- ✅ Les 2 écrans sont accessibles depuis la tab bar 4 onglets existante
- ✅ La charte graphique EMOPET v2 est respectée à 100%
- ✅ Aucun terme interdit (anthropomorphisation, label émotionnel, claim diagnostique) dans le code et l'UI
- ✅ Les composants HeroUI sont utilisés en priorité sur du custom CSS
- ✅ L'app reste fluide sur iPhone (animations 60fps)
- ✅ La base existante n'est pas cassée (les écrans précédents fonctionnent encore)

---

**Tu peux commencer par lire `CLAUDE.md` et explorer la base.**
