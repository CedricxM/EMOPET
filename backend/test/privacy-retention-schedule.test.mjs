import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const schedule = JSON.parse(
  await readFile(new URL('../../config/privacy/retention-schedule.json', import.meta.url), 'utf8'),
);

function byId(id) {
  const row = schedule.categories.find((entry) => entry.id === id);
  assert.ok(row, `missing retention category: ${id}`);
  return row;
}

test('retention schedule stays a product-approved candidate and cannot claim runtime/legal completion', () => {
  assert.equal(schedule.schemaVersion, 'emopet-retention-schedule-v1');
  assert.equal(schedule.status, 'PRODUCT_APPROVED_CANDIDATE_LEGAL_PRIVACY_SIGNOFF_PENDING');
  assert.equal(schedule.runtimeEnforcement, 'NOT_IMPLEMENTED');
  assert.equal(schedule.productPhilosophy, 'RICH_LONGITUDINAL_HISTORY_WITH_PROGRESSIVE_MINIMISATION');
  assert.equal(schedule.decisions.R1, 'ACTIVE_DOG_PROFILE_LIFETIME_AGGREGATES');
  assert.equal(
    schedule.decisions.R2,
    'DELETE_DEFAULT_NECESSITY_ONLY_IRREVERSIBLE_ANONYMISATION_FAIL_TO_DELETE',
  );
});

test('retention schedule has a complete explicit category inventory and no indefinite mode', () => {
  const expected = [
    'account_auth',
    'auth_refresh_sessions',
    'dog_profile',
    'device_binding_admin_metadata',
    'sensor_preprocessed_detailed',
    'sensor_preprocessed_aggregates',
    'sensor_raw_audio',
    'eli_inferred_detailed',
    'eli_inferred_aggregates',
    'veterinary_user_entered_records',
    'exact_location',
    'coarse_location_context',
    'community_content',
    'moderation_evidence',
    'support_contact',
    'security_auth_logs',
    'incident_evidence',
    'rights_request_evidence',
    'backups',
    'research_validation_personal_datasets',
  ];

  assert.deepEqual(schedule.categories.map((entry) => entry.id).sort(), expected.sort());

  for (const row of schedule.categories) {
    assert.equal(typeof row.trigger, 'string');
    assert.ok(row.trigger.length > 0);
    assert.equal(typeof row.activeRetention?.mode, 'string');
    assert.ok(!/INDEFINITE|FOREVER/i.test(JSON.stringify(row)));
    assert.equal(typeof row.finalDisposition, 'string');
    assert.ok(row.finalDisposition.length > 0);
    assert.ok(Array.isArray(row.holdConditions));
    assert.ok(['REQUIRED', 'NEGATIVE_EVIDENCE_REQUIRED'].includes(row.purgeEvidence));
    assert.ok(
      String(row.authority).includes('PRODUCT_APPROVED')
      || row.id === 'sensor_raw_audio'
      || (
        row.id === 'auth_refresh_sessions'
        && String(row.authority).startsWith('TECHNICAL_SECURITY_LIFECYCLE_CANDIDATE_')
      ),
      `unexpected retention authority class for ${row.id}: ${row.authority}`,
    );
  }
});

test('refresh-session retention matches the current 30-day credential security window', () => {
  const session = byId('auth_refresh_sessions');
  assert.deepEqual(session.activeRetention, {
    mode: 'DURATION',
    value: 30,
    unit: 'DAYS',
  });
  assert.match(session.finalDisposition, /REVOKE_IMMEDIATELY/);
  assert.match(session.finalDisposition, /ORIGINAL_EXPIRY_WINDOW/);
  assert.deepEqual(session.holdConditions, []);
  assert.match(session.authority, /TECHNICAL_SECURITY_LIFECYCLE_CANDIDATE/);
});

test('rich longitudinal history keeps detailed data bounded and aggregates tied to active dog lifetime', () => {
  assert.deepEqual(byId('sensor_preprocessed_detailed').activeRetention, {
    mode: 'DURATION',
    value: 24,
    unit: 'MONTHS',
  });
  assert.deepEqual(byId('eli_inferred_detailed').activeRetention, {
    mode: 'DURATION',
    value: 36,
    unit: 'MONTHS',
  });

  for (const id of ['sensor_preprocessed_aggregates', 'eli_inferred_aggregates']) {
    assert.deepEqual(byId(id).activeRetention, { mode: 'ACTIVE_DOG_PROFILE_LIFETIME' });
    assert.equal(byId(id).finalDisposition, 'DELETE_ON_DOG_OR_ACCOUNT_ERASURE');
  }
});

test('high-risk location is materially shorter than behavioral history', () => {
  assert.deepEqual(byId('exact_location').activeRetention, {
    mode: 'MAX_DURATION',
    value: 24,
    unit: 'HOURS',
  });
  assert.deepEqual(byId('coarse_location_context').activeRetention, {
    mode: 'MAX_DURATION',
    value: 90,
    unit: 'DAYS',
  });
  assert.match(byId('exact_location').finalDisposition, /EARLIER/);
});

test('raw sensor/audio doctrine authorises zero durable retention', () => {
  const raw = byId('sensor_raw_audio');
  assert.deepEqual(raw.activeRetention, {
    mode: 'NO_DURABLE_RETENTION',
    value: 0,
    unit: 'SECONDS',
  });
  assert.equal(raw.finalDisposition, 'DO_NOT_DURABLY_COLLECT_OR_PERSIST');
  assert.equal(raw.purgeEvidence, 'NEGATIVE_EVIDENCE_REQUIRED');
});

test('Community account erasure is delete-first and anonymity must be irreversible', () => {
  const community = byId('community_content');
  assert.match(community.finalDisposition, /^DELETE_BY_DEFAULT/);
  assert.match(community.finalDisposition, /IRREVERSIBLE_DEIDENTIFICATION/);
  assert.match(community.finalDisposition, /SAFE_ANONYMISATION_CANNOT_BE_ACHIEVED, DELETE/);

  for (const requirement of [
    'REMOVE_ACCOUNT_USER_ID',
    'REMOVE_DISPLAY_NAME_HANDLE',
    'REMOVE_PROFILE_PHOTO_AVATAR',
    'REMOVE_DOG_ACCOUNT_BACKLINK',
    'REMOVE_EXACT_AND_COARSE_LOCATION',
    'REMOVE_IDENTIFYING_MEDIA_ATTACHMENTS',
    'REMOVE_DIRECT_AND_INDIRECT_PERSONAL_REFERENCES',
    'NO_REVERSIBLE_PSEUDONYM_OR_LOOKUP_TABLE',
    'DISPLAY_NEUTRAL_TOMBSTONE_DELETED_ACCOUNT',
  ]) {
    assert.ok(community.deidentificationRequirements.includes(requirement), requirement);
  }
});

test('operational evidence classes remain separately bounded', () => {
  assert.deepEqual(byId('moderation_evidence').activeRetention, {
    mode: 'DURATION',
    value: 12,
    unit: 'MONTHS',
  });
  assert.deepEqual(byId('support_contact').activeRetention, {
    mode: 'DURATION',
    value: 24,
    unit: 'MONTHS',
  });
  assert.deepEqual(byId('security_auth_logs').activeRetention, {
    mode: 'ROLLING_DURATION',
    value: 12,
    unit: 'MONTHS',
  });
  assert.deepEqual(byId('incident_evidence').activeRetention, {
    mode: 'DURATION',
    value: 24,
    unit: 'MONTHS',
  });
  assert.deepEqual(byId('backups').activeRetention, {
    mode: 'ROLLING_DURATION',
    value: 30,
    unit: 'DAYS',
  });
});

test('rights evidence remains explicitly product-candidate and requires legal validation', () => {
  const rights = byId('rights_request_evidence');
  assert.deepEqual(rights.activeRetention, {
    mode: 'DURATION',
    value: 3,
    unit: 'YEARS',
  });
  assert.equal(rights.authority, 'PRODUCT_APPROVED_CANDIDATE_LEGAL_VALIDATION_REQUIRED');
  assert.match(rights.archive, /MINIMAL_PROOF_ONLY/);
});
