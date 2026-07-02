'use client';

/**
 * Wrapper de carte (Réalité R1).
 * - Si NEXT_PUBLIC_MAPBOX_TOKEN est défini → carte Mapbox réelle + POI OSM.
 * - Sinon → repli sur la carte SVG stylisée (BretagneMap), projection maison.
 *
 * Les données entrent toujours en (lon, lat) ; la projection vers le repère
 * SVG est faite ici pour le fallback.
 */

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
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
  /** Interactions propres à la carte SVG (villes / phares / événement démo). */
  svg?: {
    onCityClick?: (id: CityId) => void;
    onLighthouseClick?: (id: LighthouseId) => void;
    onLegacyEventClick?: () => void;
  };
}

const HAS_MAPBOX = !!process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export function CommunityMap({ spots, events, selectedSpotId, onSpotClick, onEventClick, svg }: CommunityMapProps) {
  const spotMarkers = useMemo<SpotMarker[]>(
    () => spots.map((s) => {
      const { x, y } = lonLatToXY(s.lon, s.lat);
      return { id: s.id, x, y, color: categoryMeta(s.category).color, label: `${s.name}, catégorie ${categoryMeta(s.category).label}` };
    }),
    [spots],
  );

  const eventMarkers = useMemo<SpotMarker[]>(
    () => events.map((e) => {
      const { x, y } = lonLatToXY(e.lon, e.lat);
      return { id: e.id, x, y, color: 'var(--terracotta-600)', label: `Événement : ${e.title}` };
    }),
    [events],
  );

  if (HAS_MAPBOX) {
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
