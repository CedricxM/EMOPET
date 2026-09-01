# EMOPET Source Materialization Custody Recovery

**Document ID:** QA-CUSTODY-RECOVERY-003  
**Revision:** 1.0  
**Date:** 2026-08-29  
**Status:** PASS_WITH_NOTES — NEW ISOLATED MATERIALIZATION 430/430 VERIFIED  
**Classification:** INTERNAL CONTROLLED

## Result

The immutable source ZIP remains unchanged at SHA-256 `f464f15959e2010e77302289d8622129673af613d3350bb863b85173b270b376`. A new isolated materialization was created and verified byte-for-byte against every archive member.

| Control | Result |
|---|---:|
| ZIP compressed-data test | PASS |
| Archive files | 430 |
| New materialization files | 430 |
| Byte-identical | 430/430 |
| Missing / extra / mismatched | 0 / 0 / 0 |

## Canonical operational source

`EMOPET_DOCUMENT_CONTROL_2026/00_INVENTORY/CONTROLLED_MATERIALIZATIONS/EMOPET_GLOBAL_CURRENT_2026-08-25_EXACT_FROM_ZIP_2026-08-29/EMOPET_GLOBAL_CURRENT_2026-08-25`

The legacy snapshot remains preserved at its existing path but is non-canonical for future source-dependent work.

## Legacy mismatch retained

`01_BASELINE_THROUGH_2026-08-24_1938Z/EMOPET_BASELINE_v3.0_CONTROLLED/06_BRAND_AND_PUBLIC/institutional_presentation/BRD-PUB-001_EMOPET_Institutional_Presentation_FR_r1.0.pdf`

| Measure | Immutable ZIP | Legacy snapshot |
|---|---:|---:|
| Bytes | 2212912 | 1879040 |
| SHA-256 | `b6ba7cdc8b8d24095acaee7f2c314248050a092b341c98eddc5856b607b3c47b` | `32e7809c6a33a3c3332effa7034601ede5852e9abd1ef87ffd6370acd16f5288` |

## Root-cause disposition

The observed legacy divergence is confirmed. The mechanism of post-materialization truncation or mutation is not evidenced and is not inferred. Operational custody is nevertheless recovered because a separately located, clean materialization now passes 430/430 byte comparison and the divergent legacy tree is preserved for audit.

## Gate disposition

`OPEN-DOC-008` can be closed for operational source custody. This does not close `OPEN-DOC-002`, does not repair the original package, and does not promote any source document to released or validated status.
