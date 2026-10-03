import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decideCommunityAuthority,
  mayAutoPublishFromObservation,
  mayUseRelationshipScoreForMatchmaking,
} from '../communityAuthorityGrader';

test('Meet requires explicit purpose-specific consent', () => {
  const denied = decideCommunityAuthority({
    action: 'CREATE_MEET',
    explicitConsent: false,
    purposeMatches: true,
    source: 'OWNER_EXPLICIT',
  });
  assert.deepEqual(denied, { allowed: false, reason: 'CONSENT_REQUIRED' });

  const wrongPurpose = decideCommunityAuthority({
    action: 'CREATE_MEET',
    explicitConsent: true,
    purposeMatches: false,
    source: 'OWNER_EXPLICIT',
  });
  assert.deepEqual(wrongPurpose, { allowed: false, reason: 'PURPOSE_MISMATCH' });

  const allowed = decideCommunityAuthority({
    action: 'CREATE_MEET',
    explicitConsent: true,
    purposeMatches: true,
    source: 'OWNER_EXPLICIT',
  });
  assert.deepEqual(allowed, { allowed: true, reason: 'AUTHORIZED' });
});

test('private Breiz, ELI and device data never become social merely because they exist', () => {
  for (const source of ['ELI', 'MAT_TAG', 'PRIVATE_MEMORY', 'JOURNAL', 'VET', 'RAW_BREIZ'] as const) {
    const decision = decideCommunityAuthority({
      action: 'PUBLISH_COMMUNITY',
      explicitConsent: true,
      purposeMatches: true,
      source,
    });
    assert.equal(decision.allowed, false, source);
    assert.equal(decision.reason, 'PRIVATE_SOURCE_CANNOT_BECOME_SOCIAL', source);
  }
});

test('revocation and blocking invalidate stale authority', () => {
  const revoked = decideCommunityAuthority({
    action: 'CREATE_MEET',
    explicitConsent: true,
    purposeMatches: true,
    authorityRevoked: true,
    source: 'OWNER_EXPLICIT',
  });
  assert.deepEqual(revoked, { allowed: false, reason: 'REVOKED' });

  const blocked = decideCommunityAuthority({
    action: 'DISCLOSE_EXACT_LOCATION',
    explicitConsent: true,
    purposeMatches: true,
    actorBlocked: true,
    source: 'OWNER_EXPLICIT',
    locationPrecision: 'EXACT',
  });
  assert.deepEqual(blocked, { allowed: false, reason: 'BLOCKED' });
});

test('inference alone cannot trigger consequential actions', () => {
  for (const action of ['PUBLISH_COMMUNITY', 'CREATE_MEET', 'DISCLOSE_EXACT_LOCATION', 'CREATE_RELAY', 'DISPATCH_VOICE_CUE'] as const) {
    const decision = decideCommunityAuthority({
      action,
      explicitConsent: true,
      purposeMatches: true,
      inferredOnly: true,
      source: 'OWNER_EXPLICIT',
      locationPrecision: 'EXACT',
    });
    assert.equal(decision.allowed, false, action);
    assert.equal(decision.reason, 'INFERENCE_CANNOT_ACT', action);
  }
});

test('exact location needs explicit exact-location authority', () => {
  const areaOnly = decideCommunityAuthority({
    action: 'DISCLOSE_EXACT_LOCATION',
    explicitConsent: true,
    purposeMatches: true,
    source: 'OWNER_EXPLICIT',
    locationPrecision: 'AREA',
  });
  assert.deepEqual(areaOnly, { allowed: false, reason: 'EXACT_LOCATION_REQUIRES_EXPLICIT_AUTHORITY' });

  const exact = decideCommunityAuthority({
    action: 'DISCLOSE_EXACT_LOCATION',
    explicitConsent: true,
    purposeMatches: true,
    source: 'OWNER_EXPLICIT',
    locationPrecision: 'EXACT',
  });
  assert.deepEqual(exact, { allowed: true, reason: 'AUTHORIZED' });
});

test('observation can never auto-publish and relationship score can never drive matchmaking', () => {
  assert.equal(mayAutoPublishFromObservation(), false);
  assert.equal(mayUseRelationshipScoreForMatchmaking(), false);
});
