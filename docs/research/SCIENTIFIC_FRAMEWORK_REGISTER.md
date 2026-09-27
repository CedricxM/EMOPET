# EMOPET — Scientific Framework Register

**Control date:** 2026-09-25  
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


## 2026-09-25 C-BARQ France / Penn reconciliation

Canonical current authority for this section:
`docs/science/EMOPET_CBARQ_UPENN_SCIENTIFIC_AUTHORITY_2026-09-23.md`.

This update preserves the older Flint 2017 and July 2026 Serpell records while adding the later 2025 French peer-reviewed factorial evidence as a distinct evidence layer.

| Framework / topic | Current controlled state | Authority | Consequence |
|---|---|---|---|
| French C-BARQ factorial evidence | `PUBLISHED / PEER-REVIEWED` | Besegher et al., Applied Animal Behaviour Science 292 (2025), 106816, DOI 10.1016/j.applanim.2025.106816 | French psychometric evidence now exists and must not be described as absent. It does not create an EMOPET licence or validate ELI. |
| EMOPET C-BARQ commercial licence | `NOT_ESTABLISHED` | No written Penn/UPenn licensing grant in controlled evidence | Production embedding, item reproduction, scoring, repeated administration and derivative displays remain fail-closed pending written authority. |
| 63-item EFA retained set | `NOT_VALIDATED_FOR_EMOPET / NOT_AUTHORIZED_SHORT_FORM` | Besegher et al. 2025 EFA result only | Do not productize the 63 retained items as a short C-BARQ. |
| ELI validation against C-BARQ | `PROPOSED / NOT_PERFORMED` | EMOPET research direction only | C-BARQ may be considered an external criterion candidate, not ground truth and not existing ELI validation. |
| Penn institutional collaboration | `DISCUSSION / NOT_AGREED` | No controlled institutional agreement | Do not claim partnership, endorsement, validation, Penn access or Serpell endorsement. |

### Evidence-layer firewall

These five layers must remain separately attributable:

1. **Flint 2017** — earlier behavioural/genetic/owner-report evidence used in EMOPET scientific reasoning.
2. **Serpell July 2026 feedback** — external expert feedback/recommendation, including wording/item-elimination/licensing points.
3. **EMOPET complete-instrument direction** — internal conservative project decision made after that feedback.
4. **Besegher et al. 2025 French factorial study** — peer-reviewed French psychometric evidence.
5. **Penn licence / collaboration / ELI-validation status** — still separate, unresolved authority questions unless later written evidence supersedes this record.

A later document or presentation must not collapse one layer into another.
