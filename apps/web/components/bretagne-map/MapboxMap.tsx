'use client';

/**
 * Carte Mapbox GL réelle (Réalité R1). Activée si NEXT_PUBLIC_MAPBOX_TOKEN
 * est défini ; sinon le wrapper CommunityMap retombe sur la carte SVG.
 *
 * Affiche : spots communautaires (lon/lat), POI réels OpenStreetMap chargés
 * dans le viewport (vétos, magasins, parcs, plages), et points de RDV
 * d'événements. Bornée à la Bretagne historique.
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

function osmPopupEl(name: string, label: string): HTMLDivElement {
  const root = document.createElement('div');
  root.style.fontFamily = 'var(--font-sans)';
  root.style.fontSize = '12px';

  const title = document.createElement('strong');
  title.textContent = name;
  root.appendChild(title);
  root.appendChild(document.createElement('br'));

  const meta = document.createElement('span');
  meta.style.color = '#6B6F76';
  meta.textContent = `${label} - OpenStreetMap`;
  root.appendChild(meta);

  return root;
}

export function MapboxMap({ spots, events, selectedSpotId, onSpotClick, onEventClick }: MapboxMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [osmSpots, setOsmSpots] = useState<OsmSpot[]>([]);
  const [ready, setReady] = useState(false);

  // Init carte (une fois)
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token || !containerRef.current) return;
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

  // (Re)rendu des marqueurs
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // POI réels OSM (sous la couche communautaire)
    for (const s of osmSpots) {
      const meta = categoryMeta(s.category);
      const el = dotEl(meta.color, 11);
      el.style.opacity = '0.75';
      const popup = new mapboxgl.Popup({ offset: 12, closeButton: false }).setDOMContent(osmPopupEl(s.name, meta.label));
      const marker = new mapboxgl.Marker({ element: el }).setLngLat([s.lon, s.lat]).setPopup(popup).addTo(map);
      markersRef.current.push(marker);
    }

    // Spots communautaires
    for (const s of spots) {
      const meta = categoryMeta(s.category);
      const selected = s.id === selectedSpotId;
      const el = dotEl(meta.color, selected ? 20 : 15);
      el.setAttribute('aria-label', `${s.name}, ${meta.label}`);
      el.addEventListener('click', (e) => { e.stopPropagation(); onSpotClick?.(s.id); });
      const marker = new mapboxgl.Marker({ element: el }).setLngLat([s.lon, s.lat]).addTo(map);
      markersRef.current.push(marker);
    }

    // Événements (RDV)
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
