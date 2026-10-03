import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildRegionalPackEvidenceReport } from '../regional-pack-evidence';
import { BRETAGNE_REGIONAL_PACK } from '../profiles/bretagne-pack';

const NOW = Date.parse('2026-10-01T12:00:00Z');

test('Bretagne evidence report exposes identity blockers without creating authority', () => {
  const report = buildRegionalPackEvidenceReport(BRETAGNE_REGIONAL_PACK, NOW);

  assert.equal(report.packId, 'regional-pack-bretagne-v1');
  assert.equal(report.regionId, 'bretagne');
  assert.equal(report.releaseReady, false);
  assert.equal(report.verifiedRegionalTermCount, 0);

  assert.equal(report.identity.assistantName, 'Breiz');
  assert.equal(report.identity.reviewStatus, 'PENDING_REVIEW');
  assert.equal(report.identity.releaseReady, false);
  assert.equal(report.identity.reviewedAt, null);
  assert.equal(report.identity.reviewerRole, null);
  assert.equal(report.identity.reviewerReferencePresent, false);
  assert.equal(report.identity.reviewReceiptPresent, false);

  assert.ok(report.releaseBlockers.includes('PROFILE_NOT_PRODUCTION_READY'));
  assert.ok(report.releaseBlockers.includes('IDENTITY_NOT_REVIEWED'));
  assert.ok(report.releaseBlockers.includes('NO_VERIFIED_REGIONAL_LEXICON'));
});

test('canine network is visible as UNBOUND rather than silently omitted', () => {
  const report = buildRegionalPackEvidenceReport(BRETAGNE_REGIONAL_PACK, NOW);
  const canine = report.domains.find((domain) => domain.domain === 'canine_network');

  assert.ok(canine);
  assert.equal(canine.required, true);
  assert.equal(canine.status, 'UNBOUND');
  assert.deepEqual(canine.candidateSourceIds, []);
  assert.deepEqual(canine.releaseReadySourceIds, []);
});

test('events and culture expose blocked candidates instead of pretending readiness', () => {
  const report = buildRegionalPackEvidenceReport(BRETAGNE_REGIONAL_PACK, NOW);

  const events = report.domains.find((domain) => domain.domain === 'events');
  const culture = report.domains.find((domain) => domain.domain === 'culture');

  assert.ok(events);
  assert.equal(events.status, 'BLOCKED');
  assert.ok(events.candidateSourceIds.includes('datatourisme'));
  assert.deepEqual(events.releaseReadySourceIds, []);

  assert.ok(culture);
  assert.equal(culture.status, 'BLOCKED');
  assert.ok(culture.candidateSourceIds.includes('bcd-becedia'));
  assert.deepEqual(culture.releaseReadySourceIds, []);
});

test('source evidence report preserves rights blockers and evidence state', () => {
  const report = buildRegionalPackEvidenceReport(BRETAGNE_REGIONAL_PACK, NOW);

  const datatourisme = report.sources.find(
    (source) => source.sourceId === 'datatourisme',
  );

  assert.ok(datatourisme);
  assert.equal(datatourisme.sourceKnown, true);
  assert.equal(datatourisme.ingestionPermitted, false);
  assert.equal(datatourisme.releaseReady, false);
  assert.ok(datatourisme.rightsBlockers.includes('SOURCE_DISABLED'));
  assert.ok(datatourisme.rightsBlockers.includes('NO_RIGHTS_EVIDENCE'));
  assert.equal(datatourisme.evidenceState, null);
  assert.equal(datatourisme.disposition, null);
});

test('report does not inflate candidates into partnership or approval state', () => {
  const report = buildRegionalPackEvidenceReport(BRETAGNE_REGIONAL_PACK, NOW);
  const serialized = JSON.stringify(report).toLowerCase();

  assert.doesNotMatch(serialized, /"partner":true/);
  assert.doesNotMatch(serialized, /"partnership":/);
  assert.doesNotMatch(serialized, /"approved":true/);
});


test('territorial evidence explains dataset scope instead of treating the portal as one blanket licence', () => {
  const report = buildRegionalPackEvidenceReport(BRETAGNE_REGIONAL_PACK, NOW);
  const regionOpenData = report.sources.find(
    (source) => source.sourceId === 'region-bretagne-open-data',
  );

  assert.ok(regionOpenData);
  assert.equal(regionOpenData.readinessKind, 'BRETAGNE_OPEN_DATA_DATASETS');
  assert.deepEqual(regionOpenData.scopedResourceIds, [
    'reserves-naturelles-regionales-de-bretagne',
  ]);
  assert.deepEqual(regionOpenData.readyScopedResourceIds, []);
  assert.equal(regionOpenData.releaseReady, false);

  assert.ok(regionOpenData.rightsBlockers.includes('NO_LICENCE_RECEIPT'));
  assert.ok(
    regionOpenData.effectiveBlockers.includes(
      'DATASET_BLOCKER:reserves-naturelles-regionales-de-bretagne:DATASET_NOT_RELEASE_READY',
    ),
  );
  assert.equal(
    regionOpenData.effectiveBlockers.includes(
      'SOURCE_BLOCKER:NO_LICENCE_RECEIPT',
    ),
    false,
  );
});
