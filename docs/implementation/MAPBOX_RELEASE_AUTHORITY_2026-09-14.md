# EMOPET — Mapbox release-authority checkpoint

**Date:** 2026-09-14  
**Gate:** DATA-LIC-G5 / #116  
**Branch:** `experience-hardening-2026-09-06`  
**Status:** `HOLD / FAIL-CLOSED RUNTIME AUTHORITY`  
**Authority:** engineering control only; not legal sign-off and not product release authority.

## Why this change exists

The existing Mapbox runtime already rejected missing tokens, non-public tokens and any operator gate value other than exact `GO`. That was useful containment, but it still allowed a deployment variable to act as the last production switch.

DATA-LIC-G5 requires a different authority model: token presence and runtime configuration are not proof of account ownership, billing authority, accepted terms, token custody, attribution, privacy review or product-use approval.

## Implemented boundary

`apps/web/lib/mapbox-service-authority.ts` now holds the repository-side service authority. Runtime activation requires all of the following:

1. disposition `GO`;
2. non-empty evidence revision;
3. named reviewer role;
4. dated review that is valid and not in the future;
5. controlled account-authority evidence pointer;
6. controlled billing-authority evidence pointer;
7. controlled accepted-terms receipt pointer;
8. controlled token-custody/scope evidence pointer;
9. controlled rendered-attribution evidence pointer;
10. controlled privacy-review evidence pointer;
11. token scope explicitly limited to `PUBLIC_BROWSER_TOKEN_ONLY`;
12. the deployment gate `NEXT_PUBLIC_EMOPET_MAPBOX_RIGHTS_GATE=GO`;
13. a browser token with the public `pk.` prefix.

The checked-in authority deliberately remains `HOLD`; every service/account evidence pointer is still null. Therefore a public Mapbox token plus `GO` still fails closed today.

Only evidence pointers belong in the repository authority record. Tokens, credentials, invoices, private contracts and personal account material must not be committed.

## Test evidence

`apps/web/lib/__tests__/mapbox-rights.test.ts` now proves that:

- the checked-in service authority is `HOLD`;
- a runtime token and environment flag cannot bypass the repository authority;
- a synthetic reviewed authority must contain the complete evidence set;
- any missing authority, billing, terms, custody, attribution or privacy evidence fails closed;
- only public `pk.` browser tokens are accepted after authority is established;
- secret `sk.` tokens and arbitrary token values remain rejected;
- rights-gate normalization cannot weaken exact `GO` semantics.

## Still open

This checkpoint does **not** close DATA-LIC-G5. Before any controlled `GO`, EMOPET still needs to review and retain controlled evidence for:

- legal/account holder authority for the intended EMOPET use;
- billing owner and applicable plan/volume assumptions;
- exact accepted Mapbox/product terms and review date;
- token custody, scope, rotation and incident handling;
- rendered attribution in the release candidate;
- privacy/data-processing implications of the intended map/location flow;
- named reviewer, review date and evidence revision.

`DATA-LIC-G5 = HOLD / RUNTIME AUTHORITY ENFORCED / ACCOUNT + TERMS + ATTRIBUTION + PRIVACY EVIDENCE OPEN`

`G-THIRD-PARTY-DATA-RIGHTS-01` remains `OPEN`.
