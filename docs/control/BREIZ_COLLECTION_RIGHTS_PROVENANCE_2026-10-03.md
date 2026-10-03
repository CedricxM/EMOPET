# Breiz — collection rights provenance snapshot

**Date:** 2026-10-03  
**Status:** `CONTROLLED MODEL / NO SOURCE PROMOTED`

## Decision

Every controlled third-party collection provenance must retain the exact reviewed rights authority that permitted that collection.

This is distinct from current runtime authorization:

- **historical provenance** answers which reviewed authority governed the collection;
- **runtime revalidation** answers whether that same authority is still valid for the requested product use now.

## Provenance snapshot

`BreizSourceProvenance` now retains:

- rights authority revision;
- immutable source version;
- rights receipt path;
- rights attribution text;
- permitted-use summary;
- allowed product uses;
- rights review timestamp;
- rights recheck timestamp;
- reviewer role.

The DATAtourisme loader copies those fields only from the controlled source registry rights evidence.

Payload data cannot mint or override the rights snapshot.

## Product-use separation

Collection requires the source to be release-ready for `INGESTION`.

A DATAtourisme Context Card is a later product projection and therefore requires current `PUBLIC_ANSWER_WITH_SOURCE` authority in addition to a matching historical provenance snapshot.

This prevents an ingestion-only grant from silently becoming public-answer permission.

## Runtime revalidation

`matchesBreizProvenanceRightsAuthority()` is the reusable fail-closed gate for comparing historical collection provenance with the current controlled source authority.

A mismatch in any material authority field blocks live use, including:

- authority revision;
- immutable source version;
- receipt path;
- attribution text;
- permitted-use summary;
- product-use scope;
- review/recheck timestamps;
- reviewer role;
- source identity or licence.

A later registry edit therefore cannot silently rewrite the authority under which historical data was collected.

## Freshness correction

Source provenance freshness now distinguishes a future retrieval timestamp from a valid fresh timestamp.

`future_retrieval_date` fails closed.

## Boundary

This slice does not:

- promote DATAtourisme to GO;
- add a live DATAtourisme receipt;
- grant public-answer rights to any current source;
- compute or verify content cryptographic hashes;
- close #116 or #835;
- assert legal sufficiency.

Content-integrity hashing remains a separate follow-up because the current web runtime has no approved synchronous SHA-256 primitive for the document/chunk pipeline.

Related: #116, #835, #821.
