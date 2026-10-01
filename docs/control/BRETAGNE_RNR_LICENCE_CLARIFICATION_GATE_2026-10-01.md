# Bretagne RNR — licence version clarification gate

**Date:** 2026-10-01  
**Dataset:** `reserves-naturelles-regionales-de-bretagne`  
**Source version:** `sha256:65ff0d253fd1a1bddd6ce05389fe4b35c8946cfbcd8787c9d5afaee092506cd0`  
**State:** `HOLD_AUTHORITATIVE_CLARIFICATION_REQUIRED`

## Why this gate exists

The controlled live-schema evidence now proves the dataset identity, 17-field
schema, source version and stable zero-row observation path.

It does **not** reconcile the licence version.

Current public evidence contains three materially different signals:

1. the exact Région Bretagne API metadata exposes a generic `Licence ouverte`
   label, includes the canonical Etalab licence page, and also exposes the
   legacy Etalab PDF URL under a 2014 path;
2. the current canonical Etalab page resolves to **Licence Ouverte 2.0**;
3. the data.gouv.fr mirror labels this exact dataset
   **Licence Ouverte / Open Licence version 2.0**.

Independent archival identification ties the exact legacy 2014 Etalab PDF URL
to **Licence Ouverte 1.0**.

The repository therefore preserves both observations instead of pretending the
version mismatch does not exist.

## Controlled register

`data/registry/receipts/bretagne-rnr-licence-clarification-v1.json`

The register is bound to the same source version as the durable schema receipt.

It requires:

- explicit HOLD while the conflict is unresolved;
- no release authority;
- exact primary API, canonical licence, mirror and legacy-PDF observations;
- a bounded clarification request;
- a primary-publisher confirmation before any future `GO`;
- the confirmation to bind the exact source version;
- exact applicable licence version and attribution obligation.

## Clarification request to the publisher

No message has been sent by this PR.

A future outreach should ask Région Bretagne, for this exact dataset:

1. Which version of Licence Ouverte applies to the dataset as currently
   published?
2. Is the legacy
   `https://www.etalab.gouv.fr/wp-content/uploads/2014/05/Licence_Ouverte.pdf`
   URL in the API metadata stale metadata, or is it still the intended legal
   code pointer?
3. What attribution should a product display, including whether the last update
   date of the reused information must be shown?
4. Are API/download uses subject to any additional portal/service conditions
   beyond the dataset licence?

A response is not automatically a GO. The response must be preserved as a
controlled evidence reference and reviewed against the exact source version.

## Promotion rule

The validator rejects `GO` unless all of the following are true:

- `reconciliationState = CONFIRMED`;
- `runtimeRightsDisposition = GO`;
- `releaseAllowed = true`;
- confirmation authority is
  `PRIMARY_PUBLISHER_CONFIRMATION`;
- evidence reference, confirmation date and reviewer role are present;
- applicable licence version is explicit;
- attribution obligation is explicit;
- confirmation binds source version
  `sha256:65ff0d253fd1a1bddd6ce05389fe4b35c8946cfbcd8787c9d5afaee092506cd0`.

## Important boundary

This gate is engineering governance, not legal advice.

Even after licence reconciliation, the dataset remains separately subject to:

- field approval;
- schema freshness;
- provenance binding;
- runtime normalisation;
- semantic limits.

Reserve identity/location alone never establishes dog access, leash rules,
opening hours, safety or dog-friendliness.

Related: #946, #950, #939, #116, #836.
