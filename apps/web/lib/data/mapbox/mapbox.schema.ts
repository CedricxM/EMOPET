export type MapPlaceType =
  | 'pilot_territory'
  | 'dog_friendly_place'
  | 'calm_walking_spot'
  | 'veterinarian'
  | 'dog_trainer'
  | 'groomer'
  | 'shelter'
  | 'dog_club'
  | 'community_contribution'
  | 'emopet_discovery_point';

export type MapPlaceCategory =
  | 'professional_canine_actor'
  | 'community_place'
  | 'walking_area'
  | 'calm_zone'
  | 'pilot_scoring'
  | 'heritage_local_identity';

export type VerifiedStatus = 'verified' | 'pending_review' | 'community_unverified' | 'source_imported';
export type PrivacyLevel = 'public' | 'community_opt_in' | 'private_owner_only';
export type RouteType = 'coastal_walk' | 'urban_loop' | 'forest_path' | 'village_path' | 'garden_route';
export type DifficultyLevel = 'easy' | 'moderate' | 'long';

export interface GeoJsonLineString {
  type: 'LineString';
  coordinates: Array<[number, number]>;
}

export interface MapPlace {
  id: string;
  name: string;
  type: MapPlaceType;
  category: MapPlaceCategory;
  latitude: number;
  longitude: number;
  address: string | null;
  commune: string;
  department: string;
  region: string;
  source_name: string;
  source_url: string | null;
  verified_status: VerifiedStatus;
  user_contributed: boolean;
  created_at: string;
  updated_at: string;
  privacy_level: PrivacyLevel;
}

export interface MapRoute {
  id: string;
  name: string;
  route_type: RouteType;
  geometry: GeoJsonLineString;
  distance_km: number;
  commune: string;
  department: string;
  region: string;
  difficulty_level: DifficultyLevel;
  calm_score_optional: number | null;
  dog_friendly_notes: string;
  source_name: string;
  user_contributed: boolean;
  privacy_level: PrivacyLevel;
}

export interface TerritoryMapScore {
  code_insee: string;
  commune: string;
  department: string;
  region: string;
  launch_score: number;
  canine_ecosystem_score: number;
  community_potential_score: number;
  tourism_score: number;
  heritage_score: number;
  mapbox_geometry_id_optional: string | null;
}

export interface MapMarkerDescriptor {
  id: string;
  label: string;
  longitude: number;
  latitude: number;
  color: string;
  layer: MapPlaceCategory;
  popup_title: string;
  popup_detail: string;
  privacy_level: PrivacyLevel;
}

export function validateMapPlace(place: MapPlace): string[] {
  const errors: string[] = [];
  if (!place.id.trim()) errors.push('id is required');
  if (!place.name.trim()) errors.push('name is required');
  if (place.latitude < -90 || place.latitude > 90) errors.push('latitude out of range');
  if (place.longitude < -180 || place.longitude > 180) errors.push('longitude out of range');
  if (place.privacy_level === 'public' && place.type === 'community_contribution' && !place.user_contributed) {
    errors.push('community_contribution must be marked as user_contributed or use a non-public privacy level');
  }
  return errors;
}

export function validateMapRoute(route: MapRoute): string[] {
  const errors: string[] = [];
  if (!route.id.trim()) errors.push('id is required');
  if (!route.name.trim()) errors.push('name is required');
  if (route.geometry.coordinates.length < 2) errors.push('route geometry needs at least two points');
  if (route.distance_km <= 0) errors.push('distance_km must be positive');
  if (route.calm_score_optional != null && (route.calm_score_optional < 0 || route.calm_score_optional > 100)) {
    errors.push('calm_score_optional must be between 0 and 100');
  }
  return errors;
}
