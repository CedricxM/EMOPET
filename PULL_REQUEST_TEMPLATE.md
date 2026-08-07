# Pull Request: Add ChatGPT plugin & OAuth2 integration for EMOPET

This PR adds a ChatGPT plugin manifest (ai-plugin.json), a minimal OpenAPI spec (openapi.yaml), example environment variables, GitHub Actions workflows to validate the plugin files, and a checklist documenting the OAuth2 Authorization Code + PKCE integration steps.

What to update after merge
- Replace placeholder URLs in ai-plugin.json and openapi.yaml:
  - authorization_url
  - token_url
  - openapi server URL (EMOPET API)
  - logo_url / contact_email / legal_info_url
- Register an OAuth client in EMOPET and add the redirect URI listed in docs/EMOPET_OAuth_checklist.md
- Add repository secrets: EMOPET_CLIENT_ID and EMOPET_CLIENT_SECRET (optional if using PKCE) and EMOPET_URL

Checklist for reviewers
- Verify OpenAPI paths and schemas correspond to EMOPET endpoints
- Confirm the recommended scopes and adjust if necessary
- Confirm the redirect URI and PKCE usage align with EMOPET OAuth configuration

-----

This PR was created by an automated assistant (GitHub Copilot Chat Assistant).