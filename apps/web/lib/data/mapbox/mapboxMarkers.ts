import type { MapMarkerDescriptor, MapPlace } from './mapbox.schema';
import { MAP_LAYER_COLORS, MAP_LAYER_LABELS } from './mapboxStyles';

export function mapPlaceToMarkerDescriptor(place: MapPlace): MapMarkerDescriptor {
  return {
    id: place.id,
    label: `${place.name}, ${MAP_LAYER_LABELS[place.category]}`,
    longitude: place.longitude,
    latitude: place.latitude,
    color: MAP_LAYER_COLORS[place.category],
    layer: place.category,
    popup_title: place.name,
    popup_detail: `${place.commune} · ${place.source_name}`,
    privacy_level: place.privacy_level,
  };
}

export function filterPublicOrOptInMarkers(places: MapPlace[], includeOptIn: boolean): MapMarkerDescriptor[] {
  return places
    .filter((place) => place.privacy_level === 'public' || (includeOptIn && place.privacy_level === 'community_opt_in'))
    .map(mapPlaceToMarkerDescriptor);
}
