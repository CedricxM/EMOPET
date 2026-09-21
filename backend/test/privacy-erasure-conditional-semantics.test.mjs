import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const privacyRoot = new URL('../../config/privacy/', import.meta.url);
const repoRoot = new URL('../../', import.meta.url);

async function json(name) {
  return JSON.parse(await readFile(new URL(name, privacyRoot), 'utf8'));
}

async function source(path) {
  return readFile(new URL(path, repoRoot), 'utf8');
}

const [matrix, packet, semantics] = await Promise.all([
  json('erasure-disposition-matrix.json'),
  json('erasure-disposition-decision-packet.json'),
  json('erasure-conditional-semantics.json'),
]);

const key = (row) =>
  [row.subjectRoot, row.relationType, row.table, row.column].join('|');

test('conditional semantics remain decision support only with zero matrix promotion', () => {
  assert.equal(
    semantics.schemaVersion,
    'emopet-erasure-conditional-semantics-v1',
  );
  assert.equal(
    semantics.status,
    'FOUR_PRODUCT_PRIVACY_DECISIONS_APPROVED_LEGAL_PRIVACY_DECISION_REMAINS',
  );
  assert.equal(semantics.claimsExecutableErasure, false);
  assert.equal(semantics.claimsCompleteErasure, false);
  assert.deepEqual(semantics.summary, {
    conditionalRowsTotal: 12,
    semanticsAlreadyDeterminedByExistingPolicy: 7,
    authorityDecisionsStillRequired: 1,
    matrixRowsPromoted: 0,
    productPrivacyDecisionsApproved: 4,
  });

  for (const row of [...semantics.policyDetermined, ...semantics.authorityDecisionsRemaining]) {
    assert.equal(row.promotionAuthorized, false);
  }
  for (const row of semantics.productPrivacyDecisionsApproved) {
    assert.equal(row.promotionAuthorized, true);
    assert.equal(row.executionStatus, 'NOT_IMPLEMENTED');
  }

  for (const row of matrix.entries) {
    assert.equal(row.disposition, 'TO_CONFIRM');
    assert.equal(row.executionStatus, 'NOT_IMPLEMENTED');
  }
});

test('the 12 conditional packet rows are partitioned exactly into 7 determined semantics plus 5 real decisions', () => {
  const packetConditional = packet.relations
    .filter((row) => row.decisionSupportStatus === 'POLICY_CONDITIONAL_EXECUTION_REQUIRED')
    .map(key)
    .sort();

  const semanticsKeys = [
    ...semantics.policyDetermined.map((row) => row.relation),
    ...semantics.authorityDecisionsRemaining.map((row) => row.relation),
    ...semantics.productPrivacyDecisionsApproved.map((row) => row.relation),
  ].sort();

  assert.equal(packetConditional.length, 12);
  assert.equal(semanticsKeys.length, 12);
  assert.equal(new Set(semanticsKeys).size, 12);
  assert.deepEqual(semanticsKeys, packetConditional);
});

test('seven conditional rows need implementation semantics but no new founder decision', () => {
  assert.deepEqual(
    semantics.policyDetermined.map((row) => row.relation).sort(),
    [
      'dogs.id|DIRECT_FK|behavioral_assessments|dog_id',
      'dogs.id|DIRECT_FK|devices|dog_id',
      'dogs.id|TRANSITIVE_FK|behavioral_factor_scores|assessment_id',
      'dogs.id|TRANSITIVE_FK|behavioral_responses|assessment_id',
      'users.id|DIRECT_FK|auth_refresh_sessions|user_id',
      'users.id|DIRECT_FK|comments|author_id',
      'users.id|DIRECT_FK|posts|author_id',
    ],
  );

  for (const row of semantics.policyDetermined) {
    assert.equal(row.newHumanDecisionRequired, false);
    assert.ok(Array.isArray(row.policyRefs));
    assert.ok(row.policyRefs.length > 0);
    assert.ok(Array.isArray(row.semantics));
    assert.ok(row.semantics.length >= 2);
    assert.equal(typeof row.implementationConsequence, 'string');
  }
});

test('refresh-session semantics preserve the already-approved revoke-now then delete-at-expiry lifecycle', () => {
  const row = semantics.policyDetermined.find(
    (item) => item.relation === 'users.id|DIRECT_FK|auth_refresh_sessions|user_id',
  );

  assert.deepEqual(row.semantics, [
    'REVOKE_ALL_ACTIVE_REFRESH_SESSIONS_IMMEDIATELY',
    'PRESERVE_REVOKED_SESSION_ROWS_ONLY_UNTIL_EACH_ORIGINAL_EXPIRES_AT_FOR_REUSE_DETECTION',
    'DELETE_EXPIRED_SESSION_ROWS',
    'DELETE_ACCOUNT_ROOT_NO_LATER_THAN_APPROVED_ACCOUNT_CLOSURE_WINDOW',
  ]);
  assert.match(row.currentSchemaConstraint, /NOT NULL/);
  assert.match(row.implementationConsequence, /stage account erasure/i);
});

test('R2 post/comment semantics remain delete-first with exceptional irreversible de-identification', () => {
  for (const relation of [
    'users.id|DIRECT_FK|comments|author_id',
    'users.id|DIRECT_FK|posts|author_id',
  ]) {
    const row = semantics.policyDetermined.find((item) => item.relation === relation);
    assert.ok(row);
    assert.equal(row.semanticType, 'R2_DELETE_FIRST_THREAD_INTEGRITY_EXCEPTION');
    assert.equal(row.semantics[0], 'DELETE_BY_DEFAULT');
    assert.ok(row.semantics.some((value) => /IRREVERSIBLE_DEIDENTIFICATION/.test(value)));
    assert.ok(row.semantics.some((value) => /DELETE/.test(value)));
  }
});

test('behavioral dog-side children inherit parent product-vs-research authority rather than database CASCADE choosing policy', () => {
  const assessment = semantics.policyDetermined.find(
    (item) => item.relation === 'dogs.id|DIRECT_FK|behavioral_assessments|dog_id',
  );
  assert.ok(assessment.semantics.some((value) => /administration_mode != research/.test(value)));
  assert.ok(assessment.semantics.some((value) => /administration_mode == research/.test(value)));

  for (const relation of [
    'dogs.id|TRANSITIVE_FK|behavioral_responses|assessment_id',
    'dogs.id|TRANSITIVE_FK|behavioral_factor_scores|assessment_id',
  ]) {
    const child = semantics.policyDetermined.find((item) => item.relation === relation);
    assert.equal(child.semanticType, 'INHERIT_PARENT_ASSESSMENT_DISPOSITION');
    assert.ok(child.semantics.includes('PRODUCT_PARENT_DELETE => CASCADE_CHILD_DELETE'));
    assert.ok(child.semantics.includes('RESEARCH_PARENT_HELD => CHILD_MUST_NOT_BE_DELETED_BY_PRODUCT_EXECUTOR'));
  }
});

test('device metadata needs schema support for detach but no new product-retention choice', async () => {
  const row = semantics.policyDetermined.find(
    (item) => item.relation === 'dogs.id|DIRECT_FK|devices|dog_id',
  );
  assert.equal(row.semanticType, 'DETACH_THEN_BOUNDED_METADATA_RETENTION');
  assert.ok(row.semantics.includes('UNBIND_DEVICE_FROM_DOG_IMMEDIATELY_ON_DOG_ERASURE'));
  assert.match(row.currentSchemaConstraint, /NOT NULL/);

  const dogsSchema = await source('backend/db/schema/dogs.ts');
  assert.match(
    dogsSchema,
    /export const devices = pgTable\('devices'[\s\S]*dogId: uuid\('dog_id'\)\.notNull\(\)\.references/,
  );
});

test('only rules acceptance still requires privacy/legal authority', () => {
  const remaining = Object.fromEntries(
    semantics.authorityDecisionsRemaining.map((row) => [row.relation, row]),
  );

  assert.deepEqual(
    Object.keys(remaining).sort(),
    ['users.id|DIRECT_FK|community_rules_acceptances|user_id'],
  );

  assert.equal(
    remaining['users.id|DIRECT_FK|community_rules_acceptances|user_id'].decisionClass,
    'LEGAL_PRIVACY_EVIDENCE_DECISION_REQUIRED',
  );
  assert.equal(
    remaining['users.id|DIRECT_FK|community_rules_acceptances|user_id'].requiredAuthority,
    'PRIVACY_LEGAL',
  );
});

test('Community created_by is provenance, while runtime access authority is membership scoped', async () => {
  const route = await source('backend/api/routes/community.ts');

  assert.match(route, /requireCommunityMembership/);
  assert.match(route, /communityMembers\.userId/);
  assert.match(route, /requireCurrentRulesAcceptance/);
  assert.equal(/eq\(communities\.createdBy/.test(route), false);
  assert.equal(/eq\(communityEvents\.createdBy/.test(route), false);

  const communityDecision = semantics.productPrivacyDecisionsApproved.find(
    (row) => row.relation === 'users.id|DIRECT_FK|communities|created_by',
  );
  const eventDecision = semantics.productPrivacyDecisionsApproved.find(
    (row) => row.relation === 'users.id|DIRECT_FK|community_events|created_by',
  );

  assert.equal(communityDecision.decision, 'DETACH_OR_ANONYMIZE_CREATOR_AND_KEEP_COMMUNITY');
  assert.equal(eventDecision.decision, 'DETACH_OR_ANONYMIZE_CREATOR_AND_KEEP_EVENT');
});

test('respondent user id is nullable today, making privacy-first detach technically representable for surviving product assessments', async () => {
  const schema = await source('backend/db/schema/behavioral-assessments.ts');
  assert.match(
    schema,
    /respondentUserId: uuid\('respondent_user_id'\)\.references\(\(\) => users\.id\)/,
  );
  assert.equal(
    /respondentUserId: uuid\('respondent_user_id'\)\.notNull\(\)/.test(schema),
    false,
  );

  const row = semantics.productPrivacyDecisionsApproved.find(
    (item) => item.relation === 'users.id|DIRECT_FK|behavioral_assessments|respondent_user_id',
  );
  assert.equal(row.decision, 'DETACH_RESPONDENT_ID_FOR_SURVIVING_PRODUCT_ASSESSMENT');
});

test('moderation reporter and rules-acceptance decisions stay unresolved rather than silently retaining identified evidence', () => {
  const report = semantics.productPrivacyDecisionsApproved.find(
    (row) => row.relation === 'users.id|DIRECT_FK|community_reports|reporter_user_id',
  );
  assert.equal(report.decision, 'ANONYMIZE_OR_DETACH_REPORTER_KEEP_REPORT');
  assert.equal(report.executionStatus, 'NOT_IMPLEMENTED');

  const rules = semantics.authorityDecisionsRemaining.find(
    (row) => row.relation === 'users.id|DIRECT_FK|community_rules_acceptances|user_id',
  );
  assert.equal(rules.decisionClass, 'LEGAL_PRIVACY_EVIDENCE_DECISION_REQUIRED');
  assert.match(rules.privacyFirstRecommendation, /Do not retain identified acceptance evidence/);
});
