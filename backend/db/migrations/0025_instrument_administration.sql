-- Migration 0025: Licensed instrument registries and administration runtime (2026-09-28)
--
-- Written as 0013 on a branch taken from an older main, and renumbered on merge: main
-- had meanwhile taken 0013 through 0024. Nothing in it changed, and it collides with
-- none of them — it adds version_id, policy_id, lifecycle_state and window_ends_at to
-- behavioral_assessments, where 0014 added the household_* columns.
--
-- Every constraint here is named explicitly, matching the name the Drizzle schema
-- generates, because the P0 constraint/index parity gate compares this path against the
-- generated baseline and an unnamed inline CHECK or REFERENCES takes PostgreSQL's own
-- <table>_<column>_check / _fkey instead. That is real drift, not cosmetics: a later
-- DROP CONSTRAINT IF EXISTS by the Drizzle name would silently miss this path, which is
-- exactly how 0021 came to exist. Several of these names exceed 63 bytes; see the note at
-- the foot of this file on why the truncation is deliberate and must not be shortened.
--
-- Adds the structural half of a licensed behavioural instrument integration.
-- Under the approved storage split, structure lives in PostgreSQL and the
-- licensed wording lives in a private content store reached at runtime:
--
--   * instrument_items / instrument_sections carry ordering, scale bounds and a
--     render digest. They have NO text column, by design.
--   * instrument_versions.content_store_ref points at the private store, and
--     content_digest proves which ingested revision was served.
--
-- Nothing here authorises production use. license_status defaults to
-- 'not_proven', which keeps the runtime gate closed until written licence
-- evidence exists. Repository fixtures use 'demo_only'.
--
-- The registry tables hold no personal data: they are content metadata and must
-- not be treated as subject records. administration_sessions and
-- instrument_administration_events hold no dog or user column; they reach a dog
-- transitively through behavioral_assessments.dog_id.
--
-- Two product promises are enforced at the database boundary rather than in the
-- application layer:
--
--   * chk_session_reminder_cap        — at most two reminders per session.
--   * chk_event_item_presentation     — an item presentation always carries a
--     chk_event_section_title           render digest and always attests that no
--                                       model was in the loop.

BEGIN;

-- ============================================================
-- 1. Instrument and version registry
-- ============================================================
CREATE TABLE IF NOT EXISTS instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL CONSTRAINT instruments_code_unique UNIQUE,
  owner_organisation VARCHAR(255) NOT NULL,

  -- Attribution wording required by the licence. Rendered verbatim, never
  -- recomposed by a model. This is a legal notice, not instrument content.
  attribution_text TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS instrument_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_id UUID NOT NULL
    CONSTRAINT instrument_versions_instrument_id_instruments_id_fk
    REFERENCES instruments(id),
  version VARCHAR(100) NOT NULL,
  locale VARCHAR(10) NOT NULL,

  -- Pointer into the private content store. Never the content itself.
  content_store_ref VARCHAR(255) NOT NULL,
  content_digest VARCHAR(64) NOT NULL,

  license_reference VARCHAR(255),
  license_status VARCHAR(30) NOT NULL DEFAULT 'not_proven'
    CONSTRAINT chk_instrument_version_license
    CHECK (license_status IN ('not_proven','granted','expired','revoked','demo_only')),

  -- A translation changes wording, and changed wording can invalidate an item.
  -- A locale that is not 'official' cannot claim comparability with reference norms.
  translation_status VARCHAR(30) NOT NULL DEFAULT 'unreviewed'
    CONSTRAINT chk_instrument_version_translation
    CHECK (translation_status IN ('unreviewed','official','back_translated','not_equivalent')),

  expected_item_count INTEGER NOT NULL,

  -- Contractual bounds, traceable at runtime so an overrun is detectable before
  -- it happens rather than discovered at audit.
  territory_scope VARCHAR(100),
  max_users INTEGER,
  license_expires_at TIMESTAMPTZ,

  activated_at TIMESTAMPTZ,
  retired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_instrument_version_item_count CHECK (expected_item_count > 0),
  CONSTRAINT chk_instrument_version_max_users CHECK (max_users IS NULL OR max_users > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_instrument_version_locale
  ON instrument_versions(instrument_id, version, locale);
CREATE INDEX IF NOT EXISTS idx_instrument_version_instrument
  ON instrument_versions(instrument_id);

-- ============================================================
-- 2. Sections as position ranges
-- ============================================================
-- Whether the official section title is part of the instrument AS ADMINISTERED
-- is an open licensing question: announcing a theme before a section's items may
-- add framing the reference administration does not have. Closed by default.
CREATE TABLE IF NOT EXISTS instrument_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL
    CONSTRAINT instrument_sections_version_id_instrument_versions_id_fk
    REFERENCES instrument_versions(id),
  section_key VARCHAR(100) NOT NULL,
  ordinal INTEGER NOT NULL,
  first_position INTEGER NOT NULL,
  last_position INTEGER NOT NULL,

  title_render_digest VARCHAR(64) NOT NULL,
  title_is_part_of_instrument BOOLEAN NOT NULL DEFAULT FALSE,

  CONSTRAINT chk_section_bounds CHECK (first_position <= last_position),
  CONSTRAINT chk_section_ordinal CHECK (ordinal >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_section_version_key
  ON instrument_sections(version_id, section_key);
CREATE UNIQUE INDEX IF NOT EXISTS uq_section_version_ordinal
  ON instrument_sections(version_id, ordinal);

-- ============================================================
-- 3. Items — structure only, no wording
-- ============================================================
-- canonical_position is the administration order. It is a property of the
-- instrument version and never a function of the respondent: no column here
-- references a user, a dog or any context, so order invariance across
-- respondents is verifiable by inspecting this table.
CREATE TABLE IF NOT EXISTS instrument_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL
    CONSTRAINT instrument_items_version_id_instrument_versions_id_fk
    REFERENCES instrument_versions(id),

  item_key VARCHAR(100) NOT NULL,
  subscale_key VARCHAR(100),
  canonical_position INTEGER NOT NULL,

  scale_type VARCHAR(30) NOT NULL,
  scale_min INTEGER NOT NULL,
  scale_max INTEGER NOT NULL,
  allows_not_applicable BOOLEAN NOT NULL DEFAULT FALSE,
  reverse_scored BOOLEAN NOT NULL DEFAULT FALSE,

  -- Stands in for the wording: sha256 over version, key, text and scale labels,
  -- computed at ingestion and recomputed before every presentation.
  render_digest VARCHAR(64) NOT NULL,

  CONSTRAINT chk_instrument_item_scale CHECK (scale_min < scale_max),
  CONSTRAINT chk_instrument_item_position CHECK (canonical_position >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_instrument_item
  ON instrument_items(version_id, item_key);
CREATE UNIQUE INDEX IF NOT EXISTS uq_instrument_item_position
  ON instrument_items(version_id, canonical_position);

-- ============================================================
-- 4. Allowed cut points — a whitelist
-- ============================================================
-- A cut absent from this table is inexpressible rather than merely discouraged.
-- `authority` records, cut point by cut point, whether the instrument owner
-- supplied it or EMOPET proposed it; an EMOPET-proposed cut point is a decision
-- about how a validated instrument is administered and must be submitted.
CREATE TABLE IF NOT EXISTS instrument_breakpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL
    CONSTRAINT instrument_breakpoints_version_id_instrument_versions_id_fk
    REFERENCES instrument_versions(id),

  after_position INTEGER NOT NULL,
  breakpoint_kind VARCHAR(30) NOT NULL
    CONSTRAINT chk_breakpoint_kind
    CHECK (breakpoint_kind IN ('section_boundary','intra_section')),
  authority VARCHAR(30) NOT NULL DEFAULT 'emopet_proposed'
    CONSTRAINT chk_breakpoint_authority
    CHECK (authority IN ('licensed','emopet_proposed','emopet_approved')),
  approval_reference VARCHAR(255),
  rationale JSONB DEFAULT '{}'::jsonb,
  breakpoint_set_version INTEGER NOT NULL DEFAULT 1,

  CONSTRAINT chk_breakpoint_position CHECK (after_position >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_breakpoint
  ON instrument_breakpoints(version_id, breakpoint_set_version, after_position);

-- ============================================================
-- 5. Administration policy
-- ============================================================
-- Administration mode changes by inserting a row, not by changing code.
--
-- adaptive_signals is a CLOSED list: session sizing may only read the
-- app-behaviour signals named there. No sensor or inference field is admissible,
-- because sensor data must not choose a cut, the moment of a section, or its
-- context. An unknown key is a loud failure, never a silent fallback.
--
-- max_scientific_use_status is a CEILING, not a verdict. Because the respondent
-- may chain sessions freely, the real shape of an administration is only known
-- at close, so the effective status is computed then and capped by this value.
CREATE TABLE IF NOT EXISTS instrument_administration_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL
    CONSTRAINT instrument_administration_policies_version_id_instrument_versions_id_fk
    REFERENCES instrument_versions(id),
  policy_key VARCHAR(100) NOT NULL,
  policy_version INTEGER NOT NULL DEFAULT 1,

  administration_mode VARCHAR(30) NOT NULL
    CONSTRAINT chk_policy_mode
    CHECK (administration_mode IN ('standardized','progressive','research','unknown')),
  order_strategy VARCHAR(40) NOT NULL DEFAULT 'canonical'
    CONSTRAINT chk_policy_order_strategy
    CHECK (order_strategy IN ('canonical','subscale_blocked','licensed_randomized')),

  target_session_minutes INTEGER NOT NULL DEFAULT 3,
  min_items_per_session INTEGER NOT NULL DEFAULT 5,
  max_items_per_session INTEGER NOT NULL DEFAULT 15,
  adaptive_sizing BOOLEAN NOT NULL DEFAULT TRUE,
  adaptive_signals JSONB NOT NULL
    DEFAULT '["median_session_duration","completion_rate","pause_frequency"]'::jsonb,

  allow_chaining BOOLEAN NOT NULL DEFAULT TRUE,
  max_sessions INTEGER,
  max_window_hours INTEGER NOT NULL,
  max_session_gap_hours INTEGER,
  min_inter_item_ms INTEGER NOT NULL DEFAULT 800,
  allow_resume BOOLEAN NOT NULL DEFAULT TRUE,
  allow_revision BOOLEAN NOT NULL DEFAULT FALSE,

  allow_mid_session_pause BOOLEAN NOT NULL DEFAULT TRUE,
  max_reminders_per_missed_session INTEGER NOT NULL DEFAULT 2,
  deadline_warning_hours_before INTEGER NOT NULL DEFAULT 48,
  deadline_warning_counts_as_reminder BOOLEAN NOT NULL DEFAULT TRUE,

  -- 'silent_flag' is the only mode with no neutrality risk, because a pause
  -- offered in reaction to fast or uniform answering is itself a comment on
  -- those answers. It is therefore the default.
  fatigue_response_mode VARCHAR(30) NOT NULL DEFAULT 'silent_flag'
    CONSTRAINT chk_policy_fatigue_mode
    CHECK (fatigue_response_mode IN ('silent_flag','boundary_offer','immediate_offer')),

  max_scientific_use_status VARCHAR(30) NOT NULL
    CONSTRAINT chk_policy_use_status
    CHECK (max_scientific_use_status IN ('unreviewed','scoring_allowed','research_only','not_equivalent')),

  approved_by VARCHAR(255),
  approval_reference VARCHAR(255),
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_policy_window CHECK (
    max_window_hours > 0
    AND min_items_per_session > 0
    AND min_items_per_session <= max_items_per_session
    AND target_session_minutes > 0
    AND (max_sessions IS NULL OR max_sessions > 0)
    AND (max_session_gap_hours IS NULL OR max_session_gap_hours > 0)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_policy_key_version
  ON instrument_administration_policies(version_id, policy_key, policy_version);
CREATE INDEX IF NOT EXISTS idx_policy_version
  ON instrument_administration_policies(version_id);

-- ============================================================
-- 6. Administration sessions
-- ============================================================
-- A pause is not a missed session and consumes no reminder quota: only a session
-- that was invited and never opened does. Chaining extends the same session row
-- rather than creating another, which is what lets a one-sitting administration
-- be recognised as such when the effective scientific status is computed.
CREATE TABLE IF NOT EXISTS administration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL
    CONSTRAINT administration_sessions_assessment_id_behavioral_assessments_id_fk
    REFERENCES behavioral_assessments(id) ON DELETE CASCADE,
  session_index INTEGER NOT NULL,
  state VARCHAR(30) NOT NULL DEFAULT 'planned'
    CONSTRAINT chk_session_state
    CHECK (state IN ('planned','invited','open','paused','closed','expired','abandoned')),

  planned_item_keys JSONB NOT NULL,
  planned_item_count INTEGER NOT NULL,

  opened_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,

  breakpoint_set_version INTEGER NOT NULL,
  opened_at_breakpoint_id UUID
    CONSTRAINT administration_sessions_opened_at_breakpoint_id_instrument_breakpoints_id_fk
    REFERENCES instrument_breakpoints(id),
  closed_at_breakpoint_id UUID
    CONSTRAINT administration_sessions_closed_at_breakpoint_id_instrument_breakpoints_id_fk
    REFERENCES instrument_breakpoints(id),

  -- Only keys drawn from the policy's closed adaptive_signals list may appear.
  sizing_signals JSONB DEFAULT '{}'::jsonb,
  sizing_decision VARCHAR(30),

  chained_from_session_id UUID,
  resumed_at_item_key VARCHAR(100),
  mid_session_pause_count INTEGER NOT NULL DEFAULT 0,

  reminder_count INTEGER NOT NULL DEFAULT 0,
  deadline_warning_sent_at TIMESTAMPTZ,

  -- Attests that no sensor data entered the decision to invite, to size or to
  -- cut, and that no salient sensor observation was shown shortly before.
  quiet_window_proof JSONB DEFAULT '{}'::jsonb,
  invitation_channel VARCHAR(30),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_session_sizing CHECK (
    sizing_decision IS NULL
    OR sizing_decision IN ('default','adapted_shorter','adapted_longer','owner_chained')
  ),
  -- The two-reminder cap is a promise to the respondent, enforced here so that
  -- no later change to the notification layer can make Breiz insistent. The
  -- literal is deliberate: raising it requires revising this constraint.
  CONSTRAINT chk_session_reminder_cap CHECK (reminder_count BETWEEN 0 AND 2),
  CONSTRAINT chk_session_counts CHECK (
    planned_item_count > 0 AND mid_session_pause_count >= 0
  ),
  CONSTRAINT chk_session_index CHECK (session_index >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_session_assessment_index
  ON administration_sessions(assessment_id, session_index);
CREATE INDEX IF NOT EXISTS idx_session_assessment
  ON administration_sessions(assessment_id);

-- ============================================================
-- 7. Fidelity audit journal (append-only)
-- ============================================================
-- Holds no item text and no generated conversational text: fidelity is proven by
-- digests, framing by a template identifier plus a digest. That keeps the journal
-- compatible with the rule that AI conversational content is never durably
-- persisted.
--
-- The segmentation covariates are the point of this table. Because item order is
-- identical for every respondent, segmentation is the only dimension that
-- varies; recording the segmentation each item actually experienced turns that
-- variability into an analysable covariate instead of uncontrolled noise.
CREATE TABLE IF NOT EXISTS instrument_administration_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL
    CONSTRAINT instrument_administration_events_assessment_id_behavioral_assessments_id_fk
    REFERENCES behavioral_assessments(id) ON DELETE CASCADE,
  session_id UUID
    CONSTRAINT instrument_administration_events_session_id_administration_sessions_id_fk
    REFERENCES administration_sessions(id) ON DELETE CASCADE,
  sequence_index INTEGER NOT NULL,

  event_type VARCHAR(40) NOT NULL
    CONSTRAINT chk_event_type
    CHECK (event_type IN (
      'assessment_opened','session_planned','session_invited','session_opened',
      'frame_presented','section_title_presented','item_presented','item_answered','item_revised',
      'session_paused','session_resumed','session_closed','window_expired',
      'validity_flag_raised','assessment_completed','assessment_invalidated','scored',
      'mid_session_pause','continue_offered','continue_accepted','continue_declined',
      'fatigue_flag_raised','pause_offered','reminder_sent','deadline_warning_sent',
      'session_size_decided'
    )),
  item_key VARCHAR(100),

  render_digest VARCHAR(64),
  frame_digest VARCHAR(64),
  frame_template_id VARCHAR(100),

  llm_involved BOOLEAN NOT NULL DEFAULT FALSE,

  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  client_latency_ms INTEGER,

  position_in_session INTEGER,
  items_since_resume INTEGER,
  hours_since_previous_item REAL,
  crossed_section_boundary BOOLEAN,
  is_first_item_after_pause BOOLEAN,

  prev_event_hash VARCHAR(64),
  event_hash VARCHAR(64) NOT NULL,

  -- Item fidelity expressed as a database constraint rather than a team
  -- convention: an item presentation that involved a model, or that lacks a
  -- render digest, cannot be recorded at all.
  CONSTRAINT chk_event_item_presentation CHECK (
    event_type <> 'item_presented'
    OR (render_digest IS NOT NULL AND item_key IS NOT NULL AND llm_involved = FALSE)
  ),
  CONSTRAINT chk_event_section_title CHECK (
    event_type <> 'section_title_presented'
    OR (render_digest IS NOT NULL AND llm_involved = FALSE)
  ),
  CONSTRAINT chk_event_sequence CHECK (sequence_index >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_event_assessment_sequence
  ON instrument_administration_events(assessment_id, sequence_index);
CREATE INDEX IF NOT EXISTS idx_event_assessment
  ON instrument_administration_events(assessment_id);
CREATE INDEX IF NOT EXISTS idx_event_session
  ON instrument_administration_events(session_id);

-- ============================================================
-- 8. Additive columns on behavioral_assessments
-- ============================================================
-- Referential replacements for the free-text instrument fields, plus the finer
-- lifecycle of a sequential administration. All nullable or defaulted so every
-- existing row stays valid. `status` keeps its original three-value CHECK and
-- stays the public projection read by the privacy discovery services.
ALTER TABLE "behavioral_assessments"
  ADD COLUMN IF NOT EXISTS "version_id" UUID,
  ADD COLUMN IF NOT EXISTS "policy_id" UUID,
  ADD COLUMN IF NOT EXISTS "lifecycle_state" VARCHAR(30) NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS "window_ends_at" TIMESTAMPTZ;

ALTER TABLE "behavioral_assessments"
  DROP CONSTRAINT IF EXISTS "behavioral_assessments_version_id_instrument_versions_id_fk";
ALTER TABLE "behavioral_assessments"
  ADD CONSTRAINT "behavioral_assessments_version_id_instrument_versions_id_fk"
  FOREIGN KEY ("version_id") REFERENCES "public"."instrument_versions"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

-- This constraint name is 73 bytes and PostgreSQL truncates identifiers to 63,
-- so it is stored as "behavioral_assessments_policy_id_instrument_administration_poli"
-- and applying this file emits a truncate_identifier notice. That is expected and
-- deliberate: the name follows Drizzle's {table}_{column}_{reftable}_{refcolumn}_fk
-- convention, so the hand-applied migration path and the generated Drizzle
-- baseline truncate to the SAME name and the two databases agree. Shortening it
-- here would make them disagree, which is exactly how the duplicate
-- respondent_user_id foreign keys visible on the migration path arose.
-- Truncation is deterministic, so the DROP below matches the stored name and this
-- file stays idempotent.
ALTER TABLE "behavioral_assessments"
  DROP CONSTRAINT IF EXISTS "behavioral_assessments_policy_id_instrument_administration_policies_id_fk";
ALTER TABLE "behavioral_assessments"
  ADD CONSTRAINT "behavioral_assessments_policy_id_instrument_administration_policies_id_fk"
  FOREIGN KEY ("policy_id") REFERENCES "public"."instrument_administration_policies"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "behavioral_assessments"
  DROP CONSTRAINT IF EXISTS "chk_behavioral_assessment_lifecycle";
ALTER TABLE "behavioral_assessments"
  ADD CONSTRAINT "chk_behavioral_assessment_lifecycle" CHECK (
    lifecycle_state IN (
      'draft','planned','in_progress','awaiting_session','complete',
      'scored','expired','partial_retained','abandoned','invalidated'
    )
  );

COMMIT;

-- ============================================================
-- Rollback (manual):
--   BEGIN;
--   ALTER TABLE "behavioral_assessments"
--     DROP CONSTRAINT IF EXISTS "chk_behavioral_assessment_lifecycle",
--     DROP CONSTRAINT IF EXISTS "behavioral_assessments_policy_id_instrument_administration_policies_id_fk",
--     DROP CONSTRAINT IF EXISTS "behavioral_assessments_version_id_instrument_versions_id_fk";
--   ALTER TABLE "behavioral_assessments"
--     DROP COLUMN IF EXISTS "window_ends_at",
--     DROP COLUMN IF EXISTS "lifecycle_state",
--     DROP COLUMN IF EXISTS "policy_id",
--     DROP COLUMN IF EXISTS "version_id";
--   DROP TABLE IF EXISTS instrument_administration_events;
--   DROP TABLE IF EXISTS administration_sessions;
--   DROP TABLE IF EXISTS instrument_administration_policies;
--   DROP TABLE IF EXISTS instrument_breakpoints;
--   DROP TABLE IF EXISTS instrument_items;
--   DROP TABLE IF EXISTS instrument_sections;
--   DROP TABLE IF EXISTS instrument_versions;
--   DROP TABLE IF EXISTS instruments;
--   COMMIT;
-- ============================================================
