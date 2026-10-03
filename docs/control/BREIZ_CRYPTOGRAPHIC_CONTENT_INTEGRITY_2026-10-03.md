# Breiz — cryptographic document and chunk integrity

**Date:** 2026-10-03  
**Status:** `CONTROLLED MODEL / NO SOURCE PROMOTED`

## Decision

Rights authority and content freshness are not enough to prove that the text served to Breiz is the same text that was reviewed.

Public source-backed content therefore gains two SHA-256 integrity boundaries:

1. **document payload snapshot** at controlled promotion;
2. **chunk content digest** at verified public chunking.

Both use Web Crypto `SHA-256`.

## Canonical document payload

The document digest covers the fact-bearing and retrieval-relevant payload in a stable field order:

- id;
- title;
- source identity fields;
- licence;
- territory / region / department / commune;
- theme;
- tags;
- summary;
- content;
- reliability level;
- last checked timestamp;
- allowed usage.

The authority binding itself is excluded to avoid a digest cycle.

The resulting SHA-256 is stored as:

`source_authority_binding.document_payload_sha256`.

Changing a factual field after promotion invalidates the snapshot.

## Controlled promotion

`promoteBreizDocumentForPublicAnswer()` is now asynchronous.

It:

1. checks source rights and content freshness;
2. creates the controlled public document shape;
3. computes the canonical SHA-256 payload snapshot;
4. stores that digest in the immutable authority binding;
5. validates the final promoted document.

If Web Crypto is unavailable or the digest cannot be created, promotion fails closed.

## Chunking boundary

Synchronous chunking is not permitted for authority-bound public documents.

`chunkVerifiedBreizPublicDocument()` first recomputes and verifies the document payload digest. Only then does it emit chunks.

Every emitted chunk receives its own SHA-256 of the exact chunk text.

A document mutated after promotion therefore cannot enter the public vector path.

## Retrieval boundary

The existing synchronous retrieval path remains for mock/local content and never serves authority-bound public chunks.

`retrieveBreizVerifiedLocalKnowledge()` is the public verified path.

Before accepting a chunk it requires:

- current source/public-answer authority;
- matching immutable rights binding;
- current content freshness;
- valid document payload digest metadata;
- valid chunk digest metadata;
- a successful SHA-256 recomputation of the exact chunk text.

A vector-store mutation therefore fails closed even when every rights field still looks valid.

## Vector metadata

Vector export preserves:

- document payload SHA-256;
- chunk content SHA-256;
- existing source/rights binding metadata.

## Boundary

This slice does not:

- promote any current source;
- make DATAtourisme live;
- replace rights or freshness review;
- persist cryptographic digests to a production vector database;
- close #116 or #835;
- assert legal sufficiency.

It only makes content mutation detectable and fail-closed along the controlled public document/chunk path.

Related: #116, #835, #821.
