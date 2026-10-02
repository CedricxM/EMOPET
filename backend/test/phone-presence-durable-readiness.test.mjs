import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const readRepo = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
const contract = JSON.parse(
  await readRepo('config/presence/phone-presence-durable-readiness-v1.json'),
);

test('current Product V1 Presence routes remain fail-closed and cannot reach the volatile Map', async () => {
  const route = await readRepo('backend/api/routes/sensors.ts');

  assert.match(route, /PRESENCE_PERSISTENCE_NOT_READY/);
  assert.match(route, /presencePersistenceUnavailable\(c, 'create_presence_event'\)/);
  assert.match(route, /presencePersistenceUnavailable\(c, 'list_presence_events'\)/);
  assert.doesNotMatch(route, /appendPresenceEvents/);
  assert.doesNotMatch(route, /getPresenceEventsForDog/);

  assert.equal(
    contract.currentRouteAuthority.volatileProcessStoreIsProductAuthority,
    false,
  );
  assert.equal(contract.claims.runtimeRouteActivated, false);
});

test('the current public request shape is not silently promoted to a durable ingestion contract', async () => {
  const validators = await readRepo('packages/shared/src/validators/index.ts');
  const start = validators.indexOf('export const PresenceEventCreateSchema');
  assert.notEqual(start, -1, 'PresenceEventCreateSchema must exist');
  const end = validators.indexOf('\n});', start);
  assert.notEqual(end, -1, 'PresenceEventCreateSchema block must terminate');
  const block = validators.slice(start, end + 4);

  for (const field of ['dogId', 'phoneSeen', 'timestamp', 'rssi', 'source']) {
    assert.match(block, new RegExp(`\\b${field}\\b`), `missing current field ${field}`);
  }

  for (const durableOnly of ['idempotencyKey', 'eventId', 'sourceInstanceRef']) {
    assert.doesNotMatch(
      block,
      new RegExp(`\\b${durableOnly}\\b`),
      `${durableOnly} must not be inferred as present before an explicit contract change`,
    );
  }

  assert.deepEqual(contract.currentRequestContract.sources, [
    'phone_passive',
    'manual_override',
  ]);
  assert.equal(contract.currentRequestContract.durableIdempotencyKeyPresent, false);
  assert.equal(contract.identityAndReplay.idempotencyKey, 'CALLER_REQUIRED_BEFORE_DURABLE_ROUTE_ACTIVATION');
});

test('phone Presence stays distinct from Community copresence and exact-location authority', () => {
  assert.equal(contract.durableCandidate.proposedRelation, 'phone_presence_events');
  assert.equal(contract.durableCandidate.mustNotReuseRelation, 'copresence_events');
  assert.equal(contract.durableCandidate.exactCoordinatesAllowed, false);
  assert.equal(contract.privacyAndProductGates.backgroundTrackingAuthorized, false);
  assert.deepEqual(
    contract.privacyAndProductGates.mustNotInheritRetentionFrom,
    ['exact_location', 'sensor_preprocessed_detailed'],
  );
});

test('RSSI and retention remain HOLD instead of inheriting a convenient policy by analogy', () => {
  assert.equal(
    contract.durableCandidate.durableRssiDisposition,
    'HOLD_NOT_AUTHORIZED_UNTIL_PURPOSE_AND_LIFECYCLE_REVIEW',
  );
  assert.equal(contract.privacyAndProductGates.retentionCategory, 'TO_CONFIRM');
  assert.equal(contract.timeSemantics.futureTimestampMaximum, 'TO_CONFIRM_DO_NOT_INVENT');
  assert.equal(contract.claims.retentionApproved, false);
  assert.equal(contract.claims.rssiDurablePersistenceApproved, false);
});

test('restart, replay and unavailable-source semantics are explicit before persistence exists', () => {
  assert.equal(
    contract.identityAndReplay.sameKeySameLogicalPayload,
    'RETURN_EXISTING_EVENT_WITHOUT_SECOND_WRITE',
  );
  assert.equal(
    contract.identityAndReplay.sameKeyDifferentLogicalPayload,
    'FAIL_409_CONFLICT',
  );
  assert.equal(contract.identityAndReplay.crossOwnerReuse, 'INDEPENDENT');
  assert.equal(
    contract.timeSemantics.restartSemantics,
    'DURABLE_READ_MAY_RETURN_EMPTY_ONLY_AFTER_SUCCESSFUL_DATABASE_QUERY',
  );
  assert.equal(
    contract.timeSemantics.sourceUnavailable,
    'FAIL_503_NEVER_TRANSLATE_TO_EMPTY_EVIDENCE',
  );
});

test('privacy and publication dependencies remain explicit human/control-plane gates', () => {
  assert.equal(contract.privacyAndProductGates.temporaryProximityAuthorityIssue, 131);
  assert.equal(
    contract.privacyAndProductGates.temporaryProximityPolicy,
    'HUMAN_DECISION_OPEN',
  );
  assert.equal(contract.privacyAndProductGates.subjectDiscoveryRequired, true);
  assert.equal(contract.privacyAndProductGates.dogAndAccountErasureTopologyRequired, true);
  assert.equal(contract.privacyAndProductGates.ownerExportTreatmentRequired, true);
  assert.equal(contract.privacyAndProductGates.absenceComparisonIssue, 133);
  assert.equal(
    contract.privacyAndProductGates.absenceComparisonPublicationAuthorized,
    false,
  );

  for (const value of Object.values(contract.claims)) {
    assert.equal(value, false);
  }
});

test('no migration has been reserved or created for the candidate relation', async () => {
  assert.equal(contract.durableCandidate.migrationReserved, false);
  assert.equal(contract.claims.durablePersistenceImplemented, false);

  const migrationsUrl = new URL('../../backend/db/migrations/', import.meta.url);
  const files = (await readdir(migrationsUrl)).filter((name) => name.endsWith('.sql'));
  for (const file of files) {
    const sql = await readRepo(`backend/db/migrations/${file}`);
    assert.doesNotMatch(
      sql,
      /phone_presence_events/i,
      `${file} unexpectedly activates phone Presence persistence`,
    );
  }
});
