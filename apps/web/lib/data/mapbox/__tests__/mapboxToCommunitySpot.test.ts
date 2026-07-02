import assert from 'node:assert/strict';
import test from 'node:test';
import type { MapPlace } from '../mapbox.schema';
import { mapPlaceToCommunitySpot, mapPlacesToCommunitySpots, mergeCommunitySpots } from '../mapboxToCommunitySpot';
import { MOCK_MAP_PLACES } from '../mockMapEntities';

test('MapPlace adapter keeps public and opt-in places but excludes private owner-only places', () => {
  const privatePlace: MapPlace = {
    ...MOCK_MAP_PLACES[0]!,
    id: 'private-owner-place',
    privacy_level: 'private_owner_only',
  };

  const spots = mapPlacesToCommunitySpots([...MOCK_MAP_PLACES, privatePlace]);

  assert.ok(spots.length > 0);
  assert.ok(!spots.some((spot) => spot.id === 'data-private-owner-place'));
  assert.ok(spots.some((spot) => spot.description.includes('contribution communautaire opt-in')));
});

test('MapPlace adapter exposes only map-safe community spot fields', () => {
  const spot = mapPlaceToCommunitySpot(MOCK_MAP_PLACES[1]!);

  assert.ok(spot);
  assert.equal(spot.id, `data-${MOCK_MAP_PLACES[1]!.id}`);
  assert.equal(spot?.authorName, undefined);
  assert.equal(spot?.comments.length, 0);
  assert.ok(!('dog_id' in spot!));
  assert.ok(!('owner_id' in spot!));
  assert.ok(!('eli' in spot!));
});

test('mergeCommunitySpots deduplicates by id and keeps latest adapter entry', () => {
  const base = mapPlacesToCommunitySpots([MOCK_MAP_PLACES[0]!]);
  const changed = { ...base[0]!, description: 'Updated public map description.' };

  const merged = mergeCommunitySpots(base, [changed]);

  assert.equal(merged.length, 1);
  assert.equal(merged[0]!.description, changed.description);
});
