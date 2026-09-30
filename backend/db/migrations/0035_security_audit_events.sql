-- PRIV-SEC-G4 / #198 — dedicated durable security-audit sink.
-- Repository-level insert-only authority only.
-- No retention duration, read route, DB-principal immutability, WORM or
-- tamper-resistance claim is created by this migration.

CREATE TABLE security_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_version varchar(32) NOT NULL,
  event_type varchar(64) NOT NULL,
  occurred_at timestamptz NOT NULL,

  actor_kind varchar(32) NOT NULL,
  actor_subject varchar(128),
  actor_role varchar(16),

  action varchar(64) NOT NULL,

  target_scope varchar(32) NOT NULL,
  target_ref varchar(128),

  outcome varchar(16) NOT NULL,
  reason varchar(64) NOT NULL,

  stored_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_security_audit_events_schema
    CHECK (schema_version = 'security-audit-v1'),

  CONSTRAINT chk_security_audit_events_event_type
    CHECK (event_type IN (
      'privileged_authority_decision',
      'privileged_sensitive_access',
      'security_incident_access'
    )),

  CONSTRAINT chk_security_audit_events_actor_shape
    CHECK (
      (
        actor_kind = 'privileged_human'
        AND actor_subject ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        AND actor_role IN ('admin', 'support', 'operator')
      ) OR (
        actor_kind = 'owner'
        AND actor_subject ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        AND actor_role IS NULL
      ) OR (
        actor_kind = 'machine'
        AND actor_subject ~ '^service:[a-zA-Z0-9._-]{1,96}$'
        AND actor_role IS NULL
      ) OR (
        actor_kind = 'anonymous'
        AND actor_subject IS NULL
        AND actor_role IS NULL
      )
    ),

  CONSTRAINT chk_security_audit_events_action
    CHECK (action IN (
      'account.read_limited',
      'account.security_lock',
      'support.case.read_limited',
      'security.incident.read',
      'security.incident.coordinate',
      'moderation.queue.read',
      'moderation.post.manage',
      'contact.request.read',
      'contact.request.manage',
      'admin.data.read'
    )),

  CONSTRAINT chk_security_audit_events_target_shape
    CHECK (
      (
        target_scope = 'system'
        AND target_ref IS NULL
      ) OR (
        target_scope IN ('account', 'dog', 'support_case', 'security_incident')
        AND target_ref ~ '^[a-zA-Z0-9:._-]{1,128}$'
      )
    ),

  CONSTRAINT chk_security_audit_events_outcome_reason
    CHECK (
      (outcome = 'allowed' AND reason = 'allowed')
      OR (outcome = 'error' AND reason = 'internal_error')
      OR (
        outcome = 'denied'
        AND reason IN (
          'invalid_principal',
          'mfa_required',
          'action_not_allowed',
          'machine_principal_not_supported',
          'not_found'
        )
      )
    )
);

CREATE INDEX idx_security_audit_events_occurred_at
  ON security_audit_events(occurred_at);

CREATE INDEX idx_security_audit_events_actor_subject_occurred_at
  ON security_audit_events(actor_subject, occurred_at);

CREATE INDEX idx_security_audit_events_target_occurred_at
  ON security_audit_events(target_scope, target_ref, occurred_at);
