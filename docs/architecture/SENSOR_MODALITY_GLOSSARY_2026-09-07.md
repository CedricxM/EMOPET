# EMOPET — Sensor Modality Glossary

**Control date:** 2026-09-07  
**Status:** `CONTROLLED TERMINOLOGY / NO HARDWARE FREEZE CREATED`  
**Scope:** terminology used across hardware prose, firmware, BLE protocol, shared types and ELI/RSM software.

## Purpose

EMOPET has historical records that use `PVDF` for several different MAT architectures. The same token also exists in current software contracts.

This glossary prevents a material name, a historical topology and a stable software identifier from being silently treated as the same thing.

## 1. Canonical current MAT respiratory terminology

On first technical use, prefer:

> **shielded coaxial PVDF piezo cable channel**

Acceptable shorter forms after first use:

- `coaxial PVDF channel`;
- `piezo channel` when the context is unambiguous;
- `MAT piezo channel`.

Current Phase 0 respiratory architecture consists of **four shielded coaxial piezoelectric/PVDF cable channels**, each with its own analogue front end, acquired synchronously.

Respiratory fusion, when eligible, is among the piezo channels only.

This terminology does **not** freeze production PCB, thresholds, final fusion logic, final stack, or final environmental-reference sensor.

## 2. Canonical software alias

The existing software/protocol identifier:

`pvdf`

is retained as a **stable modality alias** unless a later explicit protocol/schema migration decision changes it.

Canonical meaning:

> `pvdf` = the current MAT coaxial-PVDF piezo sensing modality/channel family. It does not assert flat film, LDT0-028K, six sensing zones, a chest strap, or any other historical geometry.

Examples of identifiers that may remain under this rule:

- `pvdfReliability`;
- sensor/source ID `pvdf`;
- comments referring to `PVDF respiratory` data, provided surrounding prose does not encode a stale topology.

## 3. Historical terms that require explicit qualification

Never use the following as shorthand for current MAT architecture:

- `flat PVDF film`;
- `APT_FC20_MET`;
- `Alqio PVDF film`;
- `LDT0-028K`;
- `six-zone PVDF architecture`;
- `six discrete PVDF sensors`.

When they appear in historical documentation, preserve them with historical/superseded status rather than rewriting the past.

Historical lineage:

`raw-film / Alqio exploration → discrete LDT0-028K branch → four shielded coaxial PVDF piezo cables`

## 4. Load-cell terminology

`load cell` / `cellule de charge` refers to the separate MAT context/gating chain used for functions such as:

- presence;
- weight;
- distribution;
- gross movement;
- stability;
- eligibility/gating/suppression.

Load-cell values are **not** part of respiratory or cardiac fusion merely because they are acquired by the same MAT.

## 5. Environmental-reference terminology

Use:

- `environmental vibration reference`;
- `base/chassis vibration-reference candidate`;
- `reference channel candidate`.

The exact sensor implementation remains a Phase 0 candidate comparison. Do not write a generic MAT `IMU` as if it were already a frozen production component unless a later controlled engineering decision selects it.

## 6. MAT versus TAG topology

MAT respiratory piezo sensing occurs in the instrumented resting surface.

Do not describe the MAT respiratory source as:

- chest strap;
- throat/contact piezo;
- collar sensor;
- skin-contact electrode.

TAG is a separate mobile/contextual wearable workstream. Shared signal names do not collapse MAT and TAG topology.

## 7. Maturity rule

Terminology must not inflate maturity.

The following distinctions are mandatory:

- software field exists ≠ sensor signal demonstrated;
- algorithm path exists ≠ bench feasibility passed;
- synthetic/unit test passes ≠ animal validation exists;
- sensor schema exists ≠ user-facing publication is authorised;
- supplier candidate exists ≠ production component is frozen.

## 8. Change-control rule

Do **not** globally rename `pvdf` fields in BLE, shared types, database or feature schemas merely to make prose look cleaner.

A protocol/schema rename requires, at minimum:

1. compatibility impact review;
2. migration/versioning decision;
3. affected producer/consumer inventory;
4. explicit engineering approval;
5. documentation update in the same change set.

Until then, keep the alias and make its meaning explicit.

## 9. Repository application

This glossary controls terminology reconciliation for, among other surfaces:

- `docs/firmware_protocol.md`;
- `packages/ble-protocol/**`;
- `packages/shared/**`;
- ELI/RSM sensor/source identifiers;
- assistant-context technical summaries;
- future MAT Phase 0 implementation documentation.

Where a later controlled hardware authority conflicts with this glossary, the later hardware authority wins and this glossary must be revised rather than silently stretched.
