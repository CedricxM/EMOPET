# EMOPET — P0 IP Provenance Evidence Register

Status: `P0 CONTROLLED EVIDENCE INTAKE / OPEN / NOT LEGAL SIGN-OFF / NOT RELEASE AUTHORITY`  
Control date: `2026-09-02`  
Snapshot boundary: `main@c099581ff8aed1e619f72ab38898fc05833b7c66`  
Work item: [#114 — IP-PROV-01](https://github.com/CedricxM/EMOPET/issues/114)  
Source briefing: [PR #112](https://github.com/CedricxM/EMOPET/pull/112)  
Briefing reconciliation: [review disposition](https://github.com/CedricxM/EMOPET/pull/112#issuecomment-5511075415)

## 1. Purpose and authority boundary

This register preserves repository-observable provenance facts and makes missing evidence explicit.

It does not:

- determine authorship or ownership;
- interpret a contract;
- establish that rights were assigned or cleared;
- select a repository licence;
- authorize public, investor, employee, contractor or supplier disclosure;
- infer that a person did or did not contribute from the absence of a Git commit;
- replace qualified legal/IP review.

Sensitive agreements, signatures, identity documents, private communications and prompt transcripts must not be committed here. The register may contain only non-sensitive control identifiers and custody pointers.

## 2. Evidence-state vocabulary

| State | Meaning |
|---|---|
| `VERIFIED_POINTER` | A bounded evidence pointer exists and the referenced item was checked. This state applies only to the fact stated in the row. |
| `DECLARED_AWAITING_EVIDENCE` | A named authority supplied a declaration, but supporting material has not been reviewed. |
| `NOT_FOUND` | A bounded search was completed and its scope is recorded without locating evidence. |
| `NOT_APPLICABLE` | A recorded rationale shows that the requested evidence does not apply. |
| `OPEN` | The item has not been resolved. |

The words `OWNED`, `ASSIGNED`, `CLEARED`, `VERIFIED` and `RELEASED` must not be used as aggregate conclusions unless the exact scope, reviewer, evidence and date are recorded.

## 3. Gate summary

| Gate | Required outcome | Current state | Closing authority |
|---|---|---|---|
| IP-PROV-G1 | Baseline origin and custody | `OPEN` | Founder factual declaration + evidence review |
| IP-PROV-G2 | Human contributors and roles | `OPEN` | Named contributors + Founder |
| IP-PROV-G3 | Code/document chain-of-title pointers | `OPEN` | Founder + qualified legal/IP review |
| IP-PROV-G4 | Brand/visual asset provenance | `OPEN` | Founder/Brand owner + qualified review where relied upon |
| IP-PROV-G5 | AI-assisted development provenance | `OPEN` | Founder/Engineering factual declaration |
| IP-PROV-G6 | Repository notice and disclosure posture | `OPEN` | Founder + qualified legal/IP review |
| IP-PROV-G7 | Final controlled disposition | `OPEN` | Founder, with legal/IP review where required |

`G-IP-PROVENANCE-01 = OPEN`

## 4. Evidence sources checked for this candidate

| Evidence ID | Scope | Pointer | Fact established | State |
|---|---|---|---|---|
| IP-SRC-001 | Repository snapshot | `main@c099581ff8aed1e619f72ab38898fc05833b7c66` | Snapshot identity used by PR #112 | `VERIFIED_POINTER` |
| IP-SRC-002 | Baseline-import finding | PR #112, section 4.1 | The briefing reports 534 files introduced by commit `b4966fa`; the briefing remains subject to its reconciliation note | `VERIFIED_POINTER` |
| IP-SRC-003 | Named project roles | `AGENTS.md@c099581` | Repository instructions name Cédric Mian as Founder/CEO and Mohamed as CTO | `VERIFIED_POINTER` |
| IP-SRC-004 | Brand origin notes | `apps/web/public/assets/brand/README.md@c099581`, blob `086e9dbb3eca269b58605406053fe88827697837` | Distinguishes supplied presentation assets from placeholder SVG paths; does not name creators or rights instruments | `VERIFIED_POINTER` |
| IP-SRC-005 | Brand directory inventory | GitHub contents listing at `c099581` | Twelve non-Markdown asset files are present under the brand directory | `VERIFIED_POINTER` |
| IP-SRC-006 | Architecture PNG path | `docs/architecture/data_flow_diagram.png@c099581`, blob `8b137891791fe96927ad78e64b0aad7bded08bdc` | The tracked blob contains one newline byte, not an image payload | `VERIFIED_POINTER` |
| IP-SRC-007 | Current report attribution | PR #112 commit `92e440bc4e6df44644d0841ccf3f8b2cdda029a6` | The post-snapshot report commit contains a `Co-Authored-By: Claude Opus 5` trailer and a Claude session pointer | `VERIFIED_POINTER` |

### Count reconciliation

The reviewed snapshot contains:

- 12 non-Markdown files under `apps/web/public/assets/brand/`;
- 1 separate path named `docs/architecture/data_flow_diagram.png`, whose blob is only a newline.

Therefore:

`MEDIA-NAMED PATHS = 13`  
`NONEMPTY BRAND ASSETS = 12`  
`NONEMPTY ARCHITECTURE DIAGRAM AT THAT PATH = 0`

This corrects any reading that treats all 13 paths as substantive image assets.

## 5. Baseline and code-material register

| Item ID | Material scope | Repository fact | Origin/custody evidence | Contribution evidence | Rights evidence | State | Next action |
|---|---|---|---|---|---|---|---|
| IP-CODE-001 | Material introduced by baseline commit `b4966fa` | PR #112 reports 534 files in the import | No pre-import source pointer recorded here | No complete contributor declaration recorded | No reviewed agreement pointer recorded | `OPEN` | Founder identifies source workspace/repository/archive and its custody |
| IP-CODE-002 | `packages/eli-engine/` | Present in the baseline snapshot | `OPEN` | `OPEN` | `OPEN` | `OPEN` | Identify creator(s), dates, source history and any pre-existing material |
| IP-CODE-003 | `backend/` | Present in the baseline snapshot | `OPEN` | `OPEN` | `OPEN` | `OPEN` | Identify creator(s), source history and agreement coverage |
| IP-CODE-004 | `apps/web/` | Present in the baseline snapshot | `OPEN` | `OPEN` | `OPEN` | `OPEN` | Separate original code, generated material, third-party assets and later changes |
| IP-CODE-005 | `apps/mobile/` | Present in the baseline snapshot | `OPEN` | `OPEN` | `OPEN` | `OPEN` | Identify creator(s), source history and agreement coverage |
| IP-CODE-006 | `firmware/` | Partial C sources are present in the baseline snapshot | `OPEN` | `OPEN` | `OPEN` | `OPEN` | Identify origin and whether a complete firmware repository or supplier SDK exists elsewhere |
| IP-CODE-007 | Technical/product documentation | Documentation is present in the import and later commits | `OPEN` | `OPEN` | `OPEN` | `OPEN` | Identify authors, imported source documents and third-party excerpts/templates |
| IP-CODE-008 | Seeds/reference content authored inside code files | Source files are versioned, including local-directory seed material | `OPEN` | `OPEN` | Third-party data rights excluded from this gate | `OPEN` | Record authorship here; route source-data rights to the later data/licensing gate |

A Git commit author field is not a substitute for a contributor declaration or rights instrument.

## 6. Person and assistance register

| Item ID | Person/category | Repository-observable fact | Contribution scope | Agreement/evidence pointer | State | Required declaration |
|---|---|---|---|---|---|---|
| IP-PER-001 | Cédric Mian | Named Founder/CEO in `AGENTS.md`; Cédric/CedricxM author identities are reported in PR #112 | `OPEN` | `OPEN` | `OPEN` | Role dates, material personally created, imported sources, agreements and exclusions |
| IP-PER-002 | Mohamed | Named CTO in `AGENTS.md`; PR #112 reports no independently attributable commit identity in the snapshot | Must not be inferred from Git absence | `OPEN` | `OPEN` | Role dates, actual contribution categories, pre-existing material and agreement/assignment pointer |
| IP-PER-003 | Other pre-import human contributors | No complete controlled declaration is recorded | `OPEN` | `OPEN` | `OPEN` | Founder identifies employees, cofounders, contractors, students, volunteers, agencies and suppliers, or records a supported none-known declaration |
| IP-PER-004 | AI-assisted development before `c099581` | The baseline snapshot does not provide a complete AI-assistance register | `OPEN` | `OPEN` | `OPEN` | Tool/provider, approximate period, affected categories, human review and retained terms/input restrictions where known |
| IP-PER-005 | PR #112 AI assistance | Commit trailer and session pointer are present after the snapshot | Report drafting only, as represented by the PR metadata | PR #112 | `VERIFIED_POINTER` for attribution only | Preserve snapshot boundary; do not generalize this attribution to earlier material |

## 7. Brand and visual-asset register

All current creator/right dispositions remain `OPEN`. A repository note that a file was “supplied” identifies a delivery source category, not the creator, commissioner or rights holder.

| Asset ID | Repository path | Git blob at `c099581` | Repository-observable fact | Fact state | Creator/right state | Required evidence |
|---|---|---|---|---|---|---|
| IP-ASSET-001 | `apps/web/public/assets/brand/app-icon.svg` | `0e3de5ba39e2a0fcfe46f0c77ac565abffc1595b` | README classifies it as a placeholder pending an official icon | `VERIFIED_POINTER` | `OPEN` | Creator/source declaration for placeholder and future master |
| IP-ASSET-002 | `apps/web/public/assets/brand/brand-identity-core.jpg` | `fdef61ca68a05b0ebc1ae1f4bd55a2cc5022d6cf` | README says it came from supplied presentation materials | `VERIFIED_POINTER` | `OPEN` | Presentation custody, creator/supplier, commission and rights pointer |
| IP-ASSET-003 | `apps/web/public/assets/brand/brand-identity.webp` | `e24ab2f48f98b080952199335872ed0b5ed9ef10` | README says it came from supplied presentation materials | `VERIFIED_POINTER` | `OPEN` | Same evidence class; identify source master |
| IP-ASSET-004 | `apps/web/public/assets/brand/branding-fr.png` | `c2be7a68307b62c5716bf95910962c772a8a9a0e` | README says it came from supplied presentation materials | `VERIFIED_POINTER` | `OPEN` | Same evidence class; identify source master |
| IP-ASSET-005 | `apps/web/public/assets/brand/emopet-logo-dark.png` | `d59cb5efd97b3b64c138aeb94199a35ade11671f` | README says it came from supplied `Logo_Dark.png` | `VERIFIED_POINTER` | `OPEN` | Locate supplied master, creator and commission/assignment/licence pointer |
| IP-ASSET-006 | `apps/web/public/assets/brand/emopet-logo-mark.svg` | `f5428ca028625a97ed907f93b5ab87ab77260c18` | README classifies it as a placeholder pending the official paw mark | `VERIFIED_POINTER` | `OPEN` | Creator/source declaration for placeholder and official master |
| IP-ASSET-007 | `apps/web/public/assets/brand/emopet-logo-white.svg` | `6a46560d51666601370087a7159cb2e74dac2305` | README classifies it as a placeholder pending the official light lockup | `VERIFIED_POINTER` | `OPEN` | Creator/source declaration for placeholder and official master |
| IP-ASSET-008 | `apps/web/public/assets/brand/emopet-logo.svg` | `23dfda27b25bd678fc6c992db702a6d484d37889` | README classifies it as a placeholder pending the official navy lockup | `VERIFIED_POINTER` | `OPEN` | Creator/source declaration for placeholder and official master |
| IP-ASSET-009 | `apps/web/public/assets/brand/emopet-mat.png` | `dffd5f703643a3c3557c8db60a496065a8726220` | README says it came from supplied presentation materials | `VERIFIED_POINTER` | `OPEN` | Source render/project, creator/supplier and usage-right pointer |
| IP-ASSET-010 | `apps/web/public/assets/brand/emopet-pattern.svg` | `892a950a56321f8a05a1575f10092b3de1447dc0` | README classifies it as a placeholder pending the official pattern | `VERIFIED_POINTER` | `OPEN` | Creator/source declaration for placeholder and official master |
| IP-ASSET-011 | `apps/web/public/assets/brand/emopet-tag.png` | `e73b1c4efadc806bb99e5011419d6ea639f3ae6d` | README says it came from supplied presentation materials | `VERIFIED_POINTER` | `OPEN` | Source render/project, creator/supplier and usage-right pointer |
| IP-ASSET-012 | `apps/web/public/assets/brand/social-preview.png` | `c2be7a68307b62c5716bf95910962c772a8a9a0e` | Byte-identical Git blob to `branding-fr.png`; README says it came from supplied presentation materials | `VERIFIED_POINTER` | `OPEN` | Confirm intentional reuse and source/rights coverage for social media |
| IP-ASSET-013 | `docs/architecture/data_flow_diagram.png` | `8b137891791fe96927ad78e64b0aad7bded08bdc` | Blob contains only a newline; no image payload exists at the snapshot | `VERIFIED_POINTER` | `NOT_APPLICABLE` to current empty payload; future diagram `OPEN` | Remove/replace only in a separate authorized change; record provenance of any future diagram |

## 8. Evidence-pointer minimum fields

A future evidence pointer must record:

| Field | Requirement |
|---|---|
| Control ID | Stable, non-sensitive identifier |
| Evidence type | Repository, archive, agreement, invoice, delivery note, declaration, design source, terms snapshot or other |
| Custodian role | Role only where personal identity is not needed in Git |
| Controlled location | Non-secret pointer; do not expose credentials or private storage URLs |
| Date or period | Document/execution/delivery date or bounded range |
| Scope | Exact files, workstream, asset or contribution covered |
| Integrity | SHA-256 for immutable digital evidence where practical |
| Reviewer | Named role and, in the restricted evidence system, the actual reviewer |
| Review date | ISO date |
| Finding | Narrow fact established; no aggregate overclaim |
| Limitations | Missing schedules, territory, duration, media, modification scope, exclusions or disputed items |
| Classification | Internal, confidential, restricted, legal-privileged if applicable |

## 9. Founder/authority factual intake

The following questions require explicit answers or an `UNKNOWN / SEARCH REQUIRED` disposition:

1. Where was the material imported by `b4966fa` developed, and does a prior repository/archive exist?
2. Who contributed to each major code/document category before the import?
3. What did Mohamed actually contribute, during which period and under what written arrangement, if any?
4. Did any employee, contractor, agency, school, accelerator, supplier or other organization contribute material?
5. Who created the supplied logo, presentation, MAT/TAG renders and brand identity materials?
6. Where are the editable/source masters and delivery records?
7. Was AI assistance used before `c099581`; if so, for which categories and with what retained evidence?
8. Was any third-party code, template, generated asset or proprietary source incorporated outside normal package dependencies?
9. Is the intended repository posture private proprietary, partially open source or undecided?
10. Which disclosures are intended before this gate closes: internal review, counsel, investor, employee, contractor, manufacturer or public?

Unanswered questions remain `OPEN`; silence is not evidence.

## 10. Repository notice and future-contribution decision

No decision is made by this candidate.

| Decision item | Current state | Required authority |
|---|---|---|
| Proprietary copyright/usage notice | `OPEN` | Founder + qualified legal/IP review |
| Open-source licence for any scope | `NOT SELECTED` | Founder + qualified legal/IP review |
| CLA/DCO policy | `OPEN` | Founder + Engineering + qualified review |
| `CODEOWNERS` responsibility | `OPEN` | Founder + Engineering |
| Contractor contribution intake | `OPEN` | Founder + qualified legal/IP review |
| AI-assistance recording rule | `OPEN` | Founder + Engineering |
| Investor/supplier/public disclosure rule | `OPEN` | Founder + qualified legal/IP review |

The absence of a `LICENSE` file must not be represented as proof of complete ownership or as a selected disclosure strategy.

## 11. Closure record template

Do not complete this section until IP-PROV-G1 through G7 have evidence-backed dispositions.

- Review date: `OPEN`
- Founder factual attestation: `OPEN`
- Engineering review: `OPEN`
- Brand/source review: `OPEN`
- Qualified legal/IP review: `OPEN`
- Residual gaps: `OPEN`
- Disposition: `GO | HOLD | REMEDIATE — NOT SELECTED`
- Authorized disclosure classes: `NONE SELECTED`
- Next mandatory review: `OPEN`

## 12. Current disposition

`IP PROVENANCE REGISTER = CANDIDATE CREATED`  
`CHAIN-OF-TITLE COMPLETENESS = NOT ESTABLISHED`  
`BRAND-ASSET RIGHTS = NOT ESTABLISHED`  
`PUBLIC OR EXTERNAL DISCLOSURE AUTHORITY = NOT GRANTED`  
`G-IP-PROVENANCE-01 = OPEN`

This HOLD applies to claims of complete provenance or clearance. It does not prohibit ordinary private development under existing repository access controls.
