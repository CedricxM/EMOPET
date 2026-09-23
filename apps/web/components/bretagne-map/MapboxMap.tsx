'use client';

/**
 * Controlled Mapbox GL implementation.
 *
 * Mapbox and OSM/Overpass are independent external-service authorities.
 * Mapbox initialization requires the reviewed Mapbox authority. OSM POIs are
 * separately gated inside fetchOsmSpots().
 */

import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from 'mapbox-gl';
import { useEffect, useRef, useState } from 'react';
import { getControlledMapboxToken } from '../../lib/mapbox-rights';
import { categoryMeta } from './spots';
import type { CommunitySpot } from './spots';
import { fetchOsmSpots } from '../../lib/osm-spots';
import type { OsmSpot } from '../../lib/osm-spots';
import type { MapSurfaceState } from '../../lib/map/mapSurface';
import { describeMapSurface } from '../../lib/map/mapSurface';

export interface MapboxEvent {
  id: string;
  lon: number;
  lat: number;
  title: string;
}

export interface MapboxMapProps {
  spots: CommunitySpot[];
  events: MapboxEvent[];
  selectedSpotId?: string | null;
  onSpotClick?: (id: string) => void;
  onEventClick?: (id: string) => void;
}

const BRETAGNE_BOUNDS: mapboxgl.LngLatBoundsLike = [
  [-5.6, 46.9],
  [-0.9, 49.1],
];

const OSM_COPYRIGHT_URL = 'https://www.openstreetmap.org/copyright';

function dotEl(color: string, size: number, ring = false): HTMLDivElement {
  const el = document.createElement('div');
  el.style.width = size + 'px';
  el.style.height = size + 'px';
  el.style.borderRadius = '50%';
  el.style.cursor = 'pointer';
  if (ring) {
    el.style.border = '2.5px solid ' + color;
    el.style.background = 'rgba(255,255,255,0.55)';
    el.style.boxShadow = '0 0 0 3px ' + color + '33';
  } else {
    el.style.background = color;
    el.style.border = '2px solid #fff';
    el.style.boxShadow = '0 1px 3px rgba(20,18,58,0.35)';
  }
  return el;
}

function osmPopupEl(spot: OsmSpot, label: string): HTMLDivElement {
  const root = document.createElement('div');
  root.style.fontFamily = 'var(--font-sans)';
  root.style.fontSize = '12px';

  const title = document.createElement('strong');
  title.textContent = spot.name;
  root.appendChild(title);
  root.appendChild(document.createElement('br'));

  const meta = document.createElement('span');
  meta.style.color = '#6B6F76';
  meta.textContent = label + ' · ';
  root.appendChild(meta);

  const sourceLink = document.createElement('a');
  sourceLink.href = spot.sourceElementUrl;
  sourceLink.target = '_blank';
  sourceLink.rel = 'noopener noreferrer';
  sourceLink.textContent = spot.attributionText;
  root.appendChild(sourceLink);

  root.appendChild(document.createTextNode(' · '));

  const licenceLink = document.createElement('a');
  licenceLink.href = spot.licenseUrl;
  licenceLink.target = '_blank';
  licenceLink.rel = 'noopener noreferrer';
  licenceLink.textContent = 'ODbL / attribution';
  root.appendChild(licenceLink);

  return root;
}

export function MapboxMap({ spots, events, selectedSpotId, onSpotClick, onEventClick }: MapboxMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [osmSpots, setOsmSpots] = useState<OsmSpot[]>([]);
  const [osmUnavailable, setOsmUnavailable] = useState(false);
  const [ready, setReady] = useState(false);
  const [surface, setSurface] = useState<MapSurfaceState>('ready');

  useEffect(() => {
    const token = getControlledMapboxToken();
    if (!token) {
      setSurface('unconfigured');
      return;
    }
    if (!containerRef.current) return;

    mapboxgl.accessToken = token;
    let map: mapboxgl.Map;
    try {
      map = new mapboxgl.Map({
        container: containerRef.current,
        style: 'mapbox://styles/mapbox/outdoors-v12',
        center: [-3.3702, 47.7482],
        zoom: 9,
        minZoom: 7,
        maxZoom: 18,
        maxBounds: BRETAGNE_BOUNDS,
        attributionControl: true,
      });
    } catch {
      setSurface('unavailable');
      return;
    }

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.addControl(new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false }), 'bottom-right');
    mapRef.current = map;

    const loadOsm = () => {
      const b = map.getBounds();
      if (!b) return;
      setOsmUnavailable(false);
      void fetchOsmSpots({
        south: b.getSouth(),
        west: b.getWest(),
        north: b.getNorth(),
        east: b.getEast(),
      }).then((result) => {
        if (result.status === 'ok') {
          setOsmSpots(result.spots);
          setOsmUnavailable(false);
          return;
        }
        setOsmSpots([]);
        setOsmUnavailable(true);
      });
    };

    map.on('error', () => setSurface('unavailable'));
    map.on('load', () => {
      setSurface('ready');
      setReady(true);
      loadOsm();
    });
    map.on('moveend', loadOsm);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    for (const spot of osmSpots) {
      const meta = categoryMeta(spot.category);
      const el = dotEl(meta.color, 11);
      el.style.opacity = '0.75';
      el.setAttribute('aria-label', spot.name + ', ' + meta.label + ', source OpenStreetMap');
      const popup = new mapboxgl.Popup({ offset: 12, closeButton: false }).setDOMContent(osmPopupEl(spot, meta.label));
      const marker = new mapboxgl.Marker({ element: el }).setLngLat([spot.lon, spot.lat]).setPopup(popup).addTo(map);
      markersRef.current.push(marker);
    }

    for (const spot of spots) {
      const meta = categoryMeta(spot.category);
      const selected = spot.id === selectedSpotId;
      const el = dotEl(meta.color, selected ? 20 : 15);
      el.setAttribute('aria-label', spot.name + ', ' + meta.label);
      el.addEventListener('click', (event) => {
        event.stopPropagation();
        onSpotClick?.(spot.id);
      });
      const marker = new mapboxgl.Marker({ element: el }).setLngLat([spot.lon, spot.lat]).addTo(map);
      markersRef.current.push(marker);
    }

    for (const eventItem of events) {
      const el = dotEl('var(--terracotta-600)', 18, true);
      el.setAttribute('aria-label', 'Événement : ' + eventItem.title);
      el.addEventListener('click', (event) => {
        event.stopPropagation();
        onEventClick?.(eventItem.id);
      });
      const marker = new mapboxgl.Marker({ element: el }).setLngLat([eventItem.lon, eventItem.lat]).addTo(map);
      markersRef.current.push(marker);
    }
  }, [spots, events, osmSpots, selectedSpotId, ready, onSpotClick, onEventClick]);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div
        ref={containerRef}
        style={{ width: '100%', height: 480, borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border)' }}
      />
      {surface !== 'ready' && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            textAlign: 'center',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            color: 'var(--fg-2)',
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          {describeMapSurface(surface)}
        </div>
      )}
      {surface === 'ready' && osmUnavailable && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'absolute',
            left: 12,
            bottom: 12,
            padding: '6px 9px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--fg-muted)',
            fontFamily: 'var(--font-sans)',
            fontSize: 12,
            boxShadow: '0 1px 3px rgba(20,18,58,0.15)',
          }}
        >
          Points OpenStreetMap indisponibles pour le moment.
        </div>
      )}
      {surface === 'ready' && osmSpots.length > 0 && (
        <div
          aria-label="Attribution des points d’intérêt OpenStreetMap"
          style={{
            position: 'absolute',
            right: 8,
            bottom: 8,
            zIndex: 2,
            padding: '3px 6px',
            borderRadius: 4,
            background: 'rgba(255,255,255,0.88)',
            fontSize: 10,
            lineHeight: 1.3,
          }}
        >
          POI{' '}
          <a href={OSM_COPYRIGHT_URL} target="_blank" rel="noopener noreferrer">
            © OpenStreetMap contributors
          </a>{' '}
          ·{' '}
          <a href={OSM_COPYRIGHT_URL} target="_blank" rel="noopener noreferrer">
            ODbL / attribution
          </a>
        </div>
      )}
    </div>
  );
}
