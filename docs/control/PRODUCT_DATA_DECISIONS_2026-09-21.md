# Product / Data decisions — 2026-09-21

Decision date: 2026-09-21. Status: **founder-delegated decisions, recorded**.

The founder selected **D2 option A** for the privileged/admin surfaces (already
recorded in #266) and delegated the five remaining Product/Data decisions to be
taken on his behalf. This document takes them.

Each decision states what it closes and, just as explicitly, **what it does not
close**. Three of the six issues touched here cannot be closed by a product
decision alone; saying so is part of the decision, not a reservation about it.

## Authority basis

- `docs/strategy/FOUNDER_STRATEGIC_LOCKS_2026-09-07.md` — the repository's only
  `PROJECT_DECISION / STRATEGIC AUTHORITY`.
- `docs/product/EMOPET_CARE_PRODUCT_MASTER_v0.1.md` (`PROPOSED`).
- CNIL retention doctrine, already cited and referenced inside #69.

Two principles follow from the locks and explain every decision below.

**P1 — Longitudinal depth is the product, not an overhead.** Lock §1: *"the
application builds longitudinal understanding around the individual dog's own
reference"*; lock §3 lists *longitudinal context, memory, continuity* as what the
experience should favour. A rolling cap on the dog's own observation history
would delete the reference the product compares against. Storage convenience is
not a purpose-based justification for destroying it.

**P2 — Minimise what identifies a household, not what describes a dog.** The
risk in this system concentrates in identity, location, device binding, logs and
support content. Those get short, justified windows. Derived canine observation
gets depth, with its *granularity* minimised over time instead of its span.

These two pull in opposite directions on purpose. Where they meet — sensor and
ELI history — the answer is aggregation, not deletion (decision A, rows 4 and 6).

---

## Decision A — Retention schedule (#69, sub-gate `G-PRIV-RETENTION`)

Every duration below is derived from the processing purpose, as #69 requires:
*"this issue must not assign attractive-looking numbers such as 30 days, 1 year,
or account lifetime without a documented purpose/legal/operational
justification."* Rows whose duration depends on a legal obligation rather than a
product purpose are marked `LEGAL CONFIRMATION REQUIRED`; the value given is the
operational default to run until counsel confirms or changes it.

Category ids match `config/privacy/data-inventory.json`.

| Category | Clock starts | Active retention | At expiry | Justification |
|---|---|---|---|---|
| `account` | account closure | closure + 30 days | delete | The purpose is authenticating the holder; it ends at closure. The 30 days are an operational reversal window for accidental deletion — an operational need, not a data purpose, hence short and fixed. |
| `dog_profile` | — | no independent duration | deleted with dog or account | A dog profile has no purpose detached from the account that holds it. |
| `device_metadata` | unbinding | binding deleted immediately; technical record 24 months | delete | Unbinding ends the operational purpose at once. The technical record survives only for warranty/after-sales proof. `LEGAL CONFIRMATION REQUIRED` on the 24 months and on whether after-sales genuinely needs it. |
| `sensor_preprocessed` | — | **no time cap**; sub-daily resolution reduced to daily aggregates after 24 months | deleted with dog or account | P1: this *is* the individual reference. Minimisation applies to granularity, not span: aggregation drops `ingestionId`, `deviceId` linkage, `firmwareVersionAtIngest` and sub-daily resolution — the household-identifying part — while preserving the longitudinal curve that gives the product its value. |
| `sensor_raw` | — | not collected | — | Unchanged. No policy is created here; a retention decision is required *before* any collection, not after. |
| `eli_inferred` | — | same as `sensor_preprocessed` | deleted with dog or account | Derived from the row above and useless without it; a different rule would make the two diverge silently. |
| `health_records` | — | owner-controlled; no automatic expiry | deleted on owner action or with the account | These are entries a human wrote. Expiring them on a timer would destroy user content the owner believes they still hold. The limit is the account's own life, which is a limit. |
| `location` | activation | exact coordinates **never persisted**; coarse map position retained only while the marker it belongs to exists | delete with the marker | DPIA treats continuous/precise location as high risk and #69 PRIV-01E requires no persistence of exact coordinates unless necessary. It is not necessary. Temporary activation is governed by decision B. |
| `community` | publication | life of the account | delete or anonymise per the moderation policy | Published content the owner controls; removal follows the account. |
| `support_contact` | thread closure | 12 months | delete | A support thread can be reopened or referenced across a usage year (the product is seasonal by nature). Past that there is no purpose. Legal hold excepted. |
| `security_logs` | event | 6 months | delete | Aligns with CNIL's standard recommendation for connection/security logs, cited in #69. `LEGAL CONFIRMATION REQUIRED` where a specific French obligation imposes longer on a subset. |

Categories listed in #69 §PRIV-01C that have **no row yet** in the machine-readable
inventory, decided here so the schedule is complete:

| Category | Active retention | Justification |
|---|---|---|
| Moderation evidence | 12 months after the decision, pseudonymised | Long enough to see a repeated pattern across a usage year; bounded so a report does not become a permanent record about a person. |
| Incident evidence | until incident closure + 12 months | Post-incident review and any follow-up claim need the closed file for a bounded period. |
| Rights-request evidence | 3 years | Accountability evidence — it exists to prove EMOPET answered correctly. Under-retaining it removes the proof of compliance. `LEGAL CONFIRMATION REQUIRED` on the exact duration. |
| Backups | rolling 35 days maximum | Deletion in the primary store is only real once backups roll past it; a 35-day ceiling bounds how long an erased record can survive in a restore path. |
| Research/validation datasets | anonymised only | If a dataset carries personal data it is out of scope until separately approved. No retention is granted here. |

### What this closes and does not close

`G-PRIV-RETENTION` = **DECIDED**, subject to the four `LEGAL CONFIRMATION
REQUIRED` rows.

**#69 stays open.** It also owns the controller/legal-entity identity, the
privacy contact, final Article 6 legal bases, the erasure cascade, the processor
and transfer register, the location boundary and the audio negative control.
None of those is a product decision and none is resolved by this document.
Closing #69 now would delete the tracking of the work that must happen before
production.

This decision is deliberately **not** written into
`config/privacy/data-inventory.json` in the same change: that file feeds gates
owned by the privacy control-plane workstream and carries
`P0_CONTROLLED_DRAFT_NOT_LEGAL_SIGNOFF`. Propagating the schedule into it is the
implementation follow-up, to be done by that workstream against this record.

---

## Decision B — Temporary location activation (#131, gate `OPTIN-G3`)

| Question | Decision |
|---|---|
| Activation | Explicit user action only. Server-stamped expiry. |
| Duration | **60 minutes**, hard wall-clock expiry. |
| Renewal | None automatic. A new activation is a new explicit gesture. |
| Scope | **Foreground only.** No background location in V1. |
| Backgrounding | Expires after **5 minutes** in background. |
| App close / restart / process restart | **Immediate expiry.** Lost state is never reconstructed as active. |
| Revocation | Immediate, from the app, without waiting for expiry. |
| Evidence after expiry | The fact of the activation and its window are retained as opt-in proof. **The position trail is not.** |
| State unavailable | Treated as inactive — fail closed. |
| Required authority class | `SESSION_BOUND_TEMPORARY`. A `VOLATILE_PROCESS` or `DEMO_LOCAL` record never satisfies it. |

Why 60 minutes: the purpose is an outing in progress. An hour covers the typical
walk. Longer stops being *temporary* and becomes ambient sharing, which the
doctrine excludes. Why a 5-minute background grace: it survives taking a phone
call without killing the session, while a pocketed phone stops sharing quickly.
Why restart means expiry: a state that cannot be proven active must not be
assumed active — that is the same fail-closed rule #131 applies to identity.

`OPTIN-G3` = **DECIDED**.

**#131 stays open** on `OPTIN-G1` (backend identity must fail closed rather than
collapse into `demo-user`), `OPTIN-G2`, `G4`, `G5` and `G6`. Those are
implementation and classification work, not decisions, and the `demo-user`
fallback is a live defect that a decision does not fix.

---

## Decision C — Consultable history horizon (#140 `VET-PERIOD-G3`, #142 `WINDOW-G3`)

**General rule: a query horizon never exceeds the retention of the category it
queries.** A product cap invented independently of retention is a false control —
it hides data that is still held, and it drifts from the retention schedule the
moment either side changes. This rule makes decision A the single source for both.

**#142 — Presence windows.** No product maximum while presence events remain
`VOLATILE_PROCESS / durable=false` (#136). Capping the horizon of data that does
not persist protects nothing and would misrepresent the storage truth. When
presence becomes durable, its horizon becomes the retention of
`sensor_preprocessed` under the general rule above, with no independent number.
`WINDOW-G3` = **DECIDED**.

**#140 — Generic bearer report path.** Maximum horizon **365 days**, for two
reasons that are not convenience:

1. A year is the smallest window containing a full seasonal cycle, and the
   seasonal cycle is part of the individual reference the product compares
   against (lock §1). A shorter cap amputates the comparison the product exists
   to make.
2. This path is reached with a **bearer token**. Unlike the owner's own in-app
   history, a link can be forwarded. The cap bounds what a single leaked link
   exposes, which the in-app path does not need.

The `days <= 30` value present in the frozen #224 source is **not adopted**: no
Product/Data authority ever selected it, and 30 days cannot support a seasonal
comparison. `VET-PERIOD-G3` = **DECIDED**.

INT-05 recipient-bound professional sharing does **not** inherit this cap; it
carries explicit `dataFrom` / `dataTo` windows, as #140 already states.

### What this closes

**#140 and #142 can close.** Both issues state that `G1`, `G2` and `G4` are
delivered on current `main` and that they remain open *only* for the maximum-horizon
decision. That decision is now taken.

---

## Decision D — Professional sharing: frozen report (#64)

**Decision: a frozen snapshot, not live access, for V1.**

1. **Revocability is real.** A snapshot opens no channel that must later be
   revoked. #64 itself lists revocation propagation and concurrent revocation
   *during report reading* as not established — live access would require exactly
   the mechanism that is missing.
2. **It is comprehensible.** The vet discusses a document that does not change
   underneath them. A live feed makes the conversation non-reproducible: owner and
   vet can read different numbers from the same link.
3. **It already matches the contract.** #64 requires professional access to be
   *recipient-bound, period/data-specific, consented, expiring/revocable*. A
   snapshot is all of those by construction; a live feed has to be made so.

Freshness is served by **re-issue**, not by a permanent channel: a new snapshot,
a new consent, a new window. That gives continuity over time without leaving an
open door between consultations.

**#64 stays open.** Verified professional identity, server-side binding and
activation, delivery and re-issue policy, per-scope deletion semantics, a real
scoped recipient-read transaction and the access-audit UX all remain. Its closure
gate requires Founder + Privacy/Security + Product/UX + backend authorization
review, and legal review where applicable. One product decision does not
substitute for that.

---

## Decision E — Privileged access / MFA policy (#175)

The policy is decided here. The provider is not selected here, and the reason is
stated below rather than glossed.

### Accepted methods

| Role | Primary | Allowed fallback | Refused |
|---|---|---|---|
| `admin` | WebAuthn / passkey, phishing-resistant — **mandatory** | none | TOTP as sole factor, SMS, voice, email codes |
| `support` | WebAuthn / passkey — recommended | TOTP as a **secondary** factor | SMS, voice, email codes |
| `operator` | WebAuthn / passkey — recommended | TOTP as a **secondary** factor | SMS, voice, email codes |

TOTP is never a recovery method and never the only factor for `admin`. SMS and
voice are refused for every privileged role: they are the factor that real
attacks against admin accounts defeat.

### Recovery, break-glass, lifecycle

- **Normal recovery:** two hardware authenticators enrolled per privileged
  identity, one held as a spare. Losing one is then an inconvenience, not an
  incident.
- **Assisted recovery:** re-enrolment authorised by a second administrator with
  out-of-band verification. Never a password-only path, and never a provider-side
  one-time code that silently bypasses MFA — the failure mode #175 `PROVIDER-G3`
  names explicitly.
- **Break-glass:** one sealed account, offline physical factor, every use logged
  and alerted automatically, mandatory review within 24 hours.
- **Joiner / mover / leaver:** the staff directory is the source of truth.
  Disabling an identity there must prevent the next step-up, with propagation
  under 5 minutes.

### Session and freshness values consumed by #170

- Privileged session: **30 minutes** idle, **8 hours** absolute.
- Step-up freshness: **15 minutes** for any finite destructive action —
  privileged Contact deletion, irreversible moderation.

### Provider selection — decided as a rule, not left open

Selecting a provider commits money and a contract, which is a founder signature,
not a repository decision; `CLAUDE.md` is explicit that a supplier candidate is
not a selected supplier. The choice also turns on one fact this record cannot
verify: which identity/office suite EMOPET already pays for. The decision is
therefore expressed as a rule that resolves without another round of analysis:

- **Already on Google Workspace** → Google Cloud Identity as directory, security
  keys enforced for privileged accounts.
- **Already on Microsoft 365** → Microsoft Entra ID, Conditional Access
  restricted to phishing-resistant methods for privileged roles.
- **Neither** → a managed provider with WebAuthn, audit-log export and a
  directory API on its entry tier, rather than self-hosting Keycloak: for three
  roles and a handful of staff, running the identity provider yourself adds an
  availability risk on the exact path you need working during an incident.

Whichever is chosen, the requirements it must satisfy are the seven `PROVIDER-G`
gates already written in #175 — they are the acceptance criteria, unchanged.

**#175 stays open.** `PROVIDER-G1` through `G7` require staging evidence against
a real console: enrolment refusal before a factor exists, mapped challenge
success and failure, a tested recovery path, offboarding that blocks the next
step-up, enforced policy, exportable audit and no secret leakage. No repository
change can produce that evidence, and #175 correctly refuses to close without it.

---

## Summary of dispositions

| Issue | Decision taken | Issue disposition |
|---|---|---|
| #69 | Retention schedule, per category, justified | **Stays open** — controller, legal bases, erasure cascade, processors, location, audio |
| #131 | Temporary location: 60 min, foreground, expiry on restart | **Stays open** — `OPTIN-G1/G2/G4/G5/G6` implementation |
| #140 | Bearer-report horizon: 365 days | **Can close** |
| #142 | No product cap while volatile; horizon = retention once durable | **Can close** |
| #64 | Frozen snapshot, refreshed by re-issue | **Stays open** — identity, activation, audit, multi-party review |
| #175 | MFA policy, recovery, lifecycle, session values; provider as a rule | **Stays open** — `PROVIDER-G1…G7` external evidence |
| #266 | Not re-decided — option A already recorded by the founder | Owned by the reconstruction workstream |

## Condition for revision

These are product decisions, not scientific or legal conclusions. Any of them may
be revised by a later explicit authority: legal counsel on the flagged retention
rows, a privacy authority on the location boundary, or the founder on any of
them. Revising one means updating this record, not overwriting it silently.

Nothing here authorises a merge, a production activation, a provider contract or
a release.
