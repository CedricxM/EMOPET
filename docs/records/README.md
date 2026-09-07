# EMOPET — Project Memory & Evidence Standard

**Control date:** 2026-09-07  
**Repository:** `CedricxM/EMOPET`  
**Status:** CONTROLLED PROJECT-MEMORY POLICY

## 1. Principle

GitHub is the canonical **index, chronology, decision, strategy, scientific-framework and evidence-memory layer** for EMOPET.

Important project knowledge must not live only in email, WhatsApp, local folders, ChatGPT/Claude sessions, supplier portals, slide decks or individual memory. When an exchange, document, analysis or decision materially affects EMOPET, the repository must contain enough controlled information to reconstruct:

- what happened;
- when it happened;
- with whom;
- what was sent or received;
- what the evidence source is;
- what status is actually proven;
- what scientific or strategic framework was being used;
- which assumptions supported the decision;
- what changed or was superseded later;
- what action, blocker or deadline follows.

GitHub does **not** automatically replace the original evidence store. Gmail remains the original source for email; executed legal originals and identity-bearing files remain in the controlled legal archive; supplier-native binaries may remain in their controlled file store. GitHub records their existence, identity, status and integrity.

## 2. Evidence-status vocabulary

Use only evidence-supported states for communications/documents:

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

## 3. Knowledge-status vocabulary

Strategy, market and scientific-framework memory must not be forced into communication statuses. Use explicit knowledge labels where appropriate:

- `HYPOTHESIS` — proposition to test; not established fact.
- `WORKING_ASSUMPTION` — assumption currently used for planning and subject to revision.
- `WORKING_STRATEGY` — current strategic direction, not an irreversible commitment.
- `PROJECT_DECISION` — explicit internal decision that should govern downstream work until changed.
- `EXTERNAL_FEEDBACK` — feedback received from an external expert/counterparty; not automatically adopted.
- `SCIENTIFIC_RECOMMENDATION` — scientific recommendation attributed to its source and scope.
- `SOURCE_VERIFIED` — factual statement supported by a dated controlled source.
- `SUPERSEDED` — no longer current but retained for auditability.

Every important change should preserve the previous state rather than silently rewriting history.

## 4. Communication record minimum fields

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

## 5. Important attachment record minimum fields

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

## 6. Scientific-framework memory

Scientific discussions must preserve **who proposed what** and the exact epistemic status.

For frameworks involving Professor James Serpell, C-BARQ, ELI or other scientific contributors, record:

- EMOPET proposal/version;
- external feedback or recommendation;
- whether feedback was merely discussed or adopted;
- validated instrument or literature source involved;
- licensing/permission status where relevant;
- implementation consequence;
- later revision or supersession.

Do not collapse `EMOPET proposal`, `Serpell feedback`, `validated C-BARQ`, `UPenn institutional position`, `commercial licence` and `ELI validation` into one claim. They are different evidence layers.

Canonical index: `docs/research/SCIENTIFIC_FRAMEWORK_REGISTER.md`.

## 7. Strategy, competitors and market memory

The repository must preserve not only execution evidence but also the reasoning that drives the project.

### Strategy

For material strategies, record:

- strategic objective;
- current status (`WORKING_STRATEGY` or `PROJECT_DECISION`);
- rationale;
- dependencies;
- assumptions;
- rejected alternatives when material;
- trigger for re-evaluation;
- source documents and decision date.

Canonical index: `docs/strategy/STRATEGY_MEMORY_INDEX.md`.

### Competitors

Competitor intelligence must remain dated and source-controlled. Distinguish:

- verified public facts;
- competitor marketing claims;
- EMOPET interpretation;
- strategic consequence for EMOPET.

Canonical file: `docs/strategy/COMPETITIVE_LANDSCAPE.md`.

### Market

Market intelligence must record source, geography, period, segment, methodology and confidence. Unsourced TAM/SAM/SOM numbers or remembered figures must not become planning facts.

Canonical index: `docs/market/MARKET_INTELLIGENCE_REGISTER.md`.

## 8. Canonical planning calendar

Current planning authority: `docs/strategy/PROJECT_TIMELINE_2026_2027.md`.

The current internal decision is:

- **2026:** preparation, structuring, evidence-building, prototype/product work, industrial/scientific/legal/funding preparation and relationship building. It is **not** the commercial launch year.
- **2027:** beginning of EMOPET's launch phase and the period in which the project starts its operational integration into the Brittany ecosystem.

Exact commercial-launch month, scale and sequencing remain separate decisions unless a later controlled record fixes them.

## 9. Privacy / secret boundary

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

## 10. Important project-memory categories

- `docs/records/communications/` — material communications and chronology
- `docs/records/attachments/` — important sent/received attachment ledger
- `docs/external/` — external workstream status index
- `docs/industrial/` — supplier/industrial records
- `docs/legal/` — controlled legal source/status records
- `docs/research/` — scientific frameworks, literature and research evolution
- `docs/strategy/` — strategy, competitive landscape, channels and planning decisions
- `docs/market/` — market intelligence, segmentation, sizing evidence and market hypotheses
- funding/regional-support communication records

## 11. Operating rule

Whenever EMOPET sends or receives a material email, signs/sends a material document, receives a supplier/scientific/funding response, makes a strategic or scientific decision, changes a framework, updates a major competitor assessment, or adopts/rejects a market assumption, the relevant register should be updated in the same work cycle.

This repository policy is intended to prevent the evidence asymmetry identified during the 2026-09-07 AudéLor/Emergys deck audit: software/compliance evidence was deeply versioned while several industrial, scientific, strategic and funding workstreams existed mainly outside GitHub.
