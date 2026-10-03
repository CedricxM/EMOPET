# Breiz — product-use scoped rights and controlled public promotion

**Date:** 2026-10-02  
**Status:** `CONTROLLED MODEL / NO SOURCE PROMOTED`

## Problem closed by this slice

A rights record could previously be `GO` without machine-readable separation between:

- permission to ingest data;
- permission to use that data in a public answer.

The repository also knew how to validate immutable `source_authority_binding` metadata at retrieval time, but no production promotion boundary minted that binding from the controlled source registry.

## Product-use scopes

Every `BreizRightsEvidence` now carries explicit product-use scopes:

- `INGESTION`;
- `PUBLIC_ANSWER_WITH_SOURCE`.

A source may be reviewed for ingestion without being authorized for public answers.

`evaluateBreizSourceRights()` requires `INGESTION` before ingestion can be permitted.

Public registry-backed answer paths require `PUBLIC_ANSWER_WITH_SOURCE` in addition to normal release readiness.

## Controlled promotion

`promoteBreizDocumentForPublicAnswer()` is the controlled transition from a neutral document to a public-answer document.

The transition only accepts a document that is:

- `reliability_level = unknown`;
- `allowed_usage = retrieval_only`;
- not already registry-bound.

The transition refuses mocks, community-pending content, internal-reference content, do-not-answer content and already-bound documents.

Authority fields are minted only from the reviewed registry source:

- source registry id;
- authority revision;
- immutable source version;
- receipt path;
- source name and canonical URL;
- licence;
- attribution;
- permitted-use summary;
- allowed product uses;
- review timestamp;
- recheck timestamp;
- reviewer role.

Payload-provided authority fields do not participate.

## Anti-retroactivity

The document binding snapshots the exact reviewed authority state.

Retrieval compares the binding against the current reviewed registry record. A chunk fails closed when any material authority field drifts under the same nominal revision, including:

- product-use scope;
- permitted-use summary;
- review/recheck timestamps;
- reviewer role;
- source identity, licence, attribution, receipt or immutable source version.

Changing a registry review therefore cannot silently lend new authority to historical chunks.

## Vector-store boundary

Vector export preserves the complete authority snapshot required for later audit and release checks.

## Boundary

This slice does not:

- promote any current source to GO;
- create a DATAtourisme rights receipt;
- resolve the Bretagne RNR licence clarification;
- close #116 or #835;
- assert legal sufficiency.

It only makes product-use authority explicit and fail-closed.

Related: #116, #835, #821.
