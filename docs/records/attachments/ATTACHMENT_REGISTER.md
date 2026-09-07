# EMOPET — Important Attachment Register

**Control date:** 2026-09-07  
**Purpose:** identify important EMOPET files that were sent, received, scheduled or prepared, even when the binary itself is stored outside GitHub.

| Date | Direction | Counterparty / use | Filename | Status | Size | SHA-256 / integrity | Evidence / source |
|---|---|---|---|---|---:|---|---|
| 2026-09-07 | SENT | MOKO — Phase 0 RFQ | `EMOPET_MOKO_PHASE0_RFQ_SEND_NOW_2026-09-06.zip` | `SENT` | 192756 B | `2701e3344b7b7b7e5a7842a10163bbce99f358e09b756b8428aedd785d500532` | Gmail message `1a078c0bd460631b`; `docs/industrial/moko/MOKO_RFQ_TRANSMISSION_2026-09-07.md` |
| 2026-09-08 15:00 Europe/Paris | SCHEDULED | Prof. James Serpell / UPenn | `EMOPET.pdf` | `SCHEDULED_NOT_SENT` at 2026-09-07 control point | 2180028 B | hash not yet imported | Gmail message `1a0811a9de2fe45c`; returned by `label:scheduled`; not found in `in:sent` at control point |
| 2026-09-08 15:00 Europe/Paris | SCHEDULED | UPenn C-BARQ licensing contact, cc Prof. Serpell | `EMOPET.pdf` | `SCHEDULED_NOT_SENT` at 2026-09-07 control point | 2180028 B | hash not yet imported | Gmail message `1a0811a9c1fa0ba0`; returned by `label:scheduled`; licensing enquiry not found in `in:sent` at control point |
| 2026-09 | UNKNOWN / NOT PROVEN | Prof. James Serpell / UPenn | `C-BARQ — contexts relevant to EMOPET ELI behavioral state interpretation.pdf` | `TRANSMISSION_NOT_PROVEN` | previously recorded 116909 B; exact Gmail attachment not found in 2026-09-07 filename search | hash not yet imported | prior repo record corrected after connected-Gmail filename search returned no result |
| 2026-09 | UNKNOWN / NOT PROVEN | Prof. James Serpell / UPenn | `Controlled Research Brief — ELI Co-Pilot Training Proposal.pdf` | `TRANSMISSION_NOT_PROVEN` | previously recorded 181260 B; exact Gmail attachment not found in 2026-09-07 filename search | hash not yet imported | prior repo record corrected after connected-Gmail filename search returned no result |
| 2026 | SENT | Oniris | `EMOPET_INSTITUTIONAL_PRESENTATION_2026_FR.pdf` | `SENT` | not yet imported | hash not yet imported | Gmail thread `19d824d47721e25c` |
| 2026-08-21 | RECEIVED | Bpifrance / CII | `Formulaire rescrit fiscal CII.docx` | `RECEIVED` | 718552 B | hash not yet imported | Gmail thread `1a038a72ec7cacf9` |
| 2026-08-21 | RECEIVED | Bpifrance / CII | `NOTICE DU FORMULAIRE RESCRIT FISCAL CII.pdf` | `RECEIVED` | 317039 B | hash not yet imported | Gmail thread `1a038a72ec7cacf9` |
| 2026-07-29 | RECEIVED | Cabinet Derammelaere | `Proposition_d'accompagnement juridique.pdf` | `RECEIVED` | 217725 B | hash not yet imported | Gmail thread `19ed5423c6f9bfac` |
| 2026 | RECEIVED | MOKO corporate qualification | `Power of Attorney_Shenzhen MOKO Technology Ltd_20250917.pdf` | `RECEIVED` | not yet imported | hash not yet imported | Gmail thread `19f7e608c5fe1172` |
| 2026 | RECEIVED | MOKO corporate qualification | `营业执照2025（法人签字）.pdf` | `RECEIVED` | not yet imported | hash not yet imported | Gmail thread `19f7e608c5fe1172` |
| 2026 | RECEIVED / exchanged | MOKO legal | `EMOPET_MUTUAL_NNN_SHENZHEN_MOKO_20250917_EXECUTED_PARTY_A_SIGNED.pdf` | evidence exists; full execution status controlled separately | not yet imported | hash not yet imported | Gmail thread `19f7e608c5fe1172` |
| 2026-09-07 | SENT_FOR_SIGNATURE | Tetiana Fedotova | `02_EMOPET_Tetiana_Fedotova_Mutual_Non_Disclosure_Agreement.docx` | `SENT_FOR_SIGNATURE` | local controlled copy | `7a1eaae8849eaeec15c8262f0981fbaebe760ceedad82bdc5e136fd3becec0b0` | WhatsApp distribution evidence; `docs/legal/team/CONFIDENTIALITY_REGISTER.md` |
| 2026-09-07 | SENT_FOR_SIGNATURE | Camara Mohamed | `02_EMOPET_Camara_Mohamed_Mutual_Non_Disclosure_Agreement.docx` | `SENT_FOR_SIGNATURE` | local controlled copy | `15a0e9fe21f0d70dc1e0ca52781ea8119e1b2e3e59a5c6b19c9a1477f47e54e0` | WhatsApp distribution evidence; `docs/legal/team/CONFIDENTIALITY_REGISTER.md` |
| 2026-09-07 | SENT_FOR_SIGNATURE | Nisrine Semlal | `02_EMOPET_Nisrine_Semlal_Accord_Mutuel_Confidentialite.docx` | `SENT_FOR_SIGNATURE` | local controlled copy | `ada4c968d0bced1337c62b5efc4b01d2d7ddf1c565ad9db6c4ee1263e6449188` | WhatsApp distribution evidence; `docs/legal/team/CONFIDENTIALITY_REGISTER.md` |
| 2026-09-07 | PREPARED | AudéLor / Lucie | `EMOPET_Presentation_Lucie_AudeLor_Emergys_v3_2026-09-07.pptx` | `PREPARED_NOT_SENT` | local controlled copy | `a94c77752ae415a07d04c03ad053d53d5c801875d40d5d78cb85fb4ac35aa782` | current generated deck; no send evidence yet |
| 2026-09-07 | PREPARED | AudéLor / Lucie | `EMOPET_Presentation_Lucie_AudeLor_Emergys_v3_2026-09-07.pdf` | `PREPARED_NOT_SENT` | local controlled copy | `95b08a7c4880e931aeeba065e8959575f7f6b18ceb5f8081ab6bed2957c70550` | current generated deck; no send evidence yet |

## Rules

1. Never change `PREPARED_NOT_SENT` or `SCHEDULED_NOT_SENT` to `SENT` without transmission evidence.
2. Future-dated Gmail items returned by `label:scheduled` are not sent communications until post-send evidence exists.
3. Never infer a supplier/customer/scientific acknowledgement from an outbound message.
4. Signed legal originals containing private addresses/signatures should normally remain in the controlled legal archive; GitHub stores hash + status + archive reference.
5. Add SHA-256 when exact bytes become available.
6. Superseded or corrected evidence remains in the ledger with its historical/corrected status; do not silently delete evidence history.
