import assert from 'node:assert/strict';
import test from 'node:test';
import { filterPublicOrOptInMarkers, mapPlaceToMarkerDescriptor } from '../mapboxMarkers';
import { validateMapPlace, validateMapRoute } from '../mapbox.schema';
import { EMOPET_MAP_COLORS, MAP_LAYER_COLORS } from '../mapboxStyles';
import { MOCK_MAP_PLACES, MOCK_MAP_ROUTES } from '../mockMapEntities';

test('Mapbox mock markers hide opt-in places unless explicitly included', () => {
  const publicOnly = filterPublicOrOptInMarkers(MOCK_MAP_PLACES, false);
  assert.ok(publicOnly.length > 0);
  assert.ok(publicOnly.every((marker) => marker.privacy_level === 'public'));

  const withOptIn = filterPublicOrOptInMarkers(MOCK_MAP_PLACES, true);
  assert.ok(withOptIn.length > publicOnly.length);
  assert.ok(withOptIn.some((marker) => marker.privacy_level === 'community_opt_in'));
});

test('Mapbox schemas reject malformed coordinates and contribution privacy inconsistencies', () => {
  const invalidPlace = {
    ...MOCK_MAP_PLACES[0]!,
    id: 'invalid-community-place',
    type: 'community_contribution' as const,
    user_contributed: false,
    privacy_level: 'public' as const,
    latitude: 120,
  };
  const errors = validateMapPlace(invalidPlace);
  assert.ok(errors.includes('latitude out of range'));
  assert.ok(errors.some((error) => error.includes('community_contribution')));

  const invalidRoute = {
    ...MOCK_MAP_ROUTES[0]!,
    distance_km: 0,
    geometry: { type: 'LineString' as const, coordinates: [[-3.37, 47.74] as [number, number]] },
  };
  assert.ok(validateMapRoute(invalidRoute).includes('route geometry needs at least two points'));
  assert.ok(validateMapRoute(invalidRoute).includes('distance_km must be positive'));
});

test('Mapbox marker descriptors use EMOPET layer colors and no private animal data fields', () => {
  const marker = mapPlaceToMarkerDescriptor(MOCK_MAP_PLACES[0]!);
  assert.equal(marker.color, MAP_LAYER_COLORS[MOCK_MAP_PLACES[0]!.category]);
  assert.equal(EMOPET_MAP_COLORS.navy, '#1D1A6A');
  assert.equal(EMOPET_MAP_COLORS.orange, '#FE502D');
  assert.equal(EMOPET_MAP_COLORS.teal, '#2CB7AB');
  assert.ok(!('dog_id' in marker));
  assert.ok(!('eli' in marker));
  assert.ok(!('owner_email' in marker));
  assert.ok(!('user_id' in marker));
  assert.ok(!('source_url' in marker));
});
