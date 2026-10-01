import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [registry, auditSource, detectorSource] = await Promise.all([
  readFile(
    new URL('../../config/security/security-detection-coverage-v1.json', import.meta.url),
    'utf8',
  ).then(JSON.parse),
  readFile(new URL('../../backend/api/security/security-audit-event.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../backend/api/security/security-anomaly-detection.ts', import.meta.url), 'utf8'),
]);

function quotedValues(source) {
  return [...source.matchAll(/['"]([^'"]+)['"]/g)].map((match) => match[1]);
}

function canonicalEventTypes() {
  const match = auditSource.match(
    /SECURITY_AUDIT_EVENT_TYPES\s*=\s*\[([\s\S]*?)\]\s*as const/,
  );
  assert.ok(match, 'canonical SECURITY_AUDIT_EVENT_TYPES authority not found');
  return quotedValues(match[1]).sort();
}

function registryRows() {
  assert.equal(registry.schemaVersion, 'security-detection-coverage-v1');
  assert.equal(registry.sourceSchema, 'security-audit-v1');
  assert.equal(registry.parentIssue, 525);
  assert.ok(Array.isArray(registry.eventCoverage));
  return registry.eventCoverage;
}

test('coverage registry enumerates every canonical security-audit event type exactly once', () => {
  const rows = registryRows();
  const types = rows.map((row) => row.eventType);

  assert.equal(new Set(types).size, types.length, 'duplicate event coverage row');
  assert.deepEqual([...types].sort(), canonicalEventTypes());

  for (const row of rows) {
    assert.ok(['PARTIAL', 'UNSUPPORTED'].includes(row.coverage));
    assert.ok(Array.isArray(row.detectorTypes));
    assert.ok(Array.isArray(row.coveredConditions));
    assert.ok(Array.isArray(row.knownUnsupported));
    assert.ok(row.knownUnsupported.length > 0);
  }
});

test('declared detector coverage remains anchored to current detector source', () => {
  const rows = registryRows();
  const byType = new Map(rows.map((row) => [row.eventType, row]));

  assert.deepEqual(
    byType.get('privileged_authority_decision').detectorTypes,
    ['repeated_privileged_denials', 'machine_privileged_authority_attempt'],
  );
  assert.match(detectorSource, /event\.eventType !== 'privileged_authority_decision'/);
  assert.match(detectorSource, /type:\s*'repeated_privileged_denials'/);
  assert.match(detectorSource, /type:\s*'machine_privileged_authority_attempt'/);

  assert.deepEqual(
    byType.get('privileged_sensitive_access').detectorTypes,
    ['rapid_multi_target_access'],
  );
  assert.match(detectorSource, /event\.eventType !== 'privileged_sensitive_access'/);
  assert.match(detectorSource, /type:\s*'rapid_multi_target_access'/);

  const incident = byType.get('security_incident_access');
  assert.equal(incident.coverage, 'UNSUPPORTED');
  assert.deepEqual(incident.detectorTypes, []);
  assert.doesNotMatch(detectorSource, /event\.eventType\s*[!=]==?\s*'security_incident_access'/);
});

test('coverage authority cannot be mistaken for production activation', () => {
  assert.match(registry.status, /PRODUCTION_POLICY_UNSELECTED/);
  assert.deepEqual(registry.nonEffects, {
    productionThresholdsSelected: false,
    continuousDeploymentProven: false,
    alertDeliveryAuthorized: false,
    siemProviderSelected: false,
    productionReleaseAuthorized: false,
  });
});
