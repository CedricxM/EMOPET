# EMOPET — Audit stack vs « Vibe Coding Stack 2026 »

Comparaison de la stack EMOPET (`apps/web` Next.js + `backend` Hono/Drizzle) à la checklist
d'outils SaaS de référence. État au 2026-05-31.

| Catégorie | EMOPET aujourd'hui | Statut | Recommandation / ce qu'il faut |
|---|---|---|---|
| Frontend | Next.js 15, React 19, primitives maison, HeroUI | ✅ OK | — |
| AI Coding | Claude Code | ✅ | — |
| AI / API | Anthropic API (Breiz régional, env-gated) | ✅ branché | clé `ANTHROPIC_API_KEY` pour activer le modèle |
| Carte | Mapbox GL (token Cédric) | ✅ | — |
| Météo | Open-Meteo (open data, sans clé) | ✅ | — |
| **Persistance** | localStorage + **store JSON serveur** (slice contact) | 🟡 partiel | **R3** : migrer carte/carnet/communauté/gamification vers le serveur ; cible prod = Postgres + Drizzle (`backend/`) → besoin d'une `DATABASE_URL` (Docker ou Scaleway) |
| **Email / Notif** | **Resend** (env-gated, notif équipe des demandes contact) | ✅ scaffolé | compte Resend + `RESEND_API_KEY` + `TEAM_EMAIL` pour activer |
| **Analytics** | **Plausible** (RGPD, sans cookie, env-gated) | ✅ scaffolé | `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` (compte Plausible) |
| **Auth** | `jose`/JWT côté backend, pas d'UI | 🔴 manque | choisir **Auth.js** (open source) ou Clerk ; UI login + sessions. Besoin : décision + (Clerk → compte/clés) |
| **Paiement** | schéma freemium en DB, rien de branché | 🔴 manque | **Stripe** (ou Lemon Squeezy) ; besoin compte + clés + webhooks |
| **Object storage** | photos carnet en data URL (localStorage) | 🔴 manque | **Cloudflare R2** ou UploadThing ; besoin compte + clés S3 |
| **Error tracking** | aucun | 🔴 manque | **Sentry** ; besoin DSN + `@sentry/nextjs` |
| **Background jobs** | aucun (cron ELI/purge théoriques) | 🔴 manque | **Inngest** ou cron : snapshots ELI nuit, baseline freeze, purge contact 6 mois |
| Tests | `node:test` + tsx (régional) | 🟡 | étendre à Vitest + Playwright (parcours) |

## Fait dans cette passe (sans compte requis)
- **Resend** : `lib/server/notify.ts` + `app/api/contact/route.ts` (no-op + log si clé absente).
- **Plausible** : script env-gated dans `app/layout.tsx` (aucun script si domaine non défini).
- **Persistance serveur** : `lib/server/store.ts` (store JSON) + route `/api/contact` (première tranche R3 réelle, repli localStorage).

## Ce qui exige une décision ou un compte (à faire quand tu fournis l'accès)
- Auth (Auth.js vs Clerk), Stripe (freemium), R2/UploadThing (photos), Sentry (DSN), Inngest (jobs), Postgres (`DATABASE_URL`).

> Principe : on scaffolde et on env-gate ; on n'invente pas de clés. Chaque intégration s'active dès que la clé/compte est fourni.
