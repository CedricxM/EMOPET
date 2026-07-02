import type { MapPlaceCategory } from './mapbox.schema';

export const EMOPET_MAP_COLORS = {
  navy: '#1D1A6A',
  orange: '#FE502D',
  teal: '#2CB7AB',
  cream: '#F6EFE7',
  gray: '#6B6F76',
} as const;

export const MAP_LAYER_COLORS: Record<MapPlaceCategory, string> = {
  professional_canine_actor: EMOPET_MAP_COLORS.navy,
  community_place: EMOPET_MAP_COLORS.orange,
  walking_area: EMOPET_MAP_COLORS.teal,
  calm_zone: EMOPET_MAP_COLORS.teal,
  pilot_scoring: EMOPET_MAP_COLORS.navy,
  heritage_local_identity: EMOPET_MAP_COLORS.orange,
};

export const MAP_LAYER_LABELS: Record<MapPlaceCategory, string> = {
  professional_canine_actor: 'Professional canine actors',
  community_place: 'Community places',
  walking_area: 'Walking routes',
  calm_zone: 'Quiet walking spots',
  pilot_scoring: 'Pilot territory scoring',
  heritage_local_identity: 'Heritage and local identity',
};
