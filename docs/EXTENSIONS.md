# EmoPet v6 — Extensions optionnelles (services annexes)

> EmoPet fournit des observations et tendances. Il ne s’agit pas d’un diagnostic et cela ne remplace pas l’avis d’un vétérinaire.

Ces extensions ajoutent des services “produit” **sans modifier** le noyau EmoPet (endpoints core + schémas JSON inchangés).  
Elles sont **désactivées par défaut** et activables par feature flags.

Références:
- Référence officielle: `EMOPET_OFFICIAL_SPEC.md`

## Activation (feature flags)
Les routes ne sont incluses dans l’API **que si** les flags sont activés (sinon `404`).

Variables d’environnement:
- `EMOPET_FEATURE_FOOD=true` → active `/food/*`
- `EMOPET_FEATURE_DAILY_LIFE=true` → active `/daily/*`
- `EMOPET_FEATURE_COMMUNITY=true` → active `/community/*`
- `EMOPET_FEATURE_LOCAL=true` → active `/local/*`
- `EMOPET_FEATURE_ECOSYSTEM=true` → active `/ecosystem/*`

Mode démo / formulation:
- `EMOPET_EXT_MOCK=true` (par défaut: `true`) → valeurs synthétiques si stockage vide
- `EMOPET_PRUDENCE_MODE=true` (par défaut: `true`) → formulations plus prudentes + incertitude renforcée

Stockage local (démo):
- `EMOPET_EXT_DIR=data/extensions` (par défaut: `data/extensions`)

## Lancer l’API avec extensions (PowerShell)
```powershell
$env:EMOPET_FEATURE_FOOD="true"
$env:EMOPET_FEATURE_DAILY_LIFE="true"
$env:EMOPET_FEATURE_COMMUNITY="true"
$env:EMOPET_FEATURE_LOCAL="true"
$env:EMOPET_FEATURE_ECOSYSTEM="true"

# optionnel: dossier de stockage extensions
$env:EMOPET_EXT_DIR="data/extensions"

python -m uvicorn src.api.emopet_api:app --reload --host 127.0.0.1 --port 8000
```

## Endpoints (résumé)

### (1) Alimentation — logistique (pas nutrition médicale)
- `GET /food/stock` : inventaire + jours restants (avec incertitude)
- `POST /food/stock` : ajouter un item (nom/quantité/format)
- `GET /food/estimate` : estimation prudente (planning, pas recommandation)
- `GET /food/history` : timeline déclarée (ouverture/ajout/notes)
- `POST /food/history` : ajouter un événement déclaré
- `GET /food/reorder` : panier/logistique + liens partenaires (stub)

### (2) Vie quotidienne — journal & routines
- `GET /daily/journal` : événements déclarés (tags, note, photo_ref optionnelle)
- `POST /daily/journal` : ajouter un événement
- `GET /daily/routines` : tendances observées + dérives douces (sans diagnostic)
- `GET /daily/trends` : série agrégée (7 jours par défaut)

### (3) Communauté — service (pas réseau social)
- `GET /community/collective_insights` : cartes anonymisées (descriptif/stat)
- `GET /community/spaces` : espaces thématiques + charte
- `GET /community/spaces/{space_id}/threads` : discussions par thème
- `POST /community/spaces/{space_id}/threads` : créer un sujet
- `GET /community/threads/{thread_id}/posts` : messages (chronologique)
- `POST /community/threads/{thread_id}/posts` : publier (pseudonyme par défaut)
- `POST /community/report` : signaler (stub)

### (4) Local — rencontres consenties (zones larges)
- `GET /local/slots` : créneaux + zones **larges** (pas d’adresse, pas de position)
- `POST /local/opt_in` : opt‑in (pseudonyme, chat éphémère)
- `GET /local/chat/{session_id}` : récupérer messages
- `POST /local/chat/{session_id}` : envoyer un message
- `POST /local/chat/{session_id}/close` : clôturer
- `POST /local/block` : blocage (stub)

### (5) Écosystème — connecteurs & export contrôlé
- `GET /ecosystem/connectors` : connecteurs “observateur” (stub)
- `POST /ecosystem/export_summary` : créer un export JSON (token + expiration + contenu)
- `GET /ecosystem/export_summary/{token}` : récupérer l’export
- `POST /ecosystem/export_summary/{token}/revoke` : révocation
