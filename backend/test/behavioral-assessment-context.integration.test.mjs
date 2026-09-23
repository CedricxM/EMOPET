import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';

const integrationEnabled = process.env.EMOPET_DB_INTEGRATION_TEST === '1';

test('BEHAV-DATA-01 preserves response applicability and assessment-time household context', { skip: !integrationEnabled }, async () => {
  const [
    { db },
    {
      behavioralAssessments,
      behavioralResponses,
      dogs,
      users,
    },
  ] = await Promise.all([
    import('../dist/db/index.js'),
    import('../dist/db/schema/index.js'),
  ]);

  const userId = randomUUID();
  const dogId = randomUUID();
  const assessmentId = randomUUID();
  const suffix = randomUUID();

  await db.insert(users).values({
    id: userId,
    email: 'behav-context-' + suffix + '@example.test',
    passwordHash: 'integration-test-only',
    name: 'Behaviour Context Owner',
  });

  await db.insert(dogs).values({
    id: dogId,
    ownerId: userId,
    name: 'Rio',
    breed: 'Mixed',
    birthDate: '2022-05-10',
    sex: 'male',
    weight: 21.5,
    furClass: 'FC2',
  });

  try {
    await db.insert(behavioralAssessments).values({
      id: assessmentId,
      dogId,
      respondentUserId: userId,
      respondentRole: 'owner',
      instrumentCode: 'TEST_BEHAV',
      instrumentVersion: 'test-v1',
      administrationMode: 'research',
      scientificUseStatus: 'research_only',
      householdDogCount: 2,
      householdContextVersion: 'household-context-v1',
      householdContextCapturedAt: new Date('2026-09-23T18:00:00.000Z'),
      householdContext: {
        multiDogHousehold: true,
        cohabitationContext: 'fixture-only',
        provenance: 'integration-test',
      },
    });

    const validResponses = [
      { itemKey: 'answered-zero', responseStatus: 'answered', responseValue: 0 },
      { itemKey: 'not-applicable', responseStatus: 'not_applicable', responseValue: null },
      { itemKey: 'not-observed', responseStatus: 'not_observed', responseValue: null },
      { itemKey: 'skipped', responseStatus: 'skipped', responseValue: null },
      { itemKey: 'missing', responseStatus: 'missing', responseValue: null },
    ];

    for (const response of validResponses) {
      await db.insert(behavioralResponses).values({
        assessmentId,
        itemKey: response.itemKey,
        responseStatus: response.responseStatus,
        responseValue: response.responseValue,
        scaleMin: 0,
        scaleMax: 4,
      });
    }

    const rows = await db
      .select()
      .from(behavioralResponses)
      .where(eq(behavioralResponses.assessmentId, assessmentId));

    const byKey = new Map(rows.map((row) => [row.itemKey, row]));
    assert.equal(byKey.get('answered-zero')?.responseValue, 0);
    assert.equal(byKey.get('answered-zero')?.responseStatus, 'answered');

    for (const key of ['not-applicable', 'not-observed', 'skipped', 'missing']) {
      assert.equal(byKey.get(key)?.responseValue, null, key + ' must remain NULL-valued');
    }

    assert.deepEqual(
      ['answered-zero', 'not-applicable', 'not-observed', 'skipped', 'missing']
        .map((key) => byKey.get(key)?.responseStatus),
      ['answered', 'not_applicable', 'not_observed', 'skipped', 'missing'],
    );

    await assert.rejects(
      db.insert(behavioralResponses).values({
        assessmentId,
        itemKey: 'invalid-not-observed-zero',
        responseStatus: 'not_observed',
        responseValue: 0,
        scaleMin: 0,
        scaleMax: 4,
      }),
    );

    await assert.rejects(
      db.insert(behavioralAssessments).values({
        id: randomUUID(),
        dogId,
        respondentUserId: userId,
        instrumentCode: 'TEST_BEHAV',
        householdDogCount: 0,
      }),
    );

    const [assessment] = await db
      .select()
      .from(behavioralAssessments)
      .where(eq(behavioralAssessments.id, assessmentId));

    assert.equal(assessment.householdDogCount, 2);
    assert.equal(assessment.householdContextVersion, 'household-context-v1');
    assert.equal(assessment.householdContext.multiDogHousehold, true);
    assert.equal(assessment.householdContext.cohabitationContext, 'fixture-only');
    assert.equal(
      assessment.householdContextCapturedAt?.toISOString(),
      '2026-09-23T18:00:00.000Z',
    );
  } finally {
    await db.delete(behavioralAssessments).where(eq(behavioralAssessments.id, assessmentId));
    await db.delete(dogs).where(eq(dogs.id, dogId));
    await db.delete(users).where(eq(users.id, userId));
  }
});
