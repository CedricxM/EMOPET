'use client';

/**
 * Controlled Mapbox GL implementation.
 *
 * Activation requires:
 * - NEXT_PUBLIC_MAPBOX_TOKEN
 * - NEXT_PUBLIC_EMOPET_MAPBOX_RIGHTS_GATE=GO
 *
 * OSM/Overpass POIs are separately gated inside fetchOsmSpots().
 * Environment gates are operator controls only; they do not replace #116 review.
 */

import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from 'mapbox-gl';
import { useEffect, useRef, useState } from 'react';
import { categoryMeta } from './spots';
import type { CommunitySpot } from './spots';
import { fetchOsmSpots } from '../../lib/osm-spots';
import type { OsmSpot } from '../../lib/osm-spots';

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

function dotEl(color: string, size: number, ring = false): HTMLDivElement {
  const el = document.createElement('div');
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.borderRadius = '50%';
  el.style.cursor = 'pointer';
  if (ring) {
    el.style.border = `2.5px solid ${color}`;
    el.style.background = 'rgba(255,255,255,0.55)';
    el.style.boxShadow = `0 0 0 3px ${color}33`;
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
  meta.textContent = `${label} · `;
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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const rightsGate = process.env.NEXT_PUBLIC_EMOPET_MAPBOX_RIGHTS_GATE;
    if (!token || rightsGate !== 'GO' || !containerRef.current) return;

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: [-3.3702, 47.7482],
      zoom: 9,
      minZoom: 7,
      maxZoom: 18,
      maxBounds: BRETAGNE_BOUNDS,
      attributionControl: true,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.addControl(new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false }), 'bottom-right');
    mapRef.current = map;

    const loadOsm = () => {
      const b = map.getBounds();
      if (!b) return;
      void fetchOsmSpots({ south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() }).then(setOsmSpots);
    };
    map.on('load', () => { setReady(true); loadOsm(); });
    map.on('moveend', loadOsm);

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    for (const s of osmSpots) {
      const meta = categoryMeta(s.category);
      const el = dotEl(meta.color, 11);
      el.style.opacity = '0.75';
      el.setAttribute('aria-label', `${s.name}, ${meta.label}, source OpenStreetMap`);
      const popup = new mapboxgl.Popup({ offset: 12, closeButton: false }).setDOMContent(osmPopupEl(s, meta.label));
      const marker = new mapboxgl.Marker({ element: el }).setLngLat([s.lon, s.lat]).setPopup(popup).addTo(map);
      markersRef.current.push(marker);
    }

    for (const s of spots) {
      const meta = categoryMeta(s.category);
      const selected = s.id === selectedSpotId;
      const el = dotEl(meta.color, selected ? 20 : 15);
      el.setAttribute('aria-label', `${s.name}, ${meta.label}`);
      el.addEventListener('click', (e) => { e.stopPropagation(); onSpotClick?.(s.id); });
      const marker = new mapboxgl.Marker({ element: el }).setLngLat([s.lon, s.lat]).addTo(map);
      markersRef.current.push(marker);
    }

    for (const ev of events) {
      const el = dotEl('var(--terracotta-600)', 18, true);
      el.setAttribute('aria-label', `Événement : ${ev.title}`);
      el.addEventListener('click', (e) => { e.stopPropagation(); onEventClick?.(ev.id); });
      const marker = new mapboxgl.Marker({ element: el }).setLngLat([ev.lon, ev.lat]).addTo(map);
      markersRef.current.push(marker);
    }
  }, [spots, events, osmSpots, selectedSpotId, ready, onSpotClick, onEventClick]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: 480, borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border)' }}
    />
  );
}
