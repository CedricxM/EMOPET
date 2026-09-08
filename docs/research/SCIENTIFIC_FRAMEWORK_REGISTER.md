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
- `SCHEDULED_NOT_SENT`
- `NOT_PROVEN`
- `SUPERSEDED`

## Framework register

| Framework / topic | Current status | Source / authority | Current EMOPET consequence | Controlled record |
|---|---|---|---|---|
| Earlier reduced C-BARQ selection concept | `SUPERSEDED` | Historical EMOPET proposal reviewed by Prof. James Serpell | Do not implement the old subset as current production strategy | `docs/research/cbarq/EMOPET_CBARQ_SELECTION_LEGACY.md` |
| C-BARQ item wording / owner extremity judgements / item elimination | `EXTERNAL_FEEDBACK / SCIENTIFIC_RECOMMENDATION` | Prof. James Serpell, 2 July 2026 written feedback | Preserve wording validity; avoid subjective owner extremity judgements; any item elimination must be psychometrically justified rather than UX-driven | `docs/records/communications/science/SERPELL_UPENN_COMMUNICATIONS.md` |
| Conservative complete-instrument direction | `PROJECT_DECISION / SCIENTIFIC_REVIEW_REQUIRED` | EMOPET decision after Serpell feedback, not a blanket Serpell instruction | Seek the appropriate licence and investigate complete licensed use; progressive sequencing remains an open scientific question | `docs/research/CBARQ_PROJECT_IMPACT_2026-09-06.md`; Serpell communications record |
| Progressive administration of complete C-BARQ | `EMOPET_PROPOSAL / NOT_PROVEN` | EMOPET product/science question scheduled for discussion with Prof. Serpell | Do not implement as psychometrically equivalent until qualified review establishes acceptable sequencing/time/completion rules | Serpell communications record |
| C-BARQ commercial use | `LICENSING_REQUIRED / NOT_PROVEN` | Serpell flagged likely licensing; provided Neetu Singh Amin as UPenn contact | No production/commercial use should be represented as licensed until written licensing evidence exists | Serpell communications record |
| 08/09 C-BARQ licensing enquiry | `SCHEDULED_NOT_SENT` at 2026-09-07 control point | Gmail scheduled message `1a0811a9c1fa0ba0` | Verify actual transmission after scheduled time before marking licensing discussion active | Serpell communications record |
| `C-BARQ — contexts relevant to EMOPET ELI behavioral state interpretation.pdf` transmission | `NOT_PROVEN` | Exact connected-Gmail filename search returned no result on 2026-09-07 | May remain an EMOPET internal/proposed framework, but do not call it sent for Serpell review without evidence | Attachment register + Serpell record |
| `Controlled Research Brief — ELI Co-Pilot Training Proposal.pdf` transmission | `NOT_PROVEN` | Exact connected-Gmail filename search returned no result on 2026-09-07 | May remain an EMOPET internal/proposed framework, but do not call it sent for Serpell review without evidence | Attachment register + Serpell record |
| ELI scientific validation by Prof. Serpell | `NOT_PROVEN` | No controlled evidence establishing validation | Must not be claimed | Serpell communications record |
| UPenn institutional partnership / endorsement | `NOT_PROVEN` | No controlled institutional agreement | Must not be claimed | Serpell communications record |

## Exact Serpell attribution currently controlled

The July 2026 feedback is materially narrower and more useful than the shorthand previously recorded.

Professor Serpell's key points were:

1. owners should not be asked to make subjective judgements about how extreme a behaviour is;
2. changing C-BARQ wording risks invalidating items;
3. eliminating individual items can be acceptable when they do not load strongly on their factor/subscale, with Flint et al. cited as a source for item factor loadings;
4. commercial use is likely to require a licence from the University of Pennsylvania;
5. Neetu Singh Amin is the licensing contact he provided.

EMOPET's later choice to pursue the complete instrument is a **project decision made after this feedback**. Do not collapse those two layers.

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
