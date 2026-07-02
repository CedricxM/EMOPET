import './animations.css';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from 'react';
import {
  BRETAGNE_OUTLINE_PATH,
  CITIES,
  DEPARTMENT_BORDERS,
  DEPARTMENT_LABELS,
  DOGS_BY_CITY,
  ISLANDS,
  LIGHTHOUSES,
} from './data';
import type { CityId, LighthouseId } from './data';
import { CityPicto, LighthouseGlyph } from './pictograms';
import { CityDogPin, EventBadge, SpotPin } from './pins';
import { SunMoon } from './SunMoon';

/** Marqueur de spot communautaire projeté dans le repère viewBox. */
export interface SpotMarker {
  id: string;
  x: number;
  y: number;
  color: string;
  /** Libellé accessible : "{nom}, catégorie {catégorie}". */
  label: string;
}

export interface BretagneMapProps {
  onCityClick?: (id: CityId) => void;
  onLighthouseClick?: (id: LighthouseId) => void;
  onEventClick?: () => void;
  /** Spots communautaires à afficher par-dessus la carte (Sprint 01). */
  spots?: SpotMarker[];
  /** Id du spot sélectionné (pin agrandi). */
  selectedSpotId?: string | null;
  onSpotClick?: (id: string) => void;
  /** Points de RDV des événements communautaires (Sprint 04) — anneaux. */
  eventMarkers?: SpotMarker[];
  onEventMarkerClick?: (id: string) => void;
}

/** Helper : activer un clic via clavier (Enter / Space) sur un <g> SVG. */
function activateOnKey(handler: () => void) {
  return (e: ReactKeyboardEvent<SVGElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handler();
    }
  };
}

/**
 * Carte Bretagne historique — rendu animé + interactif (Étapes 2-5).
 *
 * Style : sérigraphie vintage maritime (référence : Le Corre, Nono,
 * affiches SNCM). Traits noirs fins sur fond beige sable. Mer traitée
 * en hachures gravure.
 *
 * Animations CSS (toutes désactivables via prefers-reduced-motion) :
 *   - vagues décoratives au sud (translateX ±3px, 6s)
 *   - pulse des halos pin chien (3s, 2.4s si actif)
 *   - flash phares 8s — offsets différents par phare
 *   - pulse anneaux événement Concarneau (2s, 0.6s delay entre anneaux)
 *   - soleil/lune sur arc selon Date.getHours() (refresh 5 min)
 *
 * Interactions (Étape 5) :
 *   - clic ville → onCityClick(id)
 *   - clic phare → onLighthouseClick(id)
 *   - clic anneaux événement → onEventClick()
 *   - tabIndex/aria-label sur chaque élément actif, activation clavier.
 */
export function BretagneMap({
  onCityClick,
  onLighthouseClick,
  onEventClick,
  spots,
  selectedSpotId,
  onSpotClick,
  eventMarkers,
  onEventMarkerClick,
}: BretagneMapProps = {}) {
  return (
    <svg
      viewBox="0 0 1000 720"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Carte stylisée de la Bretagne historique — Finistère, Côtes-d'Armor, Morbihan, Ille-et-Vilaine, Loire-Atlantique"
      style={{
        width: '100%',
        height: 'auto',
        display: 'block',
        background: 'var(--cream-50)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
      }}
    >
      <defs>
        {/* Hachures style gravure pour la mer */}
        <pattern
          id="sea-hatch"
          patternUnits="userSpaceOnUse"
          width="8"
          height="8"
          patternTransform="rotate(45)"
        >
          <rect width="8" height="8" fill="var(--cream-50)" />
          <line x1="0" y1="0" x2="0" y2="8" stroke="var(--granit-300)" strokeWidth="0.5" />
        </pattern>
      </defs>

      {/* Fond mer hachuré */}
      <rect x="0" y="0" width="1000" height="720" fill="url(#sea-hatch)" />

      {/* Vagues décoratives sud (3 lignes ondulent doucement) */}
      <g fill="none" stroke="var(--granit-400)" strokeWidth="0.6" opacity={0.55}>
        <path
          className="emopet-wave"
          d="M 0 660 q 50 -8 100 0 q 50 8 100 0 q 50 -8 100 0 q 50 8 100 0 q 50 -8 100 0 q 50 8 100 0 q 50 -8 100 0 q 50 8 100 0 q 50 -8 100 0 q 50 8 100 0"
        />
        <path
          className="emopet-wave emopet-wave--2"
          d="M 0 680 q 60 -6 120 0 q 60 6 120 0 q 60 -6 120 0 q 60 6 120 0 q 60 -6 120 0 q 60 6 120 0 q 60 -6 120 0 q 60 6 120 0"
        />
        <path
          className="emopet-wave emopet-wave--3"
          d="M 0 700 q 40 -5 80 0 q 40 5 80 0 q 40 -5 80 0 q 40 5 80 0 q 40 -5 80 0 q 40 5 80 0 q 40 -5 80 0 q 40 5 80 0 q 40 -5 80 0 q 40 5 80 0 q 40 -5 80 0 q 40 5 80 0"
        />
      </g>

      {/* Soleil / Lune selon l'heure (client only) */}
      <SunMoon />

      {/* Terre — Bretagne historique */}
      <path
        d={BRETAGNE_OUTLINE_PATH}
        fill="var(--cream-100)"
        stroke="var(--granit-800)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />

      {/* Bordures internes des départements */}
      <g
        fill="none"
        stroke="var(--granit-500)"
        strokeWidth="0.8"
        strokeDasharray="3 3"
        strokeLinecap="round"
      >
        {DEPARTMENT_BORDERS.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>

      {/* Numéros + noms de départements */}
      <g fontFamily="var(--font-mono)" fill="var(--granit-500)">
        {DEPARTMENT_LABELS.map((dep) => (
          <g key={dep.num}>
            <text
              x={dep.x}
              y={dep.y}
              fontSize="20"
              fontWeight="600"
              textAnchor="middle"
              letterSpacing="0.08em"
              fill="var(--terracotta-700)"
              opacity="0.55"
              fontStyle="italic"
              fontFamily="var(--font-serif)"
            >
              {dep.num}
            </text>
            <text
              x={dep.x}
              y={dep.y + 16}
              fontSize="9"
              textAnchor="middle"
              letterSpacing="0.12em"
              opacity="0.7"
            >
              {dep.name.toUpperCase()}
            </text>
          </g>
        ))}
      </g>

      {/* Îles principales */}
      <g>
        {ISLANDS.map((island) => (
          <g key={island.id}>
            <path
              d={island.path}
              fill="var(--cream-100)"
              stroke="var(--granit-700)"
              strokeWidth="1"
              strokeLinejoin="round"
            />
            <text
              x={island.labelX}
              y={island.labelY}
              fontSize="9"
              fontFamily="var(--font-sans)"
              fontStyle="italic"
              fill="var(--granit-600)"
              textAnchor="middle"
              letterSpacing="0.04em"
            >
              {island.name}
            </text>
          </g>
        ))}
      </g>

      {/* Phares emblématiques — délais de flash décalés + interactifs */}
      <g>
        {LIGHTHOUSES.map((l, i) => {
          const interactive = !!onLighthouseClick;
          return (
            <g
              key={l.id}
              className="emopet-lighthouse"
              style={{
                ['--lh-delay' as keyof CSSProperties]: `${i * 2.7}s`,
                cursor: interactive ? 'pointer' : 'default',
              } as CSSProperties}
              role={interactive ? 'button' : undefined}
              tabIndex={interactive ? 0 : undefined}
              aria-label={interactive ? `${l.name} — voir l'histoire` : undefined}
              onClick={interactive ? () => onLighthouseClick?.(l.id) : undefined}
              onKeyDown={interactive ? activateOnKey(() => onLighthouseClick?.(l.id)) : undefined}
            >
              <LighthouseGlyph x={l.x} y={l.y} size={26} />
              <text
                x={l.x}
                y={l.y + 14}
                fontSize="8"
                fontFamily="var(--font-mono)"
                fill="var(--granit-700)"
                textAnchor="middle"
                letterSpacing="0.14em"
              >
                {l.name.replace(/^Phare (de l'|de la |d')/, '').toUpperCase()}
              </text>
            </g>
          );
        })}
      </g>

      {/* Événements (interactif) — sous la couche villes */}
      <g>
        {CITIES.filter((c) => DOGS_BY_CITY[c.id]?.hasEvent).map((city) => {
          const interactive = !!onEventClick;
          return (
            <g
              key={`evt-${city.id}`}
              role={interactive ? 'button' : undefined}
              tabIndex={interactive ? 0 : undefined}
              aria-label={interactive ? `Événement balade — ${city.name}` : undefined}
              style={{ cursor: interactive ? 'pointer' : 'default' }}
              onClick={interactive ? () => onEventClick?.() : undefined}
              onKeyDown={interactive ? activateOnKey(() => onEventClick?.()) : undefined}
            >
              <EventBadge x={city.x} y={city.y} />
            </g>
          );
        })}
      </g>

      {/* Villes — picto + pin chien EMOPET + label, le tout cliquable */}
      <g>
        {CITIES.map((city) => {
          const interactive = !!onCityClick;
          const dogs = DOGS_BY_CITY[city.id];
          return (
            <g
              key={city.id}
              role={interactive ? 'button' : undefined}
              tabIndex={interactive ? 0 : undefined}
              aria-label={
                interactive
                  ? `${city.name} — ${dogs?.count ?? 0} chiens EMOPET${dogs?.hasActive ? ' dont Capitaine' : ''}`
                  : undefined
              }
              style={{ cursor: interactive ? 'pointer' : 'default' }}
              onClick={interactive ? () => onCityClick?.(city.id) : undefined}
              onKeyDown={interactive ? activateOnKey(() => onCityClick?.(city.id)) : undefined}
            >
              <CityPicto x={city.x} y={city.y} kind={city.picto} size={22} />
              <CityDogPin cityId={city.id} x={city.x} y={city.y} />
              <text
                x={city.x + city.labelDx}
                y={city.y + city.labelDy}
                fontSize="11"
                fontFamily="var(--font-serif)"
                fontWeight="500"
                fill="var(--granit-900)"
                textAnchor={city.anchor}
              >
                {city.name}
              </text>
            </g>
          );
        })}
      </g>

      {/* Événements communautaires (Sprint 04) — points de RDV en anneaux */}
      {eventMarkers && eventMarkers.length > 0 && (
        <g>
          {eventMarkers.map((m) => {
            const interactive = !!onEventMarkerClick;
            return (
              <g
                key={m.id}
                role={interactive ? 'button' : undefined}
                tabIndex={interactive ? 0 : undefined}
                aria-label={interactive ? m.label : undefined}
                style={{ cursor: interactive ? 'pointer' : 'default' }}
                onClick={interactive ? () => onEventMarkerClick?.(m.id) : undefined}
                onKeyDown={interactive ? activateOnKey(() => onEventMarkerClick?.(m.id)) : undefined}
              >
                <EventBadge x={m.x} y={m.y} />
              </g>
            );
          })}
        </g>
      )}

      {/* Spots communautaires (Sprint 01) — couche supérieure, interactifs */}
      {spots && spots.length > 0 && (
        <g>
          {spots.map((spot) => {
            const interactive = !!onSpotClick;
            return (
              <g
                key={spot.id}
                role={interactive ? 'button' : undefined}
                tabIndex={interactive ? 0 : undefined}
                aria-label={interactive ? spot.label : undefined}
                style={{ cursor: interactive ? 'pointer' : 'default' }}
                onClick={interactive ? () => onSpotClick?.(spot.id) : undefined}
                onKeyDown={interactive ? activateOnKey(() => onSpotClick?.(spot.id)) : undefined}
              >
                <SpotPin x={spot.x} y={spot.y} color={spot.color} selected={spot.id === selectedSpotId} />
              </g>
            );
          })}
        </g>
      )}

      {/* Rose des vents discrète en bas-droite */}
      <g transform="translate(900 660)" fill="none" stroke="var(--granit-500)" strokeWidth="0.8" opacity="0.5">
        <circle cx="0" cy="0" r="22" />
        <line x1="0" y1="-22" x2="0" y2="22" />
        <line x1="-22" y1="0" x2="22" y2="0" />
        <path d="M 0 -22 L 4 0 L 0 22 L -4 0 Z" fill="var(--granit-500)" stroke="none" opacity="0.6" />
        <text
          x="0"
          y="-28"
          fontSize="8"
          fontFamily="var(--font-mono)"
          fill="var(--granit-600)"
          textAnchor="middle"
          letterSpacing="0.2em"
        >
          N
        </text>
      </g>

      {/* Signature aperture mark */}
      <text
        x="50"
        y="690"
        fontSize="11"
        fontFamily="var(--font-mono)"
        fill="var(--terracotta-700)"
        letterSpacing="0.22em"
      >
        ⊙ AR VEUTE
      </text>
    </svg>
  );
}
