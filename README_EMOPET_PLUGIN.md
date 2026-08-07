Ajout de l'intégration ChatGPT (plugin) pour EMOPET

Ce dossier contient un manifest (ai-plugin.json), une spécification OpenAPI minimale (openapi.yaml), des workflows GitHub pour valider les fichiers, et une checklist d'intégration OAuth2.

Étapes rapides pour activer:
1. Enregistrez un client OAuth sur EMOPET (Authorization Code + PKCE recommandé).
2. Mettez à jour `ai-plugin.json` et `openapi.yaml` avec vos URLs réelles et scopes.
3. Dans GitHub, ajoutez les secrets: EMOPET_CLIENT_ID, EMOPET_CLIENT_SECRET (si nécessaire), EMOPET_URL.
4. Déployez un point de callback (redirect URI) et enregistrez‑le côté EMOPET.

Voir `docs/EMOPET_OAuth_checklist.md` pour plus de détails.
