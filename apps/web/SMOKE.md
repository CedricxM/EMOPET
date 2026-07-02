# Smoke test — apps/web

## Automatique (HTTP)

```powershell
# Terminal 1
cd apps/web ; pnpm dev

# Terminal 2 (après "Ready" dans le terminal 1)
cd apps/web ; pnpm smoke
```

Vérifie HTTP 200 + présence de signatures textuelles sur les 8 routes.

## Manuel (navigateur) — checklist 5 min

Ouvre `http://localhost:3100/` et fais les vérifications dans l'ordre.

### Pages existantes (régression)

- [ ] `/` — Accueil avec preview mobile s'affiche. Tab bar 4 onglets, illustration port breton + Labrador.
- [ ] `/dashboard` — Card ELI, indice numérique, tendance 14 jours en bar chart. Tendance toujours rendue après upgrade React 19.
- [ ] `/breiz` — Chat avec conversations à gauche, bulle utilisateur / bulle Breiz, input en bas. Texte de refus d'interprétation affective toujours présent.
- [ ] `/journal` — Liste journal.
- [ ] `/rapport` — Rapport 14 jours, sections SummaryCard 4 colonnes, DualChart, observations + vétos.
- [ ] `/profil` — Profil chien.

**Régression check** : aucune police ne devrait être en Arial fallback (next/font doit avoir auto-hosté Sora/JetBrains Mono).

### Page Local · Veute (Carte Bretagne)

- [ ] Carte Bretagne visible avec contour, départements (29/22/56/35/44 en italique terracotta).
- [ ] **9 pins chiens** visibles (Brest 6 / Quimper 7 / Concarneau 5 / Lorient 18 / Auray 8 / Vannes 12 / Saint-Brieuc 4 / Rennes 14 / Nantes 9). Total 83.
- [ ] **Capitaine actif** à Lorient — pin double halo plus marqué.
- [ ] **Anneaux pulsants** autour de Concarneau (événement balade).
- [ ] **3 phares** visibles (EckmÜhl, La Vieille, Île Vierge) — flash bref toutes les ~8s, décalés.
- [ ] **4 îles** visibles (Ouessant, Groix, Belle-Île, Glénan).
- [ ] **Vagues** au sud bougent doucement.
- [ ] **Soleil ou Lune** apparaît en haut selon l'heure (6h-20h soleil, sinon lune).
- [ ] **Rose des vents** en bas-droit, signature `⊙ AR VEUTE` en bas-gauche.

#### Interactions Carte

- [ ] Clic sur **Lorient** → modal s'ouvre avec "Lorient" + "18 chiens EMOPET dans cette ville — dont Capitaine" + CTA terracotta "Rejoindre la veute locale".
- [ ] Clic sur **Concarneau (picto port-pêche)** → modal Concarneau avec "5 chiens EMOPET" + notch prudence "Balade aux Glénan".
- [ ] Clic sur **anneaux Concarneau** (zone pulsante) → modal "Balade aux Glénan" avec Quand/Où/Inscrits/Tarif.
- [ ] Clic sur **phare d'Eckmühl** → modal "Phare d'Eckmühl" avec caption 1 ligne.
- [ ] **Tab** dans la carte → focus visible sur chaque ville/phare/événement.
- [ ] **Enter** sur élément focusé → modal s'ouvre.
- [ ] **Esc** dans un modal → ferme.

#### Footer Veute

- [ ] CTA terracotta "VOIR LA LISTE" → scroll vers l'annuaire local en bas.
- [ ] CTA outline "ORGANISER UNE BALADE" → ouvre la modal événement.
- [ ] Annuaire local pré-existant (vétérinaires, parcs, éducateurs, urgences) toujours visible sous la carte.

### Page Données (RGPD)

- [ ] Header `⊙ TES DONNÉES — TA MEUTE` + "Tu gardes le contrôle".
- [ ] **Section 01** : notch terracotta "EMOPET ne vend JAMAIS vos données" + 3 cards stats (1018 mesures / 4 actives / PRIVÉ).
- [ ] **Section 02** : 4 cards radio (PRIVÉ / ANONYMISÉ / COMMUNAUTÉ / RECHERCHE), une seule sélectionnée à la fois. Click change la sélection avec ring coloré.
- [ ] **Section 03** : 6 cards catégories. Switch ON/OFF visible. Select niveau désactivé si Switch OFF.
- [ ] Catégorie 3 "Phases d'activation" a un badge `NOTE` + tooltip non médical.
- [ ] Catégorie 5 "Localisation" est OFF par défaut.
- [ ] **Section 04** : 4 cards droits (Voir / Exporter / Voir utilisations / Supprimer en rouge).
- [ ] **Section 05** : notch "Prochaine validation : 15 mai 2027".

#### Interactions Données

- [ ] Click sur **toggle catégorie** → état change, compteur "ACTIVES" en Section 01 se met à jour.
- [ ] Click sur **niveau de partage Section 02** → ring + couleur changent, le compteur "Niveau global" en Section 01 se met à jour.
- [ ] Click sur **"⊙ Voir mes données"** d'une catégorie → modal table 60 lignes max, scrollable, focus catégorie.
- [ ] Click sur **"VOIR MES DONNÉES"** (Section 04) → modal table toutes catégories.
- [ ] Click sur **"EXPORTER MES DONNÉES"** → modal Choisir format (CSV / JSON).
- [ ] Click **CSV** → fichier `emopet-export-YYYY-MM-DD.csv` se télécharge. Ouvre dans Excel/Numbers — caractères accentués corrects (BOM UTF-8).
- [ ] Click **JSON** → fichier `.json` se télécharge.
- [ ] Click **"VOIR LES UTILISATIONS"** → modal Études INRAE Bretagne / ENVA Nantes.
- [ ] Click **"SUPPRIMER MES DONNÉES"** → modal étape 1 (avertissement) → Continuer → étape 2 (taper `SUPPRIMER`).
- [ ] Bouton "Supprimer définitivement" désactivé tant que `SUPPRIMER` pas tapé.
- [ ] Une fois supprimé → toast "Suppression simulée — maquette uniquement".

### Accessibilité

- [ ] DevTools → Rendering → cochez `prefers-reduced-motion: reduce` → toutes les animations s'arrêtent (vagues, pulse pins, flash phares, anneaux Concarneau, soleil rotation).
- [ ] Navigation au clavier (Tab/Shift+Tab/Enter) fonctionne sur toute la carte.
- [ ] Lecteur d'écran (VoiceOver Mac ou Narrator Windows) annonce les pins comme boutons avec `${city.name} — N chiens EMOPET`.

### Responsive

- [ ] DevTools → device toolbar → iPhone 12 Pro (390×844) → la sidebar reste fixe (244px) mais la zone main se rétrécit. La carte SVG se redimensionne mais reste lisible. Les sections Données passent en colonne unique.
- [ ] Largeur 1280px → mise en page normale desktop.

## Critères de succès global

- ✅ Toutes les cases cochées
- ✅ Zero erreur dans la console DevTools
- ✅ Aucun warning d'hydration React
- ✅ Lighthouse score ≥ 90 sur `/donnees` (perf, a11y, best practices)
