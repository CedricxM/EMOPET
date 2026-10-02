import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const source = (path) => readFile(new URL(path, root), 'utf8');

test('approved D1-D5 privacy decisions remain five while G2 lifecycle authority stays unresolved', async () => {
  const semantics = JSON.parse(await source('config/privacy/erasure-conditional-semantics.json'));
  assert.equal(semantics.summary.productPrivacyDecisionsApproved, 5);
  assert.equal(semantics.summary.authorityDecisionsStillRequired, 8);
  assert.equal(semantics.productPrivacyDecisionsApproved.length, 5);
  assert.deepEqual(
    semantics.authorityDecisionsRemaining.map((row) => row.relation).sort(),
    [
      'dogs.id|DIRECT_FK|professional_share_grants|dog_id',
      'dogs.id|TRANSITIVE_FK|administration_sessions|assessment_id',
      'dogs.id|TRANSITIVE_FK|instrument_administration_events|assessment_id',
      'dogs.id|UNCONSTRAINED_IDENTIFIER|professional_share_access_audits|dog_id',
      'professional_share_grants.id|UNCONSTRAINED_IDENTIFIER|professional_share_access_audits|grant_id',
      'users.id|DIRECT_FK|community_rules_acceptances|user_id',
      'users.id|DIRECT_FK|professional_share_grants|owner_user_id',
      'users.id|DIRECT_FK|world_owned_items|owner_id',
      'users.id|DIRECT_FK|world_progression_events|owner_id',
      'users.id|DIRECT_FK|world_resource_spends|owner_id',
    ],
  );
  for (const row of semantics.productPrivacyDecisionsApproved) {
    assert.equal(row.promotionAuthorized, true);
    assert.equal(row.executionStatus, 'IMPLEMENTED');
  }
});

test('D1-D5 identity foreign keys detach rather than block account-root deletion', async () => {
  const [behavioral, community, migration, topology, matrix] = await Promise.all([
    source('backend/db/schema/behavioral-assessments.ts'),
    source('backend/db/schema/community.ts'),
    source('backend/db/migrations/0006_privacy_detachable_provenance.sql'),
    source('config/privacy/account-erasure-topology.json'),
    source('config/privacy/erasure-disposition-matrix.json'),
  ]);

  assert.match(behavioral, /respondentUserId: uuid\('respondent_user_id'\)\.references\(\(\) => users\.id, \{ onDelete: 'set null' \}\)/);
  assert.match(community, /createdBy: uuid\('created_by'\)\.references\(\(\) => users\.id, \{ onDelete: 'set null' \}\)/);
  assert.match(community, /reporterUserId: uuid\('reporter_user_id'\)\.references\(\(\) => users\.id, \{ onDelete: 'set null' \}\)/);
  // D5 (#594): the reported person in World reports detaches like the reporter.
  assert.match(community, /subjectUserId: uuid\('subject_user_id'\)\.references\(\(\) => users\.id, \{ onDelete: 'set null' \}\)/);
  assert.match(await source('backend/db/migrations/0031_world_report_intake.sql'), /FOREIGN KEY \(subject_user_id\) REFERENCES users\(id\) ON DELETE SET NULL/);
  assert.match(migration, /behavioral_assessments[\s\S]*ON DELETE SET NULL/);
  assert.match(migration, /communities[\s\S]*ON DELETE SET NULL/);
  assert.match(migration, /community_events[\s\S]*ON DELETE SET NULL/);
  assert.match(migration, /community_reports[\s\S]*ON DELETE SET NULL/);
  assert.doesNotMatch(migration, /ALTER TABLE "community_rules_acceptances"/);
  assert.doesNotMatch(migration, /ALTER TABLE "research_data_consents"/);
  assert.doesNotMatch(migration, /ALTER TABLE "subscriptions"/);

  const approvedKeys = new Set([
    'behavioral_assessments.respondent_user_id',
    'communities.created_by',
    'community_events.created_by',
    'community_reports.reporter_user_id',
    'community_reports.subject_user_id',
  ]);
  const topologyJson = JSON.parse(topology);
  const matrixJson = JSON.parse(matrix);

  for (const row of topologyJson.directUserReferences) {
    const key = `${row.table}.${row.column}`;
    if (!approvedKeys.has(key)) continue;
    assert.equal(row.databaseDeleteAction, 'SET_NULL');
    assert.equal(row.erasureDisposition, 'DETACH');
  }

  for (const row of matrixJson.entries.filter((row) => row.subjectRoot === 'users.id')) {
    const key = `${row.table}.${row.column}`;
    if (!approvedKeys.has(key)) continue;
    assert.equal(row.disposition, 'DETACH');
    assert.equal(row.executionStatus, 'IMPLEMENTED');
  }
});
