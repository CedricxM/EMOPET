# Région Bretagne Open Data — RNR licence clarification packet

**Date:** 2026-10-01  
**Dataset:** `reserves-naturelles-regionales-de-bretagne`  
**State:** `PREPARED / NOT SENT / SOURCE-AUTHORITY CLARIFICATION REQUIRED`

## Purpose

Request one narrow clarification before EMOPET reuses record-level data from
the Région Bretagne dataset **Réserves naturelles régionales de Bretagne**.

This is not a partnership request, endorsement request, legal-advice request,
or request to validate EMOPET scientifically.

## Observed source facts

Dataset identifier:

`reserves-naturelles-regionales-de-bretagne`

Official source:

https://data.bretagne.bzh/explore/dataset/reserves-naturelles-regionales-de-bretagne/

The live Région Bretagne Explore API currently exposes a generic
`Licence ouverte` value and a licence URL resolving to the historical Etalab
Licence Ouverte document that identifies itself as **version 1.0**.

The data.gouv mirror for the same dataset labels the licence
`Licence Ouverte / Open Licence version 2.0`, while also warning that
metadata from the original external portal may have been lost during
harvesting.

The Région Bretagne portal also contains datasets explicitly labelled
`Licence Ouverte v2.0 (Etalab)`. Therefore EMOPET is not treating the entire
portal as one blanket licence.

## Exact question to send

> Bonjour,
>
> Nous préparons une réutilisation très limitée du jeu de données
> « Réserves naturelles régionales de Bretagne »
> (`reserves-naturelles-regionales-de-bretagne`) dans EMOPET.
>
> La métadonnée du portail Région Bretagne indique actuellement « Licence
> ouverte » et renvoie vers un document Etalab historique correspondant à la
> Licence Ouverte 1.0, tandis que la fiche data.gouv du même jeu indique
> « Licence Ouverte / Open Licence version 2.0 ».
>
> Pour éviter de déduire nous-mêmes la version applicable, pourriez-vous nous
> confirmer :
>
> 1. la version exacte de la Licence Ouverte applicable aujourd'hui à ce jeu de
> données ;
> 2. la formulation d'attribution attendue pour une réutilisation publique et
> potentiellement commerciale des champs minimaux `id`, `nom` et
> `geo_point_2d` ?
>
> Nous ne demandons ni endorsement, ni validation scientifique, ni droit de
> scraper d'autres contenus du portail. Tant que ce point n'est pas clarifié,
> l'ingestion reste désactivée de notre côté.
>
> Merci.

## Evidence requested back

A reply is sufficient only if it identifies the applicable licence version and
attribution wording for this exact dataset.

A corrected official dataset metadata page naming the version explicitly is
also sufficient.

## What must not happen automatically

A reply does not by itself:

- enable runtime ingestion;
- authorize extra fields;
- authorize media or descriptions;
- imply dog access or dog-friendliness;
- create a partnership;
- authorize logo use;
- validate EMOPET scientifically.

After confirmation, the answer must be converted into a controlled rights
receipt bound to source version
`sha256:65ff0d253fd1a1bddd6ce05389fe4b35c8946cfbcd8787c9d5afaee092506cd0`.

Related: #939, #944, #946, #116, #836.
