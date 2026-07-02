# EMOPET — Confidentialité & clés d'API

> Règles non négociables pour la couche API. La minimisation des données et le
> caractère non médical priment sur toute fonctionnalité.

## Clés & secrets

- **Aucune clé en dur.** Toute clé vient de l'environnement (`.env.local`, gitignoré).
  `.env.example` ne contient que des **placeholders vides**.
- Un `ProviderDescriptor` ne décrit que les **NOMS** de variables d'env (`envKeys`),
  jamais les valeurs.
- Les clés restent **côté serveur** (routes/route handlers, jamais exposées au client).
- Un provider à authentification n'est appelé que si ses variables d'env sont présentes
  (`resolveActivation`) ; sinon il est ignoré (pas d'appel, pas d'erreur fatale).

## Données utilisateur (minimisation)

- N'envoyer à un tiers que le **strict nécessaire** au contexte (ex. `lat/lon` arrondis
  pour la météo — pas d'identifiant utilisateur, pas de profil chien).
- **Aucune donnée de bien-être du chien** n'est transmise à une API tierce.
- **Aucun audio brut** stocké ni envoyé. (`noRawAudioStorage`.)
- Pas d'interprétation médicale ; pas de données personnelles superflues vers un tiers.

## Géolocalisation IP

- **OFF par défaut**, marquée `privacyRisk: high` (`ipstack`, `ipapi` = `disabled_by_default`).
- Activable uniquement de façon explicite et optionnelle, avec avertissement de
  confidentialité ; précision `approximate` au mieux. Préférer le géocodage FR (BAN /
  geo.api.gouv.fr) à partir d'une saisie volontaire.

## Mots de passe compromis (HaveIBeenPwned)

- **Jamais** de mot de passe brut envoyé à une API externe.
- Utiliser le modèle **k-anonymité** : SHA-1 du mot de passe, n'envoyer que le **préfixe
  de 5 caractères**, comparer les suffixes localement. Tant que ce n'est pas implémenté,
  le provider reste `scaffold` / désactivé.

## Classification du risque vie privée par provider

| Risque | Providers (exemples) | Politique |
|---|---|---|
| **high** | `ipstack`, `ipapi`, `haveibeenpwned`, `google-calendar` | OFF par défaut, garde-fous spécifiques (k-anonymité, consentement) |
| **medium** | `disify`, `eva`, `emailrep`, providers AI cloud | activer au cas par cas, minimiser la donnée envoyée |
| **low / none** | `open-meteo`, `openaq`, BAN, `geo.api.gouv.fr`, `nager-date`, `local-mock-ai` | activables, données non personnelles |

## Audit

- Tout signal conserve une **provenance** (`ProvenanceEntry`) et une référence opaque au
  payload brut (`rawPayloadRef`) — jamais le payload lui-même dans la logique métier.
- Les catégories sensibles (`moderation`, `security`) ne sont **jamais** mises en cache.
