---
description: Recover a coherent TAG KiCad schematic revision before running /tag-close
---

# /tag-recover

You are executing EMOPET TAG source recovery under issue #499.

This command exists because the current supplier/Claude workspace can contain a mixed-version TAG state: the latest ERC and PCB may represent a later capture than the packaged schematic.

The goal is **source-lineage recovery**, not new electrical design.

## 0. Read authority first

Read, in order:

1. `AGENTS.md`
2. `CLAUDE.md`
3. `docs/hardware/tag/TAG_SOURCE_RECOVERY_2026-09-22.md`
4. `docs/hardware/tag/TAG_ELECTRICAL_CLOSURE_2026-09-22.md`
5. issue #499 if GitHub access is available
6. the current TAG capture plan, component matrix, blocker register and source-evidence files beside the KiCad project

If controlled sources conflict, stop and report the conflict.

## 1. Locate one TAG working set

Search the current workspace and explicitly added Claude Code directories for:

- `EMOPET_TAG_REV_B_SCHEMATIC_CAPTURE_STARTER.kicad_pro`
- matching `.kicad_sch` and `.kicad_pcb`
- `EMOPET_TAG_AUTHORITATIVE_CAPTURE_PLAN.csv`
- `EMOPET_TAG_COMPONENT_CAPTURE_MATRIX.csv`
- `EMOPET_TAG_OPEN_BLOCKERS.csv`
- `SOURCE_EVIDENCE/`
- the latest `ERC*.rpt`

If any of the controlled source-evidence files are absent, STOP. Do not reconstruct from memory or from the PCB alone.

If multiple plausible projects exist, ask which working set is current.

## 2. Prove the mismatch before changing anything

Run:

```bash
node scripts/hardware/tag-source-coherence.mjs \
  --schematic "<current .kicad_sch>" \
  --erc "<latest native ERC receipt>" \
  --pcb "<current .kicad_pcb>"
```

If the guard passes, source recovery is unnecessary. Record that result and hand off to `/tag-close`.

If it fails because ERC-referenced refs are absent from the schematic, continue only with the controlled recovery below.

## 3. Preserve originals

Before editing:

- hash the original `.kicad_sch`, `.kicad_pcb`, latest ERC and local symbol library;
- copy the schematic to a clearly named working revision;
- do not overwrite the original mixed-state handoff;
- record `kicad-cli --version`.

If `kicad-cli` is unavailable, STOP after producing a recovery plan. Source reconstruction without a native parser/ERC receipt is not accepted as recovered authority.

## 4. Prefer recovery over reconstruction

First search all available working directories, backups, controlled archives and versioned files for the actual schematic that produced the latest ERC.

A candidate recovered file is acceptable only when:

- its placed references include the ERC-referenced refs;
- local libraries resolve;
- it opens natively;
- a fresh ERC can be generated;
- its connectivity matches the controlled capture sources.

Do not select a file merely because its timestamp is newer.

## 5. Controlled reconstruction when the exact file cannot be found

Only if the ERC-generating schematic cannot be recovered, reconstruct the missing **pre-closure capture baseline** from controlled evidence.

The later baseline represented by the PCB/ERC includes these additional placed refs:

`BR1 D1 U10 C3 C4 C5 C7 C8 C9 C10 C11 C12 C13 C14 C15 C16 L1 R5 R6 R7 R8 R9 R10 RT1 RT2`

This list is a completeness check only. It is not wiring authority.

For every reconstructed symbol/net:

- take component identity and state from `EMOPET_TAG_COMPONENT_CAPTURE_MATRIX.csv`;
- take connectivity/status from `EMOPET_TAG_AUTHORITATIVE_CAPTURE_PLAN.csv` and `SOURCE_EVIDENCE/`;
- use project-local symbols/footprints only;
- preserve OPEN/BLOCKED pins exactly as the pre-closure baseline did;
- do not apply #492 E1-E7 yet;
- snap newly restored symbols/wire endpoints to the project grid;
- do not route or run Update PCB from Schematic.

The recovery target is the truthful baseline that existed immediately before deterministic #492 closure, not a cleaner new design.

## 6. Native regression check

Run fresh native ERC on the recovered/reconstructed schematic.

Compare it semantically with the latest historical receipt. The historical 25-error/1-warning state is a useful regression target, but count equality alone is insufficient.

Confirm at minimum:

- U10 BQ25185 exists and its historical OPEN STAT1/STAT2/CE state is represented;
- BR1 exists and its historical OPEN charge-input pins are represented;
- BMI270, U11, U1 UART, INMP441 and NTC_EXCITE findings correspond to the historical pre-closure baseline;
- no accidental new net, pin-number or symbol-library drift exists.

Then rerun the source-coherence guard against the **fresh** ERC receipt. It must pass.

## 7. Recovery receipt

Write `TAG_SOURCE_RECOVERY_REPORT.md` beside the KiCad project with:

- original hashes;
- recovered/reconstructed schematic hash;
- exact evidence files used;
- whether exact-file recovery or reconstruction was used;
- native KiCad version;
- fresh ERC path + message summary;
- source-coherence result;
- differences from the historical receipt;
- explicit statement that #492 deterministic closure has not yet been applied;
- explicit statement that #480 remains open.

## 8. Stop and handoff

Do not apply E1-E7 in the same unreviewed recovery step.

When source coherence is restored, stop with:

`TAG_SOURCE_RECOVERY = COHERENT_BASELINE_RECOVERED / READY_FOR_/tag-close`

If native KiCad could not run:

`TAG_SOURCE_RECOVERY = PLAN_ONLY / NATIVE_KICAD_REQUIRED`

Never output `FABRICATION_READY`.
