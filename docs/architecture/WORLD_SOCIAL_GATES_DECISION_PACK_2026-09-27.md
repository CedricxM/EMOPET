# WORLD — Social gates decision pack (#48 kill gate)

**Date:** 2026-09-27 · **Issue:** #48 (parent #43) · **Inputs:** #565 / draft PR #566, #46, #481
**Status:** `DECIDED 2026-09-27 — founder accepted all recommendations (§4)`

> Decision recorded from the founder's instruction on 2026-09-27: "ok pour toutes les
> recommandations". It covers L1–L8 and the kill gate exactly as recommended below; it does
> not close the other gates named in Humane Social Architecture v0.2 §13, sign #478, or
> authorise any real user before the implementation prerequisites in §5 exist.

This pack turns the gates left open by the Nakama spike into eight explicit decisions.
Each one has options, evidence from the current repository, and a recommendation. Nothing
here is authority until the founder records a choice in the decision sheet (§4). Nakama
defaults are never treated as a decision.

## 1. Where we are

| Item | Maturity | Evidence |
|---|---|---|
| Nakama as realtime transport behind Hono/JWT identity | **Tested locally (synthetic users)** | #565 acceptance comment, PR #566 live harness incl. outage/recovery |
| Canonical identity, access 15 min / refresh 30 days | Implemented | `backend/api/services/auth-security.ts`, `auth-sessions.ts` |
| Content reports (posts/comments) | Implemented, retention readiness read-only | `community_reports`, `moderation-retention-readiness.ts` (12 months, not approved) |
| User-to-user **block** | **Absent** | no table, no route |
| Social connection / trust state (#46 ladder) | **Absent** (design only) | #46 `PRE-PRODUCTION DESIGN` |
| Social visibility / presence consent | **Absent** | only `research_data_consents` exists, different purpose |
| Retention purpose + legal basis | **Unsigned** | #481 lock 1 `PRIV-RETENTION-01` (#478) |
| Immediate access revocation at logout | **Absent by design** | logout revokes refresh family; access JWT lives ≤15 min |
| Age bands / youth policy | Candidate only | Humane Social Architecture v0.2 §7–8, `OPEN-WORLD-SAFETY-AGE-001` |
| World vertical slice definition | **Not produced** | #43 required list, World handoff "Next gate" |
| Unity | Gated | #567 blocked by #565; #43: optional behind kill gate |

Reading: the **transport** question is answered. The **product and safety** questions are
not, and none of them can be answered by more transport code.

## 2. Two different thresholds

Decisions are needed at two points. Mixing them is how a spike becomes a launch.

- **T1 — any real human in a World test** (even internal): needs L1–L7.
- **T2 — starting Unity (#567)**: needs T1 decisions *plus* a vertical-slice definition and
  playtest evidence that 3D materially improves the experience (#43, `G-WORLD-PLAYTEST-01`).

## 3. The eight locks

Format: question · current state · options · **recommendation** · what changes technically.

### L1 — Who may enter the first World test? (`OPEN-WORLD-SAFETY-AGE-001`)
- **State:** youth policy exists only as a candidate; no age assurance implemented.
- **Options:** A) synthetic accounts only (status quo) · B) invited adult internal testers,
  allowlisted canonical accounts, self-declared 18+ · C) open adult pilot.
- **Recommendation: B.** Adults only, invitation + allowlist (the spike already enforces an
  allowlist on both Hono and Nakama). No minors under any mode until the §12 governance list
  of Humane Social Architecture v0.2 is satisfied.
- **Technical:** replace the synthetic-UUID allowlist with a canonical `world_pilot_access`
  flag owned by the EMOPET backend; Nakama keeps only the derived projection.

### L2 — What does presence reveal, and to whom? (visibility / consent)
- **State:** spike exposes `online|away` to anyone who follows you; no consent record.
- **Options:** A) visible to every pilot member · B) visible only to mutual connections, opt-in
  per session · C) no presence at all in the first test.
- **Recommendation: B.** Default **invisible**; the Guardian turns presence on for the
  session; only mutually connected participants see `online|away`. Never location, never
  dog data, never activity/ELI-derived status.
- **Technical:** new canonical consent/visibility record (purpose: World presence), checked
  by the adapter before `presence.update`/`presence.follow`; withdrawal closes the socket.

### L3 — Who owns the social graph? (#46 trust ladder)
- **State:** friends/groups exist only in the disposable Nakama DB.
- **Options:** A) Nakama friends are authoritative · B) canonical EMOPET owns connections and
  trust state; Nakama is a rebuildable projection.
- **Recommendation: B**, consistent with #43 ("Nakama … not durable authority") and the spike's
  state-ownership table. Trust states from #46 (`STRANGER → CONTEXTUAL_ACQUAINTANCE →
  CONNECTED → TRUSTED`) gate *actions only*, never a score, never auto-upgraded by proximity.
- **Technical:** canonical `social_connections` (+ state machine); adapter derives Nakama
  friend operations from it; a Nakama reset loses nothing durable.

### L4 — What can people say to each other?
- **State:** spike sends free text (≤1000 chars) in nonpersistent group chat.
- **Options:** A) presets only (#46 Quiet Social Layer) · B) presets for everyone, free text
  only between `CONNECTED`+ · C) free text for all.
- **Recommendation: A for the first test**, which is also #46's required "zero-chat
  cooperation test". Revisit B only after L5 exists and moderation readiness is shown.
- **Technical:** `chat.send` accepts a preset id from a closed list instead of text; free-text
  path stays behind a separate flag, off.

### L5 — Block, report, decline, leave
- **State:** reports exist for Community content only; **no block exists anywhere**.
- **Options:** A) rely on Nakama group bans / friend removal · B) canonical block + report,
  enforced by the adapter before every social call and propagated to Nakama.
- **Recommendation: B.** Block is canonical, one-sided, silent to the blocked person, and
  takes effect on the next request (adapter check) and on live sockets (removal from shared
  channels, friend edge deleted). Reports reuse the `community_reports` pattern with new
  content types (`world_user`, `world_message`); pilot keeps **100% human review**.
  Leaving is always one action and never penalised.
- **Technical:** new `user_blocks` table + route; adapter pre-check; report types; this is a
  hard prerequisite for T1.

### L6 — Retention and deletion of World data (`PRIV-RETENTION-01`, #478)
- **State:** no approved purpose/legal basis for any retention category yet.
- **Options:** A) wait for #478 before any real user · B) minimal-footprint pilot: chat never
  persisted, Nakama metadata disposable, volume reset at pilot end, account deletion purges the
  Nakama account.
- **Recommendation: B, and register it in #478** as a new category "World transport
  metadata" with its own purpose and duration for approval. Do not start T1 until that line
  is signed.
- **Technical:** deletion cascade calls the Nakama account delete; operator runbook for
  end-of-pilot reset; logs stay at WARN, no chat content in logs.

### L7 — Logout, deletion and suspension must reach live sessions
- **State:** a revoked session keeps a valid access JWT up to 15 min; World sockets would
  outlive logout.
- **Options:** A) accept ≤15 min · B) canonical logout/deletion/suspension hook that closes
  the actor's World handles immediately, plus a canonical account-status check at bootstrap.
- **Recommendation: B.** It is local to the World adapter and does not change the canonical
  JWT contract.
- **Technical:** adapter `revokeActor(userId)` called from logout, `logout_all`, account
  deletion and moderation suspension.

### L8 — Location (`G-WORLD-LOCATION-01`)
- **State:** `copresence_events` stores lat/long for real-world co-presence (other surface).
- **Recommendation: no location of any kind in the first World test** — no region inferred
  from presence, no "nearby", no exact or coarse position. Regional hub content is authored,
  not derived from users' positions.

## 4. Decision sheet (founder) — recorded

| Lock | Recommendation | Decision | Date |
|---|---|---|---|
| L1 eligibility | B — invited adult testers, allowlist | **B** | 2026-09-27 |
| L2 presence | B — opt-in, mutual connections, online/away only | **B** | 2026-09-27 |
| L3 social graph | B — canonical owner, Nakama projection | **B** | 2026-09-27 |
| L4 expression | A — presets only | **A** | 2026-09-27 |
| L5 block/report | B — canonical, enforced before Nakama | **B** | 2026-09-27 |
| L6 retention | B + new #478 category | **B** (pending #478 signature for real users) | 2026-09-27 |
| L7 revocation | B — immediate World revocation hook | **B** | 2026-09-27 |
| L8 location | none in first test | **Agree** | 2026-09-27 |
| **Kill gate** | see §5 | **Transport GO (not activated) · Unity HOLD** | 2026-09-27 |

## 5. Kill-gate recommendation

**Transport: GO (keep the spike, do not activate).** Nakama behaved as a disposable realtime
transport under canonical identity, including failure and recovery.

**Unity #567: HOLD.** Rationale: #43 makes Unity optional and conditional on playtest
evidence; the vertical-slice definition does not exist; and every T1 lock above would change
what a Unity client must render or forbid (presence visibility, presets vs text, block UX,
no location). Building the client first would encode undecided rules.

**Recommended order once L1–L8 are chosen:**
1. canonical block/report, visibility consent and connection state (L2, L3, L5) + revocation hook (L7);
2. #478 retention line for World transport metadata (L6);
3. #46 paper/clickable prototype incl. zero-chat cooperation test (L4);
4. #43 World Vertical Slice Definition;
5. only then decide #567 on playtest evidence.

**STOP criterion (proposed):** if the #43 acceptance question ("Would I open this tonight
… with no new MAT/TAG/ELI insight?") is answered *no* by the paper prototype, stop World and
keep Nakama unused.

## 6. What this pack does not do

Beyond the recorded choices above, it closes no gate, sets no retention duration, creates no legal basis, authorises no real
user, no Unity work and no merge. It records options and a recommendation for a human decision.

## Sources

- `docs/product/EMOPET_HUMANE_SOCIAL_ARCHITECTURE_MASTER_v0.2_VERIFIED_2026-09-01.md` (§7–9, §12–14)
- `docs/product/EMOPET_WORLD_WORKSTREAM_HANDOFF_2026-09-01.md`
- `docs/architecture/WORLD_NAKAMA_SPIKE_2026-09-25.md` (on `spike/world-nakama-565`)
- Issues #43, #46, #48, #481, #565, #567; draft PR #566
- Code: `backend/db/schema/community.ts`, `backend/api/services/auth-security.ts`,
  `backend/api/services/auth-sessions.ts`, `backend/api/services/moderation-retention-readiness.ts`
