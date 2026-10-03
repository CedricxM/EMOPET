# DATAtourisme API — CGU / reuse clarification outreach

**Date prepared:** 2026-10-03  
**State:** `DRAFT_NOT_SENT / NO PARTNERSHIP CLAIM / RUNTIME HOLD`

## Purpose

Resolve the remaining authority ambiguity before EMOPET considers any runtime DATAtourisme source promotion.

EMOPET is not requesting endorsement, partnership status, exclusivity or scientific validation.

## Context to provide

EMOPET is reviewing a bounded use of the public DATAtourisme API for Bretagne event/POI metadata.

The current technical slice is intentionally limited to fields such as:

- DATAtourisme identifier / UUID;
- canonical URI;
- event label/type;
- structured territorial fields;
- producer attribution / `HasBeenCreatedBy`;
- provider last-update timestamp;
- retrieval timestamp.

Contacts, media and free-form descriptions are not part of the initial controlled slice.

## Clarification request

Suggested message:

> Bonjour,
>
> Nous préparons une intégration très limitée de l’API publique DATAtourisme pour afficher du contexte événementiel en Bretagne, avec conservation de la paternité et de la date de dernière mise à jour.
>
> Avant toute activation, nous souhaitons confirmer précisément le cadre applicable à l’API v1.
>
> 1. Le formulaire actuel de demande de clé API renvoie vers le document « Conditions Générales d’Utilisation – Interface diffuseurs DATAtourisme – v2.0 – 23/08/2022 ». Pouvez-vous nous confirmer que ce document constitue bien les CGU actuellement applicables à l’utilisation de l’API publique `api.datatourisme.fr/v1` ?
> 2. Pouvez-vous confirmer que les données retournées par l’API v1 sont réutilisables sous Licence Ouverte 2.0 ?
> 3. Pour une réutilisation API, la mention du producteur portée par `HasBeenCreatedBy` ainsi que la date de dernière mise à jour constituent-elles les éléments d’attribution attendus, ou faut-il afficher/conserver une mention complémentaire ?
> 4. Une réutilisation limitée aux identifiants, URI, libellés/types, champs territoriaux structurés, paternité et dates de mise à jour appelle-t-elle une condition supplémentaire particulière ?
> 5. Existe-t-il un mécanisme/versionnement officiel permettant d’être informé d’une évolution des CGU ou des conditions de réutilisation de l’API ?
>
> Notre objectif est uniquement de documenter correctement les droits et obligations avant activation.
>
> Merci par avance pour votre aide.

## Evidence handling on reply

A reply must not directly flip runtime state.

The response should first be recorded with:

- responder identity/role where available;
- response date;
- exact answers;
- evidence pointer;
- API/CGU version applicability;
- attribution requirement;
- recheck/versioning rule;
- source version or authority scope that the answer covers.

Ambiguous or incomplete answers keep:

- DATAtourisme `enabled: false`;
- no runtime `GO` rights evidence;
- no product-use scope;
- no live-fetch authority.

## Related evidence

- `docs/control/DATATOURISME_SOURCE_EVIDENCE_2026-10-01.md`
- `data/registry/receipts/datatourisme-api-rights-observation-2026-10-03.json`
- #835
- historical third-party data-rights controls tracked from #116
