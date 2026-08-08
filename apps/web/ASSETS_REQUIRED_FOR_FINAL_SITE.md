# EMOPET — Assets Required for Final Site

## Assets de marque (existants dans /public/assets/brand/)

| Fichier | Statut | Utilisé dans |
|---------|--------|-------------|
| emopet-logo-dark.png | ✅ Disponible | — |
| emopet-logo-white.svg | ✅ Disponible | — |
| emopet-logo-mark.svg | ✅ Disponible | Navbar, Footer |
| app-icon.svg | ✅ Disponible | — |
| emopet-mat.png | ✅ Disponible | Hero (background), Scène 04 |
| social-preview.png | ✅ Disponible | meta og:image |

## Assets photographiques (MANQUANTS)

| Asset | Description | Scènes | Priorité |
|-------|-------------|--------|----------|
| hero-dog-guardian.jpg | Photo d'un chien avec son gardien, lumière naturelle, ambiance chaleureuse | Hero (01), Retour (13) | CRITIQUE |
| dog-resting-mat.jpg | Chien confortablement installé sur le mat | Mat (04) | HAUTE |
| dog-exploring-outdoor.jpg | Chien en promenade/exploration, contexte naturel breton | Tag (05) | HAUTE |
| dog-portrait-emotional.jpg | Portrait proche d'un chien, regard expressif | Moments manqués (02) | MOYENNE |
| coastal-walk-bretagne.jpg | Sentier côtier breton, ambiance matinale | Connexions (09) | MOYENNE |
| community-dogs-park.jpg | Groupe de propriétaires avec chiens dans un parc local | Communauté (10) | BASSE |

## Assets d'illustration (MANQUANTS)

| Asset | Description | Scènes | Priorité |
|-------|-------------|--------|----------|
| mat-cross-section.svg | Vue en coupe du Mat montrant les capteurs de façon épurée | Mat (04) | HAUTE |
| tag-device.svg | Illustration minimaliste du Tag device | Tag (05) | HAUTE |
| ecosystem-diagram.svg | Diagramme MAT + TAG + APP connectés | Écosystème (03) | MOYENNE |
| bretagne-map-minimal.svg | Carte stylisée Bretagne/Lorient | Ancrage local (08) | MOYENNE |

## Assets d'interface (MANQUANTS)

| Asset | Description | Scènes | Priorité |
|-------|-------------|--------|----------|
| app-screenshot-morning.png | Capture d'écran de l'app (message matinal) | App (06) | BASSE (actuellement simulé en HTML) |
| app-screenshot-activity.png | Capture écran onglet activité | App (06) | BASSE |

## Icônes & micro-assets (OPTIONNELS)

| Asset | Description | Utilisation |
|-------|-------------|-------------|
| icon-mat.svg | Icône du Mat (petit format) | Navigation, cards |
| icon-tag.svg | Icône du Tag (petit format) | Navigation, cards |
| icon-breiz.svg | Icône Breiz IA | Conversation, cards |
| pattern-dots.svg | Motif décoratif points bretons | Background sections |
| wave-separator.svg | Séparateur ondulé entre sections | Transitions scènes |

## Vidéos (OPTIONNELLES, basse priorité)

| Asset | Description | Contraintes |
|-------|-------------|-------------|
| hero-ambient.mp4 | Loop ambiant hero (chien au repos, mouvement subtil) | Max 5s, < 2MB, pas autoplay mobile |
| mat-tech-reveal.mp4 | Animation révélation tech sous la surface | Max 3s, < 1MB |

## Fonts (déjà configurées)

- ✅ Fraunces (Google Fonts) — serif, titres
- ✅ Source Sans 3 (Google Fonts) — sans-serif, corps

## Favicons (À GÉNÉRER)

| Fichier | Taille | Format |
|---------|--------|--------|
| favicon.ico | 32×32 | ICO |
| apple-touch-icon.png | 180×180 | PNG |
| favicon-16x16.png | 16×16 | PNG |
| favicon-32x32.png | 32×32 | PNG |
| android-chrome-192x192.png | 192×192 | PNG |
| android-chrome-512x512.png | 512×512 | PNG |

## Notes

- Toutes les photos doivent respecter l'esthétique EMOPET : lumière naturelle, tons chauds, ambiance calme
- Pas de photos "stock" génériques avec des chiens souriants artificiellement
- Les illustrations doivent rester dans la palette officielle (cream, granit, terracotta, lichen)
- Format images : WebP avec fallback JPEG pour le hero
- Dimensions recommandées : 2x pour retina (min 1600px de large pour les full-width)
- Compression agressive acceptable pour les images de fond (qualité 60-70%)
