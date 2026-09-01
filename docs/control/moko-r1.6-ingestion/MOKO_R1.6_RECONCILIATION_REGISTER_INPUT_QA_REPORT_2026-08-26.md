# MOKO r1.6 reconciliation register — input QA report

| Field | Value |
|---|---|
| QA ID | QA-MOKO-RECON-016-INPUT |
| Date | 2026-08-26 |
| Status | PASS_WITH_NOTES |
| Source workbook | EMOPET_MOKO_R1.6_RECONCILIATION_REGISTER_2026-08-26(2).xlsx |
| Source workbook SHA-256 | `d8058ca7b2d675f9bc84542b5ca74332245d08b489d16b6964bb010968a91380` |
| Intended grain | One row per r1.6 manifest-listed payload |

## Data-quality result

| Check | Result |
|---|---:|
| Payload rows | 46 |
| Unique payload paths | 46 |
| Duplicate payload paths | 0 |
| DOCX / PDF / XLSX | 35 / 9 / 2 |
| Changed / byte-identical from r1.5 | 40 / 6 |
| Manifest size PASS | 46 / 46 |
| Manifest hash PASS | 46 / 46 |
| Third-party originals | 4 |
| DOCX content-QA PASS | 35 / 35 |
| Active comments | 0 |
| Tracked changes | 0 |
| Forbidden visible residue | 0 |
| Fallback font mentions in DOCX OOXML | 0 |
| Overall PASS rows | 46 / 46 |
| Spreadsheet formula-error matches | 0 |

All six workbook sheets were rendered and visually inspected:

- Control Summary;
- Payload Verification;
- Delta Matrix;
- Third Party Originals;
- Control Gates;
- Source Authorities.

No clipping, unreadable table region or formula error was observed in this input-QA pass.

## Boundary note

The exact r1.6 ZIP is not materialized in this Work workspace. This QA validates the supplied controlled reconciliation workbook and its internal consistency. It is not a fresh byte-level computation against the r1.6 archive and does not repeat page-by-page visual QA of every PDF inside that archive.

## Outcome

The workbook is accepted as controlled reconciliation evidence for the Founder-authorized ingestion decision. It does not independently authorize transmission, manufacturing, final publication or mass conversion.

