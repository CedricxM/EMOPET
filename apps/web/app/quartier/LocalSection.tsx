'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  CITIES,
  CommunityMap,
  INITIAL_SPOTS,
  LIGHTHOUSES,
  SPOT_CATEGORIES,
  TOTAL_DOGS,
} from '../../components/bretagne-map';
import type {
  City,
  CityId,
  CommunitySpot,
  Lighthouse,
  LighthouseId,
  MapboxEvent,
  NewSpotInput,
  SpotCategory,
} from '../../components/bretagne-map';
import { WeatherStrip } from '../../components/weather/WeatherStrip';
import { Card, Eyebrow, H1, Icon, Lead, P, P2 } from '../../components/ui';
import { MOCK_LOCAL } from '../../lib/mock-data';
import { formatEventDate, loadAllEvents, upcomingEvents } from '../../lib/community';
import type { CircleEvent } from '../../lib/community';
import { MOCK_MAP_PLACES, MOCK_MAP_ROUTES } from '../../lib/data/mapbox/mockMapEntities';
import { mapPlacesToCommunitySpots, mergeCommunitySpots } from '../../lib/data/mapbox/mapboxToCommunitySpot';
import { useI18n } from '../../lib/i18n';
import type { Dict } from '../../lib/i18n';
import styles from '../../styles/living-pages.module.css';

const MAX_SPOTS_PER_DAY = 5;
const STORAGE_SPOTS = 'breiz-map-user-spots';
const STORAGE_QUOTA = 'breiz-map-add-quota';
const STORAGE_FILTERS = 'breiz-map-filters';
const DATA_LAYER_SPOTS = mapPlacesToCommunitySpots(MOCK_MAP_PLACES);
const INITIAL_SPOTS_WITH_DATA_LAYER = mergeCommunitySpots(INITIAL_SPOTS, DATA_LAYER_SPOTS);

/* Modals lazy-loadÃ©s (HeroUI / React Aria ~50 kB, payÃ©s uniquement Ã  l'ouverture). */
const CityModal = dynamic(
  () => import('../../components/bretagne-map/modals').then((m) => m.CityModal),
  { ssr: false },
);
const LighthouseModal = dynamic(
  () => import('../../components/bretagne-map/modals').then((m) => m.LighthouseModal),
  { ssr: false },
);
const EventModal = dynamic(
  () => import('../../components/bretagne-map/modals').then((m) => m.EventModal),
  { ssr: false },
);
const SpotDetailModal = dynamic(
  () => import('../../components/bretagne-map/spot-modals').then((m) => m.SpotDetailModal),
  { ssr: false },
);
const AddSpotModal = dynamic(
  () => import('../../components/bretagne-map/spot-modals').then((m) => m.AddSpotModal),
  { ssr: false },
);

function LegendItem({ swatch, label }: { swatch: ReactNode; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span aria-hidden style={{ display: 'inline-flex', width: 24, height: 18, alignItems: 'center', justifyContent: 'center' }}>
        {swatch}
      </span>
      {label}
    </span>
  );
}

function DotSwatch({ active = false }: { active?: boolean }) {
  return (
    <svg width="22" height="18" viewBox="0 0 22 18" aria-hidden>
      {active && <circle cx="11" cy="9" r="8" fill="var(--terracotta-200)" opacity="0.55" />}
      <circle cx="11" cy="9" r={active ? 5.5 : 4} fill="var(--terracotta-300)" opacity="0.7" />
      <circle cx="11" cy="9" r={active ? 3 : 2.2} fill="var(--terracotta-500)" stroke="var(--granit-900)" strokeWidth="0.8" />
    </svg>
  );
}

function RingsSwatch() {
  return (
    <svg width="22" height="18" viewBox="0 0 22 18" aria-hidden>
      <circle cx="11" cy="9" r="8" fill="none" stroke="var(--terracotta-500)" strokeWidth="0.6" opacity="0.35" />
      <circle cx="11" cy="9" r="5.5" fill="none" stroke="var(--terracotta-500)" strokeWidth="0.8" opacity="0.6" />
      <circle cx="11" cy="9" r="3" fill="none" stroke="var(--terracotta-600)" strokeWidth="1" />
    </svg>
  );
}

function LighthouseSwatch() {
  return (
    <svg width="22" height="18" viewBox="0 0 22 18" aria-hidden fill="none" stroke="var(--granit-800)" strokeWidth="1" strokeLinejoin="round" strokeLinecap="round">
      <path d="M 7 16 L 8 5 L 14 5 L 15 16 Z" />
      <rect x="8.5" y="2" width="5" height="3" />
      <line x1="11" y1="0.5" x2="11" y2="2" />
    </svg>
  );
}

/** Chip de filtre catÃ©gorie de spot â€” pastille colorÃ©e + libellÃ©, toggle actif. */
function SpotChip({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '6px 14px',
        borderRadius: 'var(--radius-pill)',
        border: `1px solid ${active ? 'var(--border-strong)' : 'var(--border)'}`,
        background: active ? 'var(--surface)' : 'transparent',
        boxShadow: active ? 'var(--shadow-xs)' : 'none',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-sm)',
        fontWeight: active ? 'var(--weight-semi)' : 'var(--weight-medium)',
        color: active ? 'var(--fg-strong)' : 'var(--fg-2)',
        cursor: 'pointer',
      }}
    >
      {color && (
        <span
          aria-hidden
          style={{
            width: 9,
            height: 9,
            borderRadius: '50%',
            background: color,
            border: '1px solid var(--granit-900)',
            opacity: active ? 1 : 0.55,
          }}
        />
      )}
      {label}
    </button>
  );
}

type FilterId = 'all' | 'vets' | 'parks' | 'trainers' | 'open247';
const FILTERS: Array<{ id: FilterId; labelKey: keyof Dict['local'] & string; kind: string | null }> = [
  { id: 'all', labelKey: 'all', kind: null },
  { id: 'vets', labelKey: 'filterVets', kind: 'VÃ©tÃ©rinaire' },
  { id: 'parks', labelKey: 'filterParks', kind: 'Parc' },
  { id: 'trainers', labelKey: 'filterTrainers', kind: 'Ã‰ducateur' },
  { id: 'open247', labelKey: 'filterOpen247', kind: 'Urgence' },
];

const SPOT_CATEGORY_LABEL_KEYS: Record<SpotCategory, keyof Dict['local'] & string> = {
  plage: 'spotBeach',
  parc: 'spotPark',
  foret: 'spotForest',
  veterinaire: 'spotVet',
  comportementaliste: 'spotTrainer',
  pension: 'spotBoarding',
  magasin: 'spotShop',
  cafe: 'spotCafe',
};

export function LocalSection() {
  const { t } = useI18n();
  // === Ã‰tat interactions carte (Ã‰tape 5) ===
  const [selectedCityId, setSelectedCityId] = useState<CityId | null>(null);
  const [selectedLighthouseId, setSelectedLighthouseId] = useState<LighthouseId | null>(null);
  const [eventOpen, setEventOpen] = useState(false);
  const selectedCity = useMemo<City | null>(
    () => CITIES.find((c) => c.id === selectedCityId) ?? null,
    [selectedCityId],
  );
  const selectedLighthouse = useMemo<Lighthouse | null>(
    () => LIGHTHOUSES.find((l) => l.id === selectedLighthouseId) ?? null,
    [selectedLighthouseId],
  );

  // === Spots communautaires (Sprint 01) ===
  const [spots, setSpots] = useState<CommunitySpot[]>(INITIAL_SPOTS_WITH_DATA_LAYER);
  const [activeCategories, setActiveCategories] = useState<Set<SpotCategory>>(new Set());
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addedToday, setAddedToday] = useState(0);
  const [flashNotice, setFlashNotice] = useState<string | null>(null);
  const [communityEvents, setCommunityEvents] = useState<CircleEvent[]>([]);

  // Hydratation client : spots ajoutÃ©s localement + quota du jour + filtres.
  useEffect(() => {
    try {
      const rawSpots = localStorage.getItem(STORAGE_SPOTS);
      if (rawSpots) {
        const userSpots = JSON.parse(rawSpots) as CommunitySpot[];
        setSpots((prev) => mergeCommunitySpots(prev, userSpots));
      }
      const rawQuota = localStorage.getItem(STORAGE_QUOTA);
      if (rawQuota) {
        const { date, count } = JSON.parse(rawQuota) as { date: string; count: number };
        if (date === new Date().toISOString().slice(0, 10)) setAddedToday(count);
      }
      const rawFilters = localStorage.getItem(STORAGE_FILTERS);
      if (rawFilters) setActiveCategories(new Set(JSON.parse(rawFilters) as SpotCategory[]));
    } catch {
      /* localStorage indisponible â€” on ignore. */
    }
    // Ã‰vÃ©nements communautaires (Sprint 04) â†’ RDV sur la carte. Serveur autoritaire.
    setCommunityEvents(upcomingEvents(loadAllEvents())); // baseline local
    (async () => {
      try {
        const res = await fetch('/api/community/events');
        if (res.ok) {
          const data = (await res.json()) as { events: CircleEvent[] };
          if (data.events?.length) setCommunityEvents(upcomingEvents(data.events));
        }
      } catch { /* hors-ligne â†’ baseline local */ }
    })();
    // R3 : source autoritaire = le serveur (seed des spots de dÃ©mo si vide).
    // Si la route rÃ©pond, elle prime sur le baseline local ci-dessus.
    (async () => {
      try {
        const res = await fetch('/api/map/spots');
        if (res.ok) {
          const data = (await res.json()) as { spots: CommunitySpot[] };
          if (data.spots?.length) setSpots(mergeCommunitySpots(data.spots, DATA_LAYER_SPOTS));
        }
      } catch {
        /* hors-ligne â†’ on conserve le baseline local */
      }
    })();
  }, []);

  const mapEvents = useMemo<MapboxEvent[]>(
    () => communityEvents.map((e) => ({ id: e.id, lon: e.lon, lat: e.lat, title: e.title })),
    [communityEvents],
  );

  function handleEventClick(id: string) {
    const ev = communityEvents.find((e) => e.id === id);
    if (!ev) return;
    setFlashNotice(`${ev.title} Â· ${formatEventDate(ev.startsAt)} Â· ${ev.meetingPointName}`);
    setTimeout(() => setFlashNotice(null), 5000);
  }

  const selectedSpot = useMemo<CommunitySpot | null>(
    () => spots.find((s) => s.id === selectedSpotId) ?? null,
    [spots, selectedSpotId],
  );

  const visibleSpots = useMemo<CommunitySpot[]>(
    () => (activeCategories.size === 0 ? spots : spots.filter((s) => activeCategories.has(s.category))),
    [spots, activeCategories],
  );

  function toggleCategory(cat: SpotCategory) {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      try { localStorage.setItem(STORAGE_FILTERS, JSON.stringify(Array.from(next))); } catch {}
      return next;
    });
  }

  function clearFilters() {
    setActiveCategories(new Set());
    try { localStorage.removeItem(STORAGE_FILTERS); } catch {}
  }

  function afterCreate() {
    setAddedToday((prev) => {
      const count = prev + 1;
      try {
        localStorage.setItem(STORAGE_QUOTA, JSON.stringify({ date: new Date().toISOString().slice(0, 10), count }));
      } catch {}
      return count;
    });
    setAddOpen(false);
    setFlashNotice(t('local', 'spotAdded'));
    setTimeout(() => setFlashNotice(null), 4000);
  }

  async function handleCreateSpot(input: NewSpotInput) {
    // Centre par dÃ©faut : Lorient (ville d'ancrage). En prod : position cliquÃ©e.
    const payload = { ...input, lon: -3.3702, lat: 47.7482 };
    // R3 : persistance serveur d'abord, repli localStorage si hors-ligne.
    try {
      const res = await fetch('/api/map/spots', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        const data = (await res.json()) as { ok: boolean; spot?: CommunitySpot };
        if (data.ok && data.spot) {
          setSpots((prev) => [...prev, data.spot!]);
          afterCreate();
          return;
        }
      }
    } catch {
      /* repli local */
    }
    const newSpot: CommunitySpot = {
      id: `user-${Date.now()}`,
      category: input.category,
      name: input.name,
      description: input.description || 'Spot ajoutÃ© par la communautÃ©.',
      lon: -3.3702,
      lat: 47.7482,
      isAnonymous: input.isAnonymous,
      authorName: input.isAnonymous ? undefined : 'Vous',
      visitCount: 0,
      averageRating: null,
      comments: [],
      createdAt: new Date().toISOString(),
    };
    setSpots((prev) => {
      const next = [...prev, newSpot];
      try {
        const userSpots = next.filter((s) => s.id.startsWith('user-'));
        localStorage.setItem(STORAGE_SPOTS, JSON.stringify(userSpots));
      } catch {}
      return next;
    });
    afterCreate();
  }

  async function handleAddComment(spotId: string, content: string) {
    try {
      const res = await fetch(`/api/map/spots/${spotId}/comments`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content, authorName: 'Vous' }) });
      if (res.ok) {
        const data = (await res.json()) as { ok: boolean; comment?: CommunitySpot['comments'][number] };
        if (data.ok && data.comment) {
          setSpots((prev) => prev.map((s) => (s.id === spotId ? { ...s, comments: [...s.comments, data.comment!] } : s)));
          return;
        }
      }
    } catch {
      /* repli local */
    }
    setSpots((prev) =>
      prev.map((s) =>
        s.id === spotId
          ? { ...s, comments: [...s.comments, { id: `c-${Date.now()}`, content, authorName: 'Vous', createdAt: new Date().toISOString() }] }
          : s,
      ),
    );
  }

  function handleFlagSpot(_spotId: string) {
    setSelectedSpotId(null);
    setFlashNotice(t('local', 'spotFlagged'));
    setTimeout(() => setFlashNotice(null), 4000);
  }

  const [filter, setFilter] = useState<FilterId>('all');
  const activeFilter = FILTERS.find((item) => item.id === filter) ?? FILTERS[0]!;
  const items = MOCK_LOCAL.filter((l) => {
    if (!activeFilter.kind) return true;
    return l.kind === activeFilter.kind;
  });

  return (
    <>
      <div className={styles.pageFlow}>
      {/* === Carte Bretagne (Veute / communautÃ©) === */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <header style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Eyebrow tone="accent">{t('local', 'mapEyebrow')}</Eyebrow>
          <H1>{t('local', 'mapTitle')}</H1>
          <Lead>{TOTAL_DOGS} {t('local', 'mapLeadSuffix')}</Lead>
        </header>

        <WeatherStrip lat={47.7482} lon={-3.3702} placeLabel="Lorient" />

        {/* Filtres catÃ©gories de spots (Sprint 01) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <SpotChip
              label={t('local', 'all')}
              active={activeCategories.size === 0}
              onClick={clearFilters}
            />
            {SPOT_CATEGORIES.map((c) => (
              <SpotChip
                key={c.value}
                label={t('local', SPOT_CATEGORY_LABEL_KEYS[c.value])}
                color={c.color}
                active={activeCategories.has(c.value)}
                onClick={() => toggleCategory(c.value)}
              />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--fg-2)' }}>
              {visibleSpots.length} {visibleSpots.length === 1 ? t('local', 'spotsShownSingular') : t('local', 'spotsShownPlural')}
            </span>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 'var(--radius-pill)',
                background: 'var(--terracotta-500)',
                color: 'white',
                border: 'none',
                fontFamily: 'var(--font-sans)',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              <Icon name="plus" size={16} color="white" /> {t('local', 'addSpot')}
            </button>
          </div>
          {flashNotice && (
            <div
              role="status"
              style={{
                padding: '10px 14px',
                background: 'var(--accent-2-soft)',
                border: '1px solid var(--accent-2-soft-border)',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                color: 'var(--lichen-700)',
              }}
            >
              {flashNotice}
            </div>
          )}
          <div className={styles.localNote}>
            <P2 style={{ color: 'var(--lichen-700)' }}>
              Couche data EMOPET : {DATA_LAYER_SPOTS.length} points mockes et {MOCK_MAP_ROUTES.length} routes preparees.
              Les contributions communautaires restent opt-in et n affichent aucune donnee privee.
            </P2>
          </div>
        </div>

        <CommunityMap
          spots={visibleSpots}
          events={mapEvents}
          selectedSpotId={selectedSpotId}
          onSpotClick={setSelectedSpotId}
          onEventClick={handleEventClick}
          svg={{
            onCityClick: setSelectedCityId,
            onLighthouseClick: setSelectedLighthouseId,
            onLegacyEventClick: () => setEventOpen(true),
          }}
        />
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 20,
            padding: '12px 16px',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-xs)',
            color: 'var(--fg-2)',
          }}
        >
          <LegendItem swatch={<DotSwatch />} label={t('local', 'legendPin')} />
          <LegendItem swatch={<DotSwatch active />} label={t('local', 'legendActivePin')} />
          <LegendItem swatch={<RingsSwatch />} label={t('local', 'legendEvent')} />
          <LegendItem swatch={<LighthouseSwatch />} label={t('local', 'legendLighthouse')} />
        </div>

        {/* Footer CTAs Veute */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => {
              const list = document.getElementById('local-annuaire');
              list?.scrollIntoView({ behavior: 'smooth' });
            }}
            style={{
              flex: '1 1 220px',
              padding: '14px 24px',
              borderRadius: 'var(--radius-pill)',
              background: 'var(--terracotta-500)',
              color: 'white',
              border: 'none',
              fontFamily: 'var(--font-sans)',
              fontWeight: 600,
              fontSize: 14,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            {t('local', 'viewList')}
          </button>
          <button
            type="button"
            onClick={() => setEventOpen(true)}
            style={{
              flex: '1 1 220px',
              padding: '14px 24px',
              borderRadius: 'var(--radius-pill)',
              background: 'transparent',
              color: 'var(--fg-strong)',
              border: '1.5px solid var(--cream-400)',
              fontFamily: 'var(--font-sans)',
              fontWeight: 600,
              fontSize: 14,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            {t('local', 'organizeWalk')}
          </button>
        </div>
      </section>

      {/* Modals (lazy-loaded â€” montÃ©s Ã  la premiÃ¨re ouverture) */}
      {selectedCity && (
        <CityModal city={selectedCity} onClose={() => setSelectedCityId(null)} />
      )}
      {selectedLighthouse && (
        <LighthouseModal lighthouse={selectedLighthouse} onClose={() => setSelectedLighthouseId(null)} />
      )}
      {eventOpen && (
        <EventModal isOpen={eventOpen} onClose={() => setEventOpen(false)} />
      )}
      {selectedSpot && (
        <SpotDetailModal
          spot={selectedSpot}
          onClose={() => setSelectedSpotId(null)}
          onAddComment={handleAddComment}
          onFlag={handleFlagSpot}
        />
      )}
      {addOpen && (
        <AddSpotModal
          isOpen={addOpen}
          onClose={() => setAddOpen(false)}
          onCreate={handleCreateSpot}
          remainingToday={Math.max(0, MAX_SPOTS_PER_DAY - addedToday)}
        />
      )}

      {/* === Annuaire local existant (vÃ©tÃ©rinaires, parcs, Ã©ducateurs, urgences) === */}
      <header id="local-annuaire" style={{ display: 'flex', flexDirection: 'column', gap: 6, scrollMarginTop: 24 }}>
        <Eyebrow>{t('local', 'nearbyEyebrow')}</Eyebrow>
        <H1>{t('local', 'nearbyTitle')}</H1>
        <Lead>{t('local', 'nearbyLead')}</Lead>
      </header>

      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: 6,
          background: 'var(--bg-sunk)',
          borderRadius: 'var(--radius-pill)',
          width: 'fit-content',
        }}
      >
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-pill)',
                background: active ? 'var(--surface)' : 'transparent',
                border: `1px solid ${active ? 'var(--border)' : 'transparent'}`,
                boxShadow: active ? 'var(--shadow-xs)' : 'none',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--weight-semi)',
                color: active ? 'var(--fg-strong)' : 'var(--fg-2)',
                cursor: 'pointer',
              }}
            >
              {t('local', f.labelKey)}
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        {items.map((item) => (
          <Card key={item.id}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--radius-md)',
                  background: item.kind === 'Urgence' ? 'var(--accent-soft)' : 'var(--accent-2-soft)',
                  color: item.kind === 'Urgence' ? 'var(--accent-press)' : 'var(--lichen-700)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon name="compass" size={20} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <Eyebrow tone={item.kind === 'Urgence' ? 'accent' : 'accent2'}>{item.kind}</Eyebrow>
                  <span
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: 'var(--text-xs)',
                      color: 'var(--fg-muted)',
                      fontFeatureSettings: 'var(--ff-tabular)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.distanceKm.toFixed(1)} km
                  </span>
                </div>
                <P style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', color: 'var(--fg-strong)' }}>
                  {item.name}
                </P>
                <P2>{item.note}</P2>
              </div>
            </div>
          </Card>
        ))}
      </div>
      </div>
    </>
  );
}

