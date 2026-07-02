import type { CityId, DogPin } from './data';
import { DOGS_BY_CITY } from './data';

/**
 * Marqueur chien EMOPET pour une ville.
 *
 * Visuel statique (Étape 3) :
 *   - cercle plein terracotta-500 + contour granit-900
 *   - si actif (Capitaine à Lorient) : double halo terracotta-300/100
 *   - si événement (Concarneau) : 3 anneaux concentriques rendus par <EventBadge>
 *   - compte affiché en mono caps à côté du pin
 *
 * Les animations (pulse 3s, ring 2s) sont ajoutées en Étape 4 via classes CSS.
 */
export function CityDogPin({
  cityId,
  x,
  y,
}: {
  cityId: CityId;
  x: number;
  y: number;
}) {
  const data: DogPin = DOGS_BY_CITY[cityId];
  if (!data) return null;

  const isActive = !!data.hasActive;

  return (
    <g className="emopet-pin" data-city={cityId} data-active={isActive || undefined}>
      {/* Halo extérieur (actif uniquement) */}
      {isActive && (
        <circle
          cx={x}
          cy={y}
          r={14}
          fill="var(--terracotta-200)"
          opacity={0.45}
          className="emopet-pin__halo-outer"
        />
      )}
      {/* Halo intérieur */}
      <circle
        cx={x}
        cy={y}
        r={isActive ? 9 : 7}
        fill="var(--terracotta-300)"
        opacity={0.55}
        className="emopet-pin__halo"
      />
      {/* Cœur du pin */}
      <circle
        cx={x}
        cy={y}
        r={isActive ? 5 : 3.5}
        fill="var(--terracotta-500)"
        stroke="var(--granit-900)"
        strokeWidth={isActive ? 1.1 : 0.9}
        className="emopet-pin__core"
      />
      {/* Compte (mono caps) */}
      <text
        x={x + (isActive ? 10 : 8)}
        y={y + 3.5}
        fontSize={isActive ? 10 : 8.5}
        fontFamily="var(--font-mono)"
        fontWeight={600}
        fill="var(--terracotta-700)"
        letterSpacing="0.06em"
      >
        {data.count}
      </text>
    </g>
  );
}

/**
 * Marqueur de spot communautaire (Sprint 01).
 *
 * Pastille colorée par catégorie, avec un halo blanc pour rester lisible
 * au-dessus de la terre et des hachures mer. Légèrement agrandie si sélectionné.
 */
export function SpotPin({
  x,
  y,
  color,
  selected = false,
}: {
  x: number;
  y: number;
  color: string;
  selected?: boolean;
}) {
  return (
    <g className="emopet-spot-pin" data-selected={selected || undefined}>
      <circle cx={x} cy={y} r={selected ? 8 : 6.5} fill="var(--surface)" opacity={0.92} />
      <circle
        cx={x}
        cy={y}
        r={selected ? 5 : 4}
        fill={color}
        stroke="var(--granit-900)"
        strokeWidth={selected ? 1 : 0.7}
      />
    </g>
  );
}

/**
 * Indicateur événement balade — anneaux concentriques.
 * Conçu pour pulser en Étape 4 ; ici visuel statique.
 */
export function EventBadge({ x, y }: { x: number; y: number }) {
  return (
    <g className="emopet-event" aria-hidden>
      <circle
        cx={x}
        cy={y}
        r={22}
        fill="none"
        stroke="var(--terracotta-500)"
        strokeWidth={0.8}
        opacity={0.35}
        className="emopet-event__ring emopet-event__ring--3"
      />
      <circle
        cx={x}
        cy={y}
        r={16}
        fill="none"
        stroke="var(--terracotta-500)"
        strokeWidth={0.9}
        opacity={0.55}
        className="emopet-event__ring emopet-event__ring--2"
      />
      <circle
        cx={x}
        cy={y}
        r={11}
        fill="none"
        stroke="var(--terracotta-600)"
        strokeWidth={1}
        opacity={0.75}
        className="emopet-event__ring emopet-event__ring--1"
      />
    </g>
  );
}
