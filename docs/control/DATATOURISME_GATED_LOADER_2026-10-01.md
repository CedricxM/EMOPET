# DATAtourisme — rights-gated Bretagne events loader

**Date:** 2026-10-01  
**Status:** `IMPLEMENTED GATE / LIVE NETWORK PATH BLOCKED BY CURRENT RIGHTS STATE`

## Purpose

PR #839 defines the bounded DATAtourisme request and response contract.

This follow-up adds the actual network boundary while preserving the existing source-rights gate.

## Execution order

The loader performs checks in this order:

1. controlled source exists in the Breiz source registry;
2. source is release-ready through `isBreizSourceReleaseReady()`;
3. provider feature flag and API key can prepare a bounded request;
4. generated URL is rechecked against exact HTTPS origin/path;
5. GET request executes with bounded timeout and `redirect: error`;
6. response must be valid JSON;
7. event payload is normalised/minimised;
8. every retained record receives item-level provenance.

This order is deliberate.

A secret being present does not grant source rights.

As of 2026-10-03, every retained DATAtourisme event provenance also snapshots the exact reviewed rights authority that permitted collection. A later Context Card must match that historical snapshot against the current controlled authority and requires explicit `PUBLIC_ANSWER_WITH_SOURCE`; ingestion authority alone cannot become public-answer authority.

As of the 2026-10-02 hardening, a registry licence string does not grant ingestion rights either. `evaluateBreizSourceRights()` requires a controlled `rightsEvidence` record with a confirmed source state, GO disposition, immutable source/version pointers, receipt path, attribution, permitted-use summary, reviewer role and a parseable review timestamp. Missing, HOLD, unverified or structurally incomplete evidence fails closed as `NO_RIGHTS_EVIDENCE`.

This is a technical evidence-presence gate, not a legal opinion. #116 remains open until the underlying rights review is actually completed.

## Current runtime behaviour

With the current repository source entry:

- `datatourisme.enabled = false`;
- `datatourisme.license = null`;
- no release-ready `rightsEvidence` exists.

Therefore:

`loadDatatourismeBretagneEvents() -> SOURCE_RIGHTS_HOLD`

and **no network call is made**.

Tests inject a fetch function that throws if called and prove the call count remains zero.

## Retained provenance

When the source is eventually release-ready, each retained event will carry:

- controlled source ID/name;
- event canonical URI when present;
- record producer attribution;
- retrieval timestamp;
- provider update timestamp;
- territory;
- response content type;
- reviewed source licence;
- permitted-use policy;
- freshness policy;
- source authority class.

A record that cannot receive complete provenance is discarded from the result.

## Security boundaries

The loader:

- accepts only the fixed `https://api.datatourisme.fr/v1/entertainmentAndEvent` request;
- uses `redirect: error`;
- has a bounded timeout;
- never returns credentials;
- does not log request headers;
- does not bypass source rights when credentials exist.

## Remaining gate

This loader is not a reason to enable the source.

Before the registry can move to GO, #835 still requires:

- immutable licence/CGU evidence;
- attribution format;
- recheck/expiry rule;
- controlled rights review;
- exact resulting permitted-use scope.

Related:
- PR #839
- #835
- #116
- #827
