# OPEN-DOC-002 — Source release-control manifest hash mismatch

**Repository handling:** `OPEN / INTERNAL CONTROLLED / NOT RELEASED`  
**R2 status:** CLOSED FOR DIAGNOSIS / OPEN FOR NEXT-RELEASE REMEDIATION  
**Priority:** CRITICAL — NEXT RELEASE  
**Category:** OPEN-DOC  
**Native item:** N/A  
**Owner:** Document Control  
**Active count:** YES — NEXT RELEASE ONLY

## Evidence required

New manifest and SHA256SUMS generated only after final remediated files are frozen; 100% verification pass.

## Next controlled action

Preserve source ZIP unchanged; generate fresh release-control artifacts only at end of next controlled release pipeline.

## Authority source

RELEASE-CONTROL-001; source GLOBAL_MANIFEST.csv; source SHA256SUMS.txt

## Closure authority

Final release-control verification + controlled approval

## Notes

Original package remains immutable and is not release-ready; diagnosis is complete.

---

GitHub availability is custody only. It does not close this gate or establish release,
transmission, manufacturing, validation, component selection, legal advice, funding,
scientific performance or publication authority.
