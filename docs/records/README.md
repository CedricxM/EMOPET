# EMOPET — Project Memory & Evidence Standard

**Control date:** 2026-09-07  
**Repository:** `CedricxM/EMOPET`  
**Status:** CONTROLLED PROJECT-MEMORY POLICY

## 1. Principle

GitHub is the canonical **index, chronology, decision and evidence-memory layer** for EMOPET.

Important project facts must not live only in email, WhatsApp, local folders, ChatGPT/Claude sessions, supplier portals or individual memory. When an exchange or document materially affects EMOPET, the repository must contain enough controlled metadata to reconstruct:

- what happened;
- when it happened;
- with whom;
- what was sent or received;
- what the evidence source is;
- what status is actually proven;
- what decision, action, blocker or deadline follows.

GitHub does **not** automatically replace the original evidence store. Gmail remains the original source for email; executed legal originals and identity-bearing files remain in the controlled legal archive; supplier-native binaries may remain in their controlled file store. GitHub records their existence, identity, status and integrity.

## 2. Status vocabulary

Use only evidence-supported states:

- `DRAFT`
- `PREPARED_NOT_SENT`
- `SENT`
- `RECEIVED`
- `ACKNOWLEDGED`
- `ACTION_REQUIRED`
- `CLOSED`
- `SIGNED`
- `FULLY_EXECUTED`
- `NOT_PROVEN`
- `PENDING_IMPORT`
- `SUPERSEDED`

Never infer `RECEIVED` from `SENT`, `SIGNED` from `SENT_FOR_SIGNATURE`, or `PARTNERSHIP` from a scientific/institutional discussion.

## 3. Communication record minimum fields

For each material external or team communication, record when available:

- date/time and timezone;
- direction (`SENT` / `RECEIVED`);
- counterparty / contact;
- subject;
- channel (`Gmail`, WhatsApp, meeting, etc.);
- source message/thread ID or other evidence reference;
- factual one-paragraph summary;
- attachments and their status;
- decisions / requests / commitments;
- next action / owner / deadline;
- related repository paths.

Full private email bodies should not be copied into the repo unless there is a specific retention reason. Prefer a factual evidence summary and source identifiers.

## 4. Important attachment record minimum fields

Record:

- exact filename;
- document family / purpose;
- sent or received;
- source communication ID;
- MIME type and size when known;
- SHA-256 when the exact bytes are locally available;
- release/maturity status;
- repository source path if a text/source equivalent exists;
- secure archive location or source system when the binary is not committed.

## 5. Privacy / secret boundary

Do **not** commit automatically:

- handwritten or electronic signatures;
- private postal addresses;
- identity documents;
- bank details;
- passwords, tokens, API keys or secrets;
- raw personal user data;
- executed agreements containing unnecessary personal data;
- supplier secrets that are not needed in source control.

For such evidence, GitHub stores status + hash + archive/source reference.

## 6. Important project-memory categories

- `docs/records/communications/` — material communications and chronology
- `docs/records/attachments/` — important sent/received attachment ledger
- `docs/external/` — external workstream status index
- `docs/industrial/` — supplier/industrial records
- `docs/legal/` — controlled legal source/status records
- `docs/science/` or communication records — scientific evidence without overstating collaboration
- funding/regional-support communication records

## 7. Operating rule

Whenever EMOPET sends or receives a material email, signs/sends a material document, receives a supplier/scientific/funding response, or makes a decision from that exchange, the relevant register should be updated in the same work cycle.

This repository policy is intended to prevent the evidence asymmetry identified during the 2026-09-07 AudéLor/Emergys deck audit: software/compliance evidence was deeply versioned while several industrial, scientific and funding workstreams existed mainly outside GitHub.
