# EMOPET TAG Source Recovery — 22 September 2026

**Status:** CONTROLLED SOURCE-LINEAGE RECOVERY / NOT FABRICATION RELEASE  
**Owner gate:** #499  
**Next gate:** #492 electrical closure  
**Parent physical gate:** #480

## 1. Finding

The current TAG supplier/Claude handoff is internally mixed-version.

The packaged schematic does not contain `U10` / BQ25185 or `BR1`, while the latest native ERC receipt names both. The placement-study PCB also contains the later charge/system-rail and support-network references.

Therefore the latest ERC cannot be used as evidence for edits to the packaged schematic.

## 2. Known delta

The placement-study PCB contains the following references absent from the packaged schematic:

`BR1, C3, C4, C5, C7, C8, C9, C10, C11, C12, C13, C14, C15, C16, D1, L1, R5, R6, R7, R8, R9, R10, RT1, RT2, U10`.

The latest ERC specifically proves that at least `BR1` and `U10` were present in the schematic state on which that ERC ran.

## 3. Recovery rule

Prefer the exact ERC-generating schematic if it can be recovered from a controlled archive.

If it cannot be found, reconstruction is allowed only from:

- `SOURCE_EVIDENCE/`;
- the authoritative capture plan;
- the component capture matrix;
- project-local libraries;
- the placement-study PCB as placement/context evidence;
- the historical ERC as a regression target.

The reference list above is not wiring authority.

## 4. Acceptance

A recovered baseline is accepted only when:

1. it opens in native KiCad;
2. project-local libraries resolve;
3. fresh native ERC is generated;
4. every remaining finding is classified;
5. the repository source-coherence guard passes against the fresh receipt;
6. exact source/evidence hashes are recorded;
7. no routing or Update PCB from Schematic occurs.

Historical 25 errors + 1 warning is useful regression evidence, not a magic acceptance number.

## 5. Boundary

Source recovery must not decide:

- RF/LTE/GNSS topology or matching;
- SIM/eSIM;
- battery/PDN transient sufficiency;
- pogo/enclosure geometry;
- acoustic port/membrane/sealing;
- controlled 50-ohm geometry;
- production BOM freeze;
- any #480 physical-validation row.

Once a coherent baseline exists, #492 may run `/tag-close` for the bounded deterministic electrical closures.

**Gate:** `TAG-SOURCE-COHERENCE = OPEN / RECOVERY COMMAND AVAILABLE / NATIVE RECOVERY PENDING`
