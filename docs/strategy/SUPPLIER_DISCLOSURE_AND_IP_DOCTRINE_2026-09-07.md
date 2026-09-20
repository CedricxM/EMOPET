# EMOPET — Supplier Disclosure & IP Doctrine

**Control date:** 2026-09-07  
**Status:** `PROJECT DECISION / CONFIDENTIALITY + INDUSTRIAL GOVERNANCE`

## 1. Principle

A supplier receives the **minimum information necessary to execute the authorised scope**.

Supplier convenience is not authority to disclose the whole EMOPET project.

## 2. Scope before disclosure

Before a higher-sensitivity technical disclosure, EMOPET should know:

- which legal entity is receiving the information;
- authorised signatory / relevant site when material;
- confidentiality / NNN status;
- allowed subcontractors/sites;
- exact work scope;
- required inputs;
- expected outputs/evidence;
- ownership of paid tooling, project data and deliverables;
- return/deletion obligations;
- publicity/name-use restrictions.

## 3. Disclosure classes

### Supplier-safe / scoped

May include, when needed and authorised:

- RFQ / SOW;
- interface requirements;
- controlled drawings or derived supplier-safe views;
- candidate BOM excerpts relevant to the quote;
- validation questions;
- mechanical/electrical constraints;
- defined test requirements;
- released attachment packages with explicit maturity/status.

### Separately controlled / higher sensitivity

Do not send merely because a supplier asks for “everything”:

- full System Architecture;
- ELI scientific/inference internals beyond necessary interface requirements;
- algorithms / model implementation;
- application/cloud source code;
- firmware source;
- complete internal BOM/history;
- full native CAD/Fusion master;
- native ECAD/KiCad master;
- Gerber/ODB++ production data;
- internal business model/roadmap;
- unrelated supplier or pricing intelligence.

A later gate may authorise some of these where genuinely necessary.

## 4. Native-file rule

Native design/source files create more IP and configuration exposure than controlled exports.

Default supplier communication should favour controlled PDF/derived/export packages unless the authorised engineering task genuinely requires native data.

Native files require an explicit disclosure decision, correct configuration authority and evidence that the recipient is authorised to receive them.

## 5. Manufacturing-release boundary

An RFQ, review package, prototype request or DFM discussion is **not** a manufacturing release.

No Gerber/tooling/NPI/production authority exists unless separately released by EMOPET through the current design-control process.

## 6. Supplier recommendation boundary

A supplier may recommend component substitutions, topology changes, DFM changes or alternative processes.

These remain `SUPPLIER RECOMMENDATION` until EMOPET evaluates evidence and records a decision.

Silence is not approval. A quote is not approval. A manufactured prototype is not a production freeze.

## 7. Evidence return

For evidence-producing engineering work, require enough return material to understand/reproduce the result, including as applicable:

- as-tested architecture/configuration;
- exact components/revisions;
- raw data;
- processed data + transformation method;
- scripts/config where needed for reproducibility;
- photos/test conditions;
- deviations/failures;
- DFM/DFA findings;
- recommendation clearly separated from EMOPET final approval.

## 8. Publicity

Supplier use of EMOPET name/logo, project photographs, samples, customer claims, case studies, trade-show material or factory-tour display requires prior written permission.

## 9. MOKO status

MOKO is currently an active engineering/RFQ counterparty for scoped MAT/TAG Phase 0 work.

This does not, by itself, establish:

- final manufacturing selection;
- production release;
- product design authority;
- full-project disclosure authority.

Current transmission/evidence records govern exact sent packages.

## 10. Relationship to historical supplier strategies

Earlier supplier-chain concepts are retained as historical lineage and do not override this current doctrine or current supplier evidence.

See `docs/records/memory/HISTORICAL_STRATEGY_SUPERSESSIONS_2026-09-07.md`.
