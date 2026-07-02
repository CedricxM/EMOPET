import type { PictoKind } from './data';

/**
 * Pictogrammes vintage SVG pour les villes bretonnes.
 *
 * Chaque picto est dessiné dans un repère 24×24 centré, traits noirs
 * sérigraphiques (stroke courant). Le composant `<CityPicto>` ré-utilise
 * ce repère commun et l'aligne au-dessus du point de la ville.
 *
 * Style : trait fin ~1.2px, pas de remplissage, esthétique gravure.
 */

interface PictoProps {
  /** Centre horizontal du picto dans le viewBox de la carte. */
  x: number;
  /** Centre vertical (le picto sera dessiné AU-DESSUS de ce point). */
  y: number;
  /** Taille du picto en unités viewBox. Défaut 22. */
  size?: number;
  kind: PictoKind;
}

export function CityPicto({ x, y, size = 22, kind }: PictoProps) {
  // Translate origin so that picto sits just above the point (with base touching y).
  const half = size / 2;
  const tx = x - half;
  const ty = y - size - 6;
  return (
    <g
      transform={`translate(${tx} ${ty})`}
      fill="none"
      stroke="var(--granit-800)"
      strokeWidth={1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <PictoGlyph kind={kind} size={size} />
    </g>
  );
}

function PictoGlyph({ kind, size }: { kind: PictoKind; size: number }) {
  const s = size; // local alias for readability — drawing in [0..s] square
  switch (kind) {
    case 'port-voilier':
      // Lorient — mât + voile triangle + ligne d'eau
      return (
        <>
          <line x1={s * 0.5}  y1={s * 0.15} x2={s * 0.5}  y2={s * 0.85} />
          <path d={`M ${s * 0.5} ${s * 0.2} L ${s * 0.78} ${s * 0.7} L ${s * 0.5} ${s * 0.7} Z`} />
          <path d={`M ${s * 0.15} ${s * 0.92} q ${s * 0.18} -${s * 0.08} ${s * 0.35} 0 q ${s * 0.18} ${s * 0.08} ${s * 0.35} 0`} />
        </>
      );
    case 'chateau':
      // Vannes / Nantes — château crénelé
      return (
        <>
          <path d={`M ${s * 0.15} ${s * 0.9} L ${s * 0.15} ${s * 0.4} L ${s * 0.25} ${s * 0.4} L ${s * 0.25} ${s * 0.25} L ${s * 0.4} ${s * 0.25} L ${s * 0.4} ${s * 0.4} L ${s * 0.55} ${s * 0.4} L ${s * 0.55} ${s * 0.25} L ${s * 0.7} ${s * 0.25} L ${s * 0.7} ${s * 0.4} L ${s * 0.85} ${s * 0.4} L ${s * 0.85} ${s * 0.9} Z`} />
          <line x1={s * 0.3}  y1={s * 0.55} x2={s * 0.3}  y2={s * 0.75} />
          <line x1={s * 0.5}  y1={s * 0.55} x2={s * 0.5}  y2={s * 0.75} />
          <line x1={s * 0.7}  y1={s * 0.55} x2={s * 0.7}  y2={s * 0.75} />
        </>
      );
    case 'clocher':
      // Auray — petit clocher à flèche + croix
      return (
        <>
          {/* corps */}
          <rect x={s * 0.32} y={s * 0.45} width={s * 0.36} height={s * 0.45} />
          {/* flèche */}
          <path d={`M ${s * 0.32} ${s * 0.45} L ${s * 0.5} ${s * 0.15} L ${s * 0.68} ${s * 0.45} Z`} />
          {/* croix */}
          <line x1={s * 0.5} y1={s * 0.05} x2={s * 0.5} y2={s * 0.18} />
          <line x1={s * 0.42} y1={s * 0.1} x2={s * 0.58} y2={s * 0.1} />
          {/* porte */}
          <path d={`M ${s * 0.42} ${s * 0.9} L ${s * 0.42} ${s * 0.75} q 0 -${s * 0.1} ${s * 0.08} -${s * 0.1} q ${s * 0.08} 0 ${s * 0.08} ${s * 0.1} L ${s * 0.58} ${s * 0.9}`} />
        </>
      );
    case 'cathedrale':
      // Quimper — cathédrale à 2 flèches
      return (
        <>
          <rect x={s * 0.2} y={s * 0.5} width={s * 0.6} height={s * 0.4} />
          <path d={`M ${s * 0.2}  ${s * 0.5} L ${s * 0.32} ${s * 0.15} L ${s * 0.44} ${s * 0.5} Z`} />
          <path d={`M ${s * 0.56} ${s * 0.5} L ${s * 0.68} ${s * 0.15} L ${s * 0.8}  ${s * 0.5} Z`} />
          <line x1={s * 0.32} y1={s * 0.08} x2={s * 0.32} y2={s * 0.18} />
          <line x1={s * 0.68} y1={s * 0.08} x2={s * 0.68} y2={s * 0.18} />
        </>
      );
    case 'phare-bateau':
      // Brest — phare + petit bateau
      return (
        <>
          {/* phare */}
          <path d={`M ${s * 0.28} ${s * 0.9} L ${s * 0.34} ${s * 0.3} L ${s * 0.46} ${s * 0.3} L ${s * 0.52} ${s * 0.9} Z`} />
          <rect x={s * 0.3} y={s * 0.22} width={s * 0.2} height={s * 0.1} />
          <circle cx={s * 0.4} cy={s * 0.14} r={s * 0.05} />
          <line x1={s * 0.4} y1={s * 0.06} x2={s * 0.4} y2={s * 0.1} />
          {/* bateau */}
          <path d={`M ${s * 0.55} ${s * 0.85} q ${s * 0.1} -${s * 0.05} ${s * 0.32} 0`} />
          <path d={`M ${s * 0.58} ${s * 0.85} L ${s * 0.58} ${s * 0.65} L ${s * 0.78} ${s * 0.85}`} />
        </>
      );
    case 'port-peche':
      // Concarneau — coque + canne à pêche
      return (
        <>
          <path d={`M ${s * 0.1} ${s * 0.75} q ${s * 0.4} ${s * 0.15} ${s * 0.8} 0`} />
          <path d={`M ${s * 0.18} ${s * 0.78} L ${s * 0.18} ${s * 0.5} L ${s * 0.78} ${s * 0.5} L ${s * 0.78} ${s * 0.78}`} />
          {/* canne à pêche */}
          <line x1={s * 0.55} y1={s * 0.5} x2={s * 0.85} y2={s * 0.15} />
          {/* fil */}
          <path d={`M ${s * 0.85} ${s * 0.15} q ${s * 0.1} ${s * 0.15} 0 ${s * 0.3}`} strokeDasharray="1 2" />
        </>
      );
    case 'port-simple':
      // Saint-Brieuc — bateau à voile simple
      return (
        <>
          <path d={`M ${s * 0.15} ${s * 0.8} q ${s * 0.35} ${s * 0.12} ${s * 0.7} 0`} />
          <line x1={s * 0.5} y1={s * 0.15} x2={s * 0.5} y2={s * 0.8} />
          <path d={`M ${s * 0.5} ${s * 0.18} L ${s * 0.72} ${s * 0.55} L ${s * 0.5} ${s * 0.55} Z`} />
        </>
      );
    case 'porte-medievale':
      // Rennes — porte fortifiée
      return (
        <>
          {/* 2 tours */}
          <rect x={s * 0.1}  y={s * 0.3} width={s * 0.2} height={s * 0.6} />
          <rect x={s * 0.7}  y={s * 0.3} width={s * 0.2} height={s * 0.6} />
          {/* crenelage tours */}
          <path d={`M ${s * 0.1} ${s * 0.3} l 0 -${s * 0.08} l ${s * 0.07} 0 l 0 ${s * 0.08} M ${s * 0.23} ${s * 0.3} l 0 -${s * 0.08} l ${s * 0.07} 0 l 0 ${s * 0.08}`} />
          <path d={`M ${s * 0.7} ${s * 0.3} l 0 -${s * 0.08} l ${s * 0.07} 0 l 0 ${s * 0.08} M ${s * 0.83} ${s * 0.3} l 0 -${s * 0.08} l ${s * 0.07} 0 l 0 ${s * 0.08}`} />
          {/* arc porte */}
          <path d={`M ${s * 0.3} ${s * 0.9} L ${s * 0.3} ${s * 0.5} q 0 -${s * 0.2} ${s * 0.2} -${s * 0.2} q ${s * 0.2} 0 ${s * 0.2} ${s * 0.2} L ${s * 0.7} ${s * 0.9}`} />
        </>
      );
    default:
      return null;
  }
}

/**
 * Glyphe phare réutilisable (3 phares dans la carte).
 * Plus grand et plus expressif qu'un picto ville pour ressortir.
 */
export function LighthouseGlyph({ x, y, size = 28 }: { x: number; y: number; size?: number }) {
  const s = size;
  const tx = x - s / 2;
  const ty = y - s + 2;
  return (
    <g
      transform={`translate(${tx} ${ty})`}
      fill="none"
      stroke="var(--granit-800)"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* socle */}
      <path d={`M ${s * 0.3} ${s * 0.95} L ${s * 0.7} ${s * 0.95}`} />
      {/* fût conique */}
      <path d={`M ${s * 0.35} ${s * 0.95} L ${s * 0.42} ${s * 0.3} L ${s * 0.58} ${s * 0.3} L ${s * 0.65} ${s * 0.95} Z`} />
      {/* lanterne */}
      <rect x={s * 0.38} y={s * 0.18} width={s * 0.24} height={s * 0.12} />
      {/* dôme */}
      <path d={`M ${s * 0.38} ${s * 0.18} q ${s * 0.12} -${s * 0.12} ${s * 0.24} 0`} />
      {/* paratonnerre */}
      <line x1={s * 0.5} y1={s * 0.02} x2={s * 0.5} y2={s * 0.1} />
      {/* faisceau (rayons décoratifs) */}
      <line x1={s * 0.18} y1={s * 0.24} x2={s * 0.32} y2={s * 0.24} strokeDasharray="1 2" />
      <line x1={s * 0.68} y1={s * 0.24} x2={s * 0.82} y2={s * 0.24} strokeDasharray="1 2" />
    </g>
  );
}
