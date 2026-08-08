# EMOPET — Website Implementation Plan

## Stack confirmée

| Layer | Technology | Version |
|-------|-----------|--------|
| Framework | Next.js | 15 |
| UI | React | 19 |
| Styling | TailwindCSS | 4 |
| Animations | anime.js | ^3.2.2 |
| Language | TypeScript | strict |
| Package Manager | pnpm | monorepo |

## Fonts

- **Fraunces** (serif) — titres, headlines, citations émotionnelles
- **Source Sans 3** (sans-serif) — corps, UI, navigation
- Chargement : Google Fonts via `next/font/google` dans layout.tsx

## Palette officielle

```
cream-50:  #FAF7F1   cream-100: #F4EFE6   cream-200: #ECE5D7
cream-300: #DDD4C2   cream-400: #C6BBA4
granit-900: #141C25  granit-800: #1F2A36  granit-700: #2E3A48
granit-600: #4A5766  granit-500: #6B7684
terracotta-700: #9B5A3E  terracotta-600: #B46A4A  terracotta-500: #C97B5A
terracotta-300: #E5B29D  terracotta-100: #F7E5DA
lichen-700: #4F6E54  lichen-500: #6B8E6F  lichen-300: #A8BCAC
lichen-100: #E3EAE4
```

## Architecture des composants

```
apps/web/app/page.tsx          ← Homepage (13 scènes narratives)
apps/web/components/landing/
├── LandingNav.tsx             ← Navbar transparente → cream au scroll
├── SceneWrapper.tsx           ← IntersectionObserver reveal animations
├── TimelineScene.tsx          ← Scène 02 timestamps défilants
├── EcosystemScene.tsx         ← Scène 03 MAT/TAG/APP visualisation
├── AppMockup.tsx              ← Scène 06 interface simulée
├── BreizConversation.tsx      ← Scène 07 conversation IA
├── PrivacyControls.tsx        ← Scène 12 toggles données
└── LandingFooter.tsx          ← Footer complet
```

## Décisions d'animation

### Bibliothèque : anime.js + CSS natif

- **Scroll-triggered reveals** : IntersectionObserver natif déclenche les animations
- **Parallax hero** : CSS `transform: translateY()` basé sur scroll position (requestAnimationFrame)
- **Timeline timestamps** : Animation séquentielle anime.js avec stagger
- **Ecosystem circles** : SVG path animation via anime.js
- **Mat transparency** : CSS opacity transition on scroll
- **Chat bubbles** : anime.js stagger avec easing élastique
- **Location expansion** : anime.js scale + opacity séquentiel
- **Privacy toggles** : CSS transitions pures (pas besoin d'anime.js)

### Respect `prefers-reduced-motion`

Toutes les animations wrappées dans un check :
```typescript
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
```
Si activé : pas d'animation, affichage direct du state final.

## Plan scène par scène

| # | Scène | Effet principal | Trigger |
|---|-------|----------------|--------|
| 01 | Hero | Parallax fond + fade-in texte | Page load |
| 02 | Moments manqués | Timestamps séquentiels | Scroll into view |
| 03 | Écosystème | Circles reveal progressif | Scroll into view |
| 04 | Mat | Layer transparency au scroll | Scroll progress |
| 05 | Tag | Slide-in + path animation | Scroll into view |
| 06 | Application | Cards stack reveal | Scroll into view |
| 07 | Breiz | Chat bubbles stagger | Scroll into view |
| 08 | Ancrage local | Scale expansion | Scroll into view |
| 09 | Connexions | Fade + slide | Scroll into view |
| 10 | Communauté | Grid reveal stagger | Scroll into view |
| 11 | Continuité vétérinaire | Checklist progressive | Scroll into view |
| 12 | Données & contrôle | Fade-in toggles | Scroll into view |
| 13 | Retour émotionnel | Parallax retour + fade | Scroll into view |

## Contraintes de performance mobile

1. **Pas de vidéo autoplay** sur mobile — images statiques optimisées
2. **Images responsive** : `next/image` avec sizes et priority pour above-the-fold
3. **Lazy loading** : toutes les images below-the-fold en lazy
4. **Animation budget** : max 3 anime.js instances actives simultanément
5. **Touch targets** : minimum 44×44px sur tous les éléments interactifs
6. **Font loading** : `display: swap` pour éviter FOIT
7. **Bundle** : composants landing en dynamic import si nécessaire
8. **Scroll handler** : passive listeners + requestAnimationFrame throttle
9. **IntersectionObserver** : `rootMargin: '0px 0px -100px 0px'` pour trigger avant viewport
10. **CSS-first** : transitions simples en CSS, anime.js réservé aux séquences complexes

## Accessibilité

- `aria-label` sur tous les éléments interactifs
- Contrastes WCAG AA minimum (4.5:1 texte, 3:1 éléments larges)
- Navigation clavier complète (focus visible, tab order logique)
- `role="region"` + `aria-labelledby` pour chaque scène
- Skip-to-content link en haut de page
- Images : alt text descriptif systématique

## Statut des fonctionnalités présentées

| Feature | Statut |
|---------|--------|
| Mat (capteurs repos) | EN DÉVELOPPEMENT |
| Tag (mouvement) | EN DÉVELOPPEMENT |
| Application mobile | EN DÉVELOPPEMENT |
| Breiz (IA conversationnelle) | EN DÉVELOPPEMENT |
| Connexions communautaires | PRÉVU |
| Continuité vétérinaire | PRÉVU |
| Contrôle données | EN DÉVELOPPEMENT |
