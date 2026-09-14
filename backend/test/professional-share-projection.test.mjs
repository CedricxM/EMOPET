import test from 'node:test';
import assert from 'node:assert/strict';

test('professional share projection publishes only fields mapped to authorized scopes', async () => {
  const {
    ProfessionalShareProjectionUnavailableError,
    projectProfessionalShareSnapshot,
  } = await import('../dist/api/services/professional-share-projection.js');

  const privateOwnerNote = 'PRIVATE_OWNER_NOTE_MUST_NOT_ESCAPE';
  const hiddenRawSensorPayload = 'RAW_SENSOR_MUST_NOT_ESCAPE';
  const snapshot = {
    dogId: 'dog-1',
    dogName: 'Nala',
    days: 7,
    generatedAt: new Date('2026-09-07T12:00:00.000Z'),
    coverage: { validDays: 6, totalDays: 7, coverageRatio: 0.86 },
    trends: [{ label: 'Activite', value: '4 km', coverage: 'stable' }],
    ownerNotes: [privateOwnerNote],
    hiddenRawSensorPayload,
  };

  const summary = projectProfessionalShareSnapshot(
    { dogId: 'dog-1', scopes: ['VETERINARY_SUMMARY'] },
    snapshot,
  );
  assert.deepEqual(summary, {
    veterinarySummary: {
      dogId: 'dog-1',
      dogName: 'Nala',
      days: 7,
      generatedAt: '2026-09-07T12:00:00.000Z',
    },
  });
  assert.equal(JSON.stringify(summary).includes(privateOwnerNote), false);
  assert.equal(JSON.stringify(summary).includes(hiddenRawSensorPayload), false);
  assert.equal('qualifiedLongitudinalObservations' in summary, false);
  assert.equal('dataCoverageAndConfidence' in summary, false);

  const combined = projectProfessionalShareSnapshot(
    {
      dogId: 'dog-1',
      scopes: ['QUALIFIED_LONGITUDINAL_OBSERVATIONS', 'DATA_COVERAGE_AND_CONFIDENCE'],
    },
    snapshot,
  );
  assert.deepEqual(combined, {
    qualifiedLongitudinalObservations: {
      trends: [{ label: 'Activite', value: '4 km', coverage: 'stable' }],
    },
    dataCoverageAndConfidence: {
      validDays: 6,
      totalDays: 7,
      coverageRatio: 0.86,
    },
  });
  assert.equal(JSON.stringify(combined).includes(privateOwnerNote), false);
  assert.equal(JSON.stringify(combined).includes(hiddenRawSensorPayload), false);

  for (const scope of ['OWNER_SELECTED_NOTES', 'DECLARED_CONTEXT']) {
    assert.throws(
      () => projectProfessionalShareSnapshot({ dogId: 'dog-1', scopes: [scope] }, snapshot),
      (error) => error instanceof ProfessionalShareProjectionUnavailableError &&
        error.scope === scope && error.reason === 'SCOPE_POLICY_NOT_READY',
    );
  }

  assert.throws(
    () => projectProfessionalShareSnapshot(
      { dogId: 'different-dog', scopes: ['VETERINARY_SUMMARY'] },
      snapshot,
    ),
    (error) => error instanceof ProfessionalShareProjectionUnavailableError &&
      error.scope === null && error.reason === 'DOG_SCOPE_MISMATCH',
  );
});
