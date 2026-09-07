# EMOPET — External Workstream Evidence Index

**Control date:** 2026-09-07  
**Purpose:** make external scientific, industrial, funding and legal workstreams discoverable from the repository without overstating their status.

## Status vocabulary

- `CONTACT_INITIATED`: an approach/contact exists; no partnership implied.
- `DISCUSSION`: substantive exchange exists; no formal collaboration implied.
- `PREPARED_NOT_SENT`: material prepared but no transmission evidence.
- `SENT`: transmission evidenced.
- `ACKNOWLEDGED`: recipient acknowledgement evidenced.
- `SIGNED`: signatures evidenced.
- `FULLY_EXECUTED`: all required signatures/execution evidence present.
- `PENDING_IMPORT`: source evidence exists outside the repository and still needs controlled import.
- `NOT_PROVEN`: not currently evidenced.

## Industrial — MOKO Technology

| Item | Current status | Repo evidence |
|---|---|---|
| Phase 0 MAT + TAG RFQ | `SENT` | `docs/industrial/moko/MOKO_RFQ_TRANSMISSION_2026-09-07.md` |
| RFQ receipt acknowledgement from MOKO | `NOT_PROVEN` | awaiting evidence |
| Indicative quotation | `NOT_PROVEN` | awaiting supplier response |
| Controlled CAD/R3 addendum | in preparation | separate release gate |

**Important:** Sending an RFQ does not mean MOKO is contractually committed to perform the engineering scope.

## Scientific — Professor James Serpell / University of Pennsylvania

Current project record outside the repository indicates substantive exchanges concerning behavioral methodology and C-BARQ-related positioning. These exchanges must not be described as endorsement, validation of ELI, partnership with UPenn, or commercial licence.

| Item | Current status |
|---|---|
| Scientific / methodological contact with Professor James Serpell | `DISCUSSION / PENDING_IMPORT` |
| C-BARQ commercial licence | `NOT_PROVEN` |
| UPenn institutional partnership | `NOT_PROVEN` |
| Validation of ELI by Professor Serpell | `NOT_PROVEN` |

**Repository action:** import dated email evidence and any licensing correspondence as a controlled evidence summary without publishing private email content unnecessarily.

## Scientific — Oniris VetAgroBio

Project records indicate a contact route initiated through Audrey Lafragette concerning a possible scientific/veterinary discussion.

| Item | Current status |
|---|---|
| Contact initiated | `CONTACT_INITIATED / PENDING_IMPORT` |
| Formal scientific collaboration | `NOT_PROVEN` |
| Signed partnership | `NOT_PROVEN` |

Do not use the wording “Oniris partner” until a formal instrument or explicit collaboration evidence exists.

## Funding / regional support — AudéLor / Emergys Bretagne

EMOPET is preparing a detailed project presentation for discussion with Lucie / AudéLor regarding project structuring and possible Emergys preparation.

| Item | Current status |
|---|---|
| AudéLor discussion / meeting preparation | `DISCUSSION / PENDING_IMPORT` |
| Emergys eligibility confirmed | `NOT_PROVEN` |
| Emergys funding awarded | `NOT_PROVEN` |
| Eligible expenditure base confirmed | `NOT_PROVEN` |

All amounts, intervention rates and eligibility assumptions must remain explicitly qualified until confirmed by the relevant program contact.

## Team legal — confidentiality

The following nominative confidentiality instruments have been prepared and sent for signature:

- Tetiana Fedotova — Germany
- Camara Mohamed — Canada
- Nisrine Semlal — France

See `docs/legal/team/CONFIDENTIALITY_REGISTER.md`.

No agreement is to be classified `SIGNED` merely because it was sent through a messaging channel.

## Next evidence-import priorities

1. Executed team NDAs and contribution/IP instruments: archive originals outside GitHub; record hashes/status in repository.
2. Professor Serpell / UPenn: controlled dated evidence summary.
3. Oniris: contact/evidence summary with exact status language.
4. AudéLor / Emergys: meeting note, eligibility answers and decision log after the meeting.
5. MOKO: receipt acknowledgement, quotation and later controlled CAD addendum evidence.
