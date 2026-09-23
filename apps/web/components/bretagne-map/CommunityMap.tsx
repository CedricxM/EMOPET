'use client';

/**
 * Controlled map wrapper.
 *
 * Mapbox is available only when the public browser token, exact runtime GO gate
 * and separately reviewed repository authority all agree. Token presence alone
 * never selects the external renderer.
 */

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { getControlledMapboxToken } from '../../lib/mapbox-rights';
import { BretagneMap } from './Map';
import type { SpotMarker } from './Map';
import type { MapboxEvent } from './MapboxMap';
import { categoryMeta, lonLatToXY } from './spots';
import type { CommunitySpot } from './spots';
import type { CityId, LighthouseId } from './data';

const MapboxMap = dynamic(() => import('./MapboxMap').then((m) => m.MapboxMap), { ssr: false });

export interface CommunityMapProps {
  spots: CommunitySpot[];
  events: MapboxEvent[];
  selectedSpotId?: string | null;
  onSpotClick?: (id: string) => void;
  onEventClick?: (id: string) => void;
  svg?: {
    onCityClick?: (id: CityId) => void;
    onLighthouseClick?: (id: LighthouseId) => void;
    onLegacyEventClick?: () => void;
  };
}

const HAS_CONTROLLED_MAPBOX = getControlledMapboxToken() !== null;

export function CommunityMap({ spots, events, selectedSpotId, onSpotClick, onEventClick, svg }: CommunityMapProps) {
  const spotMarkers = useMemo<SpotMarker[]>(
    () => spots.map((s) => {
      const { x, y } = lonLatToXY(s.lon, s.lat);
      return {
        id: s.id,
        x,
        y,
        color: categoryMeta(s.category).color,
        label: s.name + ', catégorie ' + categoryMeta(s.category).label,
      };
    }),
    [spots],
  );

  const eventMarkers = useMemo<SpotMarker[]>(
    () => events.map((e) => {
      const { x, y } = lonLatToXY(e.lon, e.lat);
      return { id: e.id, x, y, color: 'var(--terracotta-600)', label: 'Événement : ' + e.title };
    }),
    [events],
  );

  if (HAS_CONTROLLED_MAPBOX) {
    return <MapboxMap spots={spots} events={events} selectedSpotId={selectedSpotId} onSpotClick={onSpotClick} onEventClick={onEventClick} />;
  }

  return (
    <BretagneMap
      onCityClick={svg?.onCityClick}
      onLighthouseClick={svg?.onLighthouseClick}
      onEventClick={svg?.onLegacyEventClick}
      spots={spotMarkers}
      selectedSpotId={selectedSpotId}
      onSpotClick={onSpotClick}
      eventMarkers={eventMarkers}
      onEventMarkerClick={onEventClick}
    />
  );
}
