import type { CommunitySpot, SpotCategory } from '../../../components/bretagne-map/spots';
import type { MapPlace, MapPlaceType, PrivacyLevel, VerifiedStatus } from './mapbox.schema';

const CATEGORY_BY_TYPE: Record<MapPlaceType, SpotCategory> = {
  pilot_territory: 'parc',
  dog_friendly_place: 'parc',
  calm_walking_spot: 'foret',
  veterinarian: 'veterinaire',
  dog_trainer: 'comportementaliste',
  groomer: 'magasin',
  shelter: 'pension',
  dog_club: 'comportementaliste',
  community_contribution: 'parc',
  emopet_discovery_point: 'foret',
};

const STATUS_LABELS: Record<VerifiedStatus, string> = {
  verified: 'verifie',
  pending_review: 'verification en attente',
  community_unverified: 'contribution non verifiee',
  source_imported: 'source importee',
};

const PRIVACY_LABELS: Record<PrivacyLevel, string> = {
  public: 'donnee publique',
  community_opt_in: 'contribution communautaire opt-in',
  private_owner_only: 'donnee privee non publiee',
};

export function mapPlaceToCommunitySpot(place: MapPlace): CommunitySpot | null {
  if (place.privacy_level === 'private_owner_only') return null;

  return {
    id: `data-${place.id}`,
    category: CATEGORY_BY_TYPE[place.type],
    name: place.name,
    description: [
      `${place.commune} - ${STATUS_LABELS[place.verified_status]}.`,
      `Source: ${place.source_name}.`,
      `Confidentialite: ${PRIVACY_LABELS[place.privacy_level]}.`,
    ].join(' '),
    lon: place.longitude,
    lat: place.latitude,
    isAnonymous: place.user_contributed,
    authorName: undefined,
    visitCount: 0,
    averageRating: null,
    comments: [],
    createdAt: place.created_at,
  };
}

export function mapPlacesToCommunitySpots(places: MapPlace[]): CommunitySpot[] {
  return places
    .map(mapPlaceToCommunitySpot)
    .filter((spot): spot is CommunitySpot => spot !== null);
}

export function mergeCommunitySpots(base: CommunitySpot[], additions: CommunitySpot[]): CommunitySpot[] {
  const byId = new Map<string, CommunitySpot>();
  for (const spot of base) byId.set(spot.id, spot);
  for (const spot of additions) byId.set(spot.id, spot);
  return [...byId.values()];
}
