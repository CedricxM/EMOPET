# EMOPET — Intégration OAuth2 / Plugin ChatGPT (checklist)

Ce fichier explique les étapes nécessaires pour permettre au plugin ChatGPT d'accéder à EMOPET en utilisant OAuth2 Authorization Code (avec PKCE recommandé).

1) Enregistrer un client OAuth sur EMOPET
- Type de grant: Authorization Code
- PKCE: recommandé (code_challenge/code_verifier)
- Scopes suggérés: openid profile emopet.read emopet.write
- Redirect URI à enregistrer (exemple):
  - https://your-domain.example.com/.well-known/oauth-redirect
  - Remplacez `your-domain.example.com` par le domaine où vous hébergerez le callback du plugin

2) CORS / Accès réseau
- Si EMOPET est sur un réseau interne (behind firewall), il faudra :
  - exposer une API publique ou
  - créer un proxy reverse / tunnel (ngrok, cloud-run proxy, API gateway) qui protège l'accès
- If you authorise origins, add the plugin hosting domain and GitHub if necessary.

3) Ajout des secrets dans GitHub
- Allez dans Settings → Secrets → Actions et ajoutez:
  - EMOPET_CLIENT_ID (obligatoire)
  - EMOPET_CLIENT_SECRET (optionnel si vous n'utilisez pas PKCE)
  - EMOPET_URL (optionnel, ou utilisez le placeholder dans .env.example)

4) Modifier les fichiers du dépôt
- Mettre à jour `ai-plugin.json` et `openapi.yaml` pour remplacer les URLs placeholder par celles de EMOPET.
- Vérifier les scopes et les paths de l'OpenAPI pour correspondre à l'API réelle.

5) Test local / validation
- Pour tester localement le plugin ChatGPT, vous pouvez déployer un service de callback (redirect URI) et utiliser le flux Authorization Code pour récupérer un token.
- Vérifiez le endpoint `/health` (ou un endpoint non protégé) pour confirmer la connectivité.

6) Sécurité et bonnes pratiques
- Préférez PKCE pour éviter de stocker client_secret côté client.
- Limitez les scopes au minimum nécessaire.
- Si possible, utilisez OIDC pour récupérer des informations utilisateurs (sub, email) si EMOPET le supporte.

7) Support et debug
- Si le plugin ne parvient pas à joindre EMOPET, vérifiez:
  - accessibilité réseau (DNS, firewall)
  - CORS et headers
  - redirect URI exact enregistré dans EMOPET
  - scopes et consent screen


Remplacez les placeholders dans ce dossier par les valeurs réelles fournies par EMOPET et ouvrez un ticket/PR pour revue si vous souhaitez que je peaufine la configuration.
