# EMOPET — Région Bretagne RNR licence clarification outreach pack

**Date:** 2026-10-02  
**Status:** `DRAFT_NOT_SENT / PRIMARY_PUBLISHER_CONFIRMATION_REQUIRED / NO RIGHTS GO`  
**Dataset:** `reserves-naturelles-regionales-de-bretagne`  
**Bound source version:** `sha256:65ff0d253fd1a1bddd6ce05389fe4b35c8946cfbcd8787c9d5afaee092506cd0`

## 1. Purpose

Prepare one bounded clarification request to the primary publisher of the exact Région Bretagne dataset.

This document does not:
- send outreach;
- infer a licence version;
- create a legal conclusion;
- grant reuse rights;
- promote the dataset to `RELEASE_READY`;
- approve runtime ingestion.

The current runtime disposition remains `HOLD`.

## 2. Controlled evidence conflict

The repository intentionally preserves the current conflict instead of guessing:

1. the primary Région Bretagne API metadata exposes a generic `Licence ouverte` label and canonical Etalab licence page;
2. the same metadata also exposes the legacy 2014 Etalab PDF URL;
3. the current canonical Etalab page identifies Licence Ouverte 2.0;
4. the data.gouv.fr mirror identifies this dataset as Open Licence 2.0;
5. archival identification associates the exact legacy 2014 PDF URL with Licence Ouverte 1.0.

The exact controlling version for the bound source snapshot therefore requires primary-publisher clarification.

## 3. Official target and verified delivery channel

Target authority:

`Région Bretagne / primary publisher of reserves-naturelles-regionales-de-bretagne`

Primary dataset/API reference:

`https://data.bretagne.bzh/api/explore/v2.1/catalog/datasets/reserves-naturelles-regionales-de-bretagne`

Région Bretagne open-data portal:

`https://data.bretagne.bzh/`

Verified public institutional delivery channel as of 2026-10-02:

- role: `PRADA — personne responsable de l’accès aux documents administratifs et des questions relatives à la réutilisation des informations publiques`;
- email: `prada@bretagne.bzh`;
- official Région Bretagne reference: `https://www.bretagne.bzh/region/vos-droits/`;
- CADA directory reference: `https://www.cada.fr/conseil-regional-de-bretagne`.

The Région Bretagne public rights page states that its PRADA receives requests concerning access to administrative documents and licences for reuse of public information. The CADA directory identifies the same institutional mailbox.

This confirms a role-based public delivery route only. It does not prove that a message was sent, received or answered, and it does not create any rights or partnership state.

Do not store private personal contact details in this repository.

## 4. Exact questions to send

For the dataset `reserves-naturelles-regionales-de-bretagne` as currently published, please confirm:

1. Which version of Licence Ouverte applies to this dataset: 1.0, 2.0, or another version?
2. Is the legacy URL
   `https://www.etalab.gouv.fr/wp-content/uploads/2014/05/Licence_Ouverte.pdf`
   still an intended legal-code pointer for this dataset, or is it stale metadata?
3. What exact attribution should a product display when reusing the dataset?
4. Must the last update date of the reused information be displayed as part of that attribution?
5. Are API/download uses subject to additional portal or service conditions beyond the dataset licence?
6. Does the clarification apply to the exact source snapshot currently bound in EMOPET:
   `sha256:65ff0d253fd1a1bddd6ce05389fe4b35c8946cfbcd8787c9d5afaee092506cd0`?

If the publisher cannot bind its answer to this hash, preserve the reply as evidence and re-observe the current primary API snapshot before any promotion decision.

## 5. Draft outreach

**Subject:** Clarification de licence — jeu de données « Réserves naturelles régionales de Bretagne »

Bonjour,

Nous développons EMOPET, un projet technologique basé à Lorient, et nous évaluons actuellement l’utilisation très limitée de données territoriales publiques dans une couche régionale de notre produit.

Nous avons identifié le jeu de données Région Bretagne :

`reserves-naturelles-regionales-de-bretagne`

Avant toute utilisation en production, nous souhaitons clarifier avec le producteur la version exacte de la Licence Ouverte applicable à ce jeu de données, car les métadonnées publiques que nous observons exposent à la fois la page canonique Etalab actuelle et un ancien lien PDF de 2014.

Pourriez-vous nous confirmer :

- la version exacte de la Licence Ouverte applicable au jeu de données tel qu’il est actuellement publié ;
- si le lien PDF Etalab de 2014 présent dans les métadonnées est toujours le pointeur juridique voulu ou une métadonnée devenue obsolète ;
- la mention d’attribution exacte à afficher en cas de réutilisation ;
- s’il est nécessaire d’afficher également la date de dernière mise à jour des informations réutilisées ;
- et si l’accès par API ou téléchargement est soumis à d’autres conditions de service que la licence du jeu de données elle-même ?

Notre objectif n’est pas de demander une validation générale du produit ni une autorisation implicite sur l’ensemble du portail. Nous cherchons uniquement à documenter correctement les droits applicables à ce jeu de données précis avant toute activation.

Merci par avance pour votre aide.

Bien cordialement,

Cédric Mian  
EMOPET  
Lorient

## 6. Controlled response intake

A reply is evidence, not automatic release authority.

Before any future `GO`, the controlled register must receive a reviewed `authoritativeConfirmation` with:

- `authorityType = PRIMARY_PUBLISHER_CONFIRMATION`;
- `evidenceRef` — controlled reference to the preserved reply;
- `confirmedAt`;
- `confirmedByRole`;
- `applicableLicenceVersion` — explicit `1.0` or `2.0` under the current validator;
- `attributionRequirement`;
- `appliesToSourceVersion = sha256:65ff0d253fd1a1bddd6ce05389fe4b35c8946cfbcd8787c9d5afaee092506cd0`.

If the reply is ambiguous, does not bind the applicable licence version, or cannot be tied to the current source version, keep:

- `reconciliationState = HOLD_AUTHORITATIVE_CLARIFICATION_REQUIRED`;
- `runtimeRightsDisposition = HOLD`;
- `releaseAllowed = false`.

## 7. Independent gates remain required

Even a fully satisfactory publisher confirmation does not by itself release the dataset.

Separate controls still apply for:

- field minimisation approval;
- exact schema freshness;
- provenance binding;
- manual repository/code review;
- runtime normalisation;
- semantic boundaries.

Reserve identity/name/location data never establishes dog access, leash rules, opening hours, safety or dog-friendliness.

## 8. Repository transition rule

Current state:

`DRAFT_NOT_SENT -> OUTREACH_SENT -> RESPONSE_RECEIVED -> PRIMARY_PUBLISHER_CONFIRMATION_REVIEWED -> manual runtime evidence patch`

No transition may skip the human review step.

Related:
- #836 — Région Bretagne dataset allow-list;
- #116 — third-party data/service rights;
- merged #982 — licence clarification gate;
- merged #995/#996/#997 and #1000 — field-minimisation review chain.
