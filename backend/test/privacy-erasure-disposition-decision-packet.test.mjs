import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../config/privacy/', import.meta.url);

async function readJson(name) {
  return JSON.parse(await readFile(new URL(name, root), 'utf8'));
}

const [matrix, packet] = await Promise.all([
  readJson('erasure-disposition-matrix.json'),
  readJson('erasure-disposition-decision-packet.json'),
]);

const relationKey = (row) =>
  [row.subjectRoot, row.relationType, row.table, row.column].join('|');

const approvedDetaches = new Set([
  'users.id|DIRECT_FK|behavioral_assessments|respondent_user_id',
  'users.id|DIRECT_FK|communities|created_by',
  'users.id|DIRECT_FK|community_events|created_by',
  'users.id|DIRECT_FK|community_reports|reporter_user_id',
]);

test('decision packet records four approved detach rows while complete erasure remains fail closed', () => {
  assert.equal(
    packet.schemaVersion,
    'emopet-erasure-disposition-decision-packet-v1',
  );
  assert.equal(
    packet.status,
    'FOUR_PRODUCT_PRIVACY_DISPOSITIONS_PROMOTED_REMAINDER_DECISION_SUPPORT',
  );
  assert.equal(packet.claimsExecutableErasure, false);
  assert.equal(packet.claimsCompleteErasure, false);
  assert.equal(packet.summary.matrixRowsPromoted, 4);

  for (const row of packet.relations) {
    if (approvedDetaches.has(relationKey(row))) {
      assert.equal(row.promotionAuthorized, true);
      assert.equal(row.disposition, 'DETACH');
      assert.equal(row.candidateDisposition, 'DETACH');
      assert.equal(row.executionStatus, 'IMPLEMENTED');
      assert.equal(row.approvalRef, '#446');
    } else {
      assert.equal(row.promotionAuthorized, false);
    }
  }
  for (const row of packet.nonSqlSurfaces) {
    assert.equal(row.promotionAuthorized, false);
  }
});

test('packet covers every canonical matrix relation exactly once and mirrors promoted authority', () => {
  assert.equal(packet.relations.length, matrix.entries.length);

  const matrixKeys = matrix.entries.map(relationKey).sort();
  const packetKeys = packet.relations.map(relationKey).sort();

  assert.deepEqual(packetKeys, matrixKeys);
  assert.equal(new Set(packetKeys).size, packetKeys.length);

  for (const row of matrix.entries) {
    if (approvedDetaches.has(relationKey(row))) {
      assert.equal(row.disposition, 'DETACH');
      assert.equal(row.executionStatus, 'IMPLEMENTED');
      assert.notEqual(row.testEvidence, 'NONE');
    } else {
      assert.equal(row.disposition, 'TO_CONFIRM');
      assert.equal(row.executionStatus, 'NOT_IMPLEMENTED');
    }
  }
  assert.equal(matrix.claimsExecutableErasure, false);
  assert.equal(matrix.claimsCompleteErasure, false);
});

test('decision grouping counts remain explicit and exhaustive', () => {
  assert.deepEqual(packet.summary, {
    relationalTotal: 37,
    policyAlignedDeleteCandidates: 22,
    policyConditionalExecutionRequired: 12,
    legalAuthorityBlocked: 3,
    matrixRowsPromoted: 4,
  });

  const counts = Object.fromEntries(
    [
      'POLICY_ALIGNED_DELETE_CANDIDATE',
      'POLICY_CONDITIONAL_EXECUTION_REQUIRED',
      'LEGAL_AUTHORITY_BLOCKED',
    ].map((status) => [
      status,
      packet.relations.filter((row) => row.decisionSupportStatus === status).length,
    ]),
  );

  assert.deepEqual(counts, {
    POLICY_ALIGNED_DELETE_CANDIDATE: 22,
    POLICY_CONDITIONAL_EXECUTION_REQUIRED: 12,
    LEGAL_AUTHORITY_BLOCKED: 3,
  });
});

test('policy-aligned candidates are DELETE-only suggestions backed by current product policy', () => {
  const aligned = packet.relations.filter(
    (row) => row.decisionSupportStatus === 'POLICY_ALIGNED_DELETE_CANDIDATE',
  );

  for (const row of aligned) {
    assert.equal(row.candidateDisposition, 'DELETE');
    assert.equal(row.promotionAuthorized, false);
    assert.ok(Array.isArray(row.policyRefs));
    assert.ok(row.policyRefs.length > 0, relationKey(row));
    assert.match(row.rationale, /Candidate remains non-executable/);
  }

  const required = new Set([
    'users.id|DIRECT_FK|ai_messages|target_user_id',
    'users.id|DIRECT_FK|dogs|owner_id',
    'dogs.id|DIRECT_FK|sensor_summaries|dog_id',
    'dogs.id|DIRECT_FK|health_entries|dog_id',
    'dogs.id|DIRECT_FK|copresence_events|dog_a_id',
    'dogs.id|DIRECT_FK|copresence_events|dog_b_id',
  ]);

  const keys = new Set(aligned.map(relationKey));
  for (const key of required) assert.ok(keys.has(key), key);
});

test('conditional rows distinguish approved D1-D4 detach from still-unresolved execution semantics', () => {
  const conditional = Object.fromEntries(
    packet.relations
      .filter((row) => row.decisionSupportStatus === 'POLICY_CONDITIONAL_EXECUTION_REQUIRED')
      .map((row) => [relationKey(row), row]),
  );

  for (const [key, row] of Object.entries(conditional)) {
    assert.ok(Array.isArray(row.allowedOutcomes));
    assert.ok(row.allowedOutcomes.length >= 2);
    assert.equal(typeof row.requiredDecision, 'string');
    assert.ok(row.requiredDecision.length > 0);

    for (const outcome of row.allowedOutcomes) {
      assert.ok(matrix.allowedFutureDispositions.includes(outcome), outcome);
    }

    if (approvedDetaches.has(key)) {
      assert.equal(row.candidateDisposition, 'DETACH');
      assert.equal(row.promotionAuthorized, true);
      assert.equal(row.disposition, 'DETACH');
      assert.equal(row.executionStatus, 'IMPLEMENTED');
    } else {
      assert.equal(row.candidateDisposition, null);
      assert.equal(row.promotionAuthorized, false);
    }
  }

  assert.match(
    conditional['users.id|DIRECT_FK|auth_refresh_sessions|user_id'].requiredDecision,
    /REVOKE_NOW_THEN_DELETE_AT_ORIGINAL_EXPIRY/,
  );

  for (const key of [
    'users.id|DIRECT_FK|comments|author_id',
    'users.id|DIRECT_FK|posts|author_id',
  ]) {
    assert.deepEqual(conditional[key].allowedOutcomes, ['DELETE', 'ANONYMIZE']);
    assert.match(conditional[key].why, /delete-by-default/i);
  }

  assert.ok(
    conditional['dogs.id|DIRECT_FK|devices|dog_id'].allowedOutcomes.includes('DETACH'),
  );
  assert.match(
    conditional['dogs.id|DIRECT_FK|devices|dog_id'].requiredDecision,
    /DETACH-now/,
  );

  for (const key of [
    'dogs.id|DIRECT_FK|behavioral_assessments|dog_id',
    'dogs.id|TRANSITIVE_FK|behavioral_responses|assessment_id',
    'dogs.id|TRANSITIVE_FK|behavioral_factor_scores|assessment_id',
  ]) {
    assert.match(conditional[key].why, /research/i);
  }
});

test('legal blockers are exactly research consent evidence and subscription billing lifecycle', () => {
  const blocked = packet.relations.filter(
    (row) => row.decisionSupportStatus === 'LEGAL_AUTHORITY_BLOCKED',
  );

  assert.deepEqual(
    blocked.map(relationKey).sort(),
    [
      'dogs.id|DIRECT_FK|research_data_consents|dog_id',
      'users.id|DIRECT_FK|research_data_consents|user_id',
      'users.id|DIRECT_FK|subscriptions|user_id',
    ],
  );

  const subscription = blocked.find((row) => row.table === 'subscriptions');
  assert.equal(subscription.requiredAuthority, 'FINANCE_LEGAL_ACCOUNTING');

  const research = blocked.filter((row) => row.table === 'research_data_consents');
  assert.equal(research.length, 2);
  for (const row of research) {
    assert.equal(row.requiredAuthority, 'RESEARCH_LEGAL_GOVERNANCE');
  }
});

test('all five non-SQL surfaces remain external/operational evidence blockers', () => {
  assert.deepEqual(
    packet.nonSqlSurfaces.map((row) => row.surface).sort(),
    [
      'ANALYTICS_TELEMETRY',
      'BACKUPS',
      'CACHES_SEARCH_INDEXES',
      'OBJECT_MEDIA_STORAGE',
      'PROVIDER_HELD_COPIES',
    ],
  );

  for (const row of packet.nonSqlSurfaces) {
    assert.equal(
      row.decisionSupportStatus,
      'EXTERNAL_OPERATIONAL_EVIDENCE_REQUIRED',
    );
    assert.equal(row.promotionAuthorized, false);
    assert.equal(typeof row.candidateHandling, 'string');
    assert.ok(row.candidateHandling.length > 0);
  }

  for (const row of matrix.nonSqlSurfaces) {
    assert.equal(row.disposition, 'TO_CONFIRM');
    assert.equal(row.executionStatus, 'NOT_IMPLEMENTED');
  }
});
