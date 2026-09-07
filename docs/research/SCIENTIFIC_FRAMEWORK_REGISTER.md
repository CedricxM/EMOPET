# EMOPET — Scientific Framework Register

**Control date:** 2026-09-07  
**Status:** CONTROLLED SCIENTIFIC-MEMORY INDEX

## Purpose

This register preserves the evolution of EMOPET's scientific frameworks so that future work can distinguish:

- an EMOPET proposal;
- external expert feedback;
- a scientific recommendation;
- a validated external instrument;
- a licensing or permission question;
- an adopted internal design decision;
- a superseded scientific direction.

A scientific exchange is not automatically a validation, endorsement or partnership.

## Status vocabulary

- `EMOPET_PROPOSAL`
- `EXTERNAL_FEEDBACK`
- `SCIENTIFIC_RECOMMENDATION`
- `WORKING_FRAMEWORK`
- `PROJECT_DECISION`
- `VALIDATED_EXTERNAL_INSTRUMENT`
- `LICENSING_REQUIRED`
- `NOT_PROVEN`
- `SUPERSEDED`

## Framework register

| Framework / topic | Current status | Source / authority | Current EMOPET consequence | Controlled record |
|---|---|---|---|---|
| Earlier reduced C-BARQ selection concept | `SUPERSEDED` | Historical EMOPET proposal prepared for Prof. James Serpell | Do not implement or describe as current C-BARQ integration strategy | `docs/research/cbarq/EMOPET_CBARQ_SELECTION_LEGACY.md` |
| Use of complete validated C-BARQ instrument rather than an ad-hoc shortened substitute | `SCIENTIFIC_RECOMMENDATION / PROJECT_DIRECTION` | Methodological exchange with Prof. James Serpell | Product design should adapt around the validated instrument rather than silently deleting items for UX convenience | `docs/records/communications/science/SERPELL_UPENN_COMMUNICATIONS.md` |
| C-BARQ commercial use | `LICENSING_REQUIRED / NOT_PROVEN` | Serpell exchange + separate UPenn licensing route | No production/commercial use should be represented as licensed until written licensing evidence exists | `docs/records/communications/science/SERPELL_UPENN_COMMUNICATIONS.md` |
| C-BARQ contexts relevant to ELI behavioural-state interpretation | `EMOPET_PROPOSAL / SENT_FOR_SCIENTIFIC_REVIEW` | EMOPET research material sent to Prof. Serpell | Preserve as a proposed framework under review, not as Serpell-approved methodology unless explicit evidence later exists | Attachment register + Serpell communications record |
| ELI Co-Pilot Training Proposal | `EMOPET_PROPOSAL / SENT_FOR_SCIENTIFIC_REVIEW` | EMOPET controlled research brief sent to Prof. Serpell | Record future feedback against the exact document/version before altering implementation assumptions | Attachment register + Serpell communications record |
| ELI scientific validation by Prof. Serpell | `NOT_PROVEN` | No controlled evidence establishing validation | Must not be claimed | `docs/records/communications/science/SERPELL_UPENN_COMMUNICATIONS.md` |
| UPenn institutional partnership / endorsement | `NOT_PROVEN` | No controlled institutional agreement | Must not be claimed | `docs/records/communications/science/SERPELL_UPENN_COMMUNICATIONS.md` |

## Framework-change rule

Whenever a scientific framework changes, create or update a controlled record that states:

1. previous framework/version;
2. new framework/version;
3. trigger for change;
4. source of the trigger;
5. whether it is feedback, recommendation, validation evidence or internal decision;
6. implementation impact;
7. licensing/regulatory implications where relevant;
8. whether the previous framework is now `SUPERSEDED`.

Do not silently overwrite older scientific reasoning. Scientific evolution is part of the project memory.

## Serpell-specific attribution rule

For any future exchange with Professor James Serpell, record the exact attribution level:

- `EMOPET asked/proposed ...`
- `Prof. Serpell commented ...`
- `Prof. Serpell recommended ...`
- `EMOPET adopted ...`
- `C-BARQ licence granted ...` only with licensing evidence
- `validated/endorsed` only with explicit evidence supporting those words

The repository must make it impossible for a later deck, AI assistant or team member to transform a methodological discussion into a partnership or validation claim by accident.
