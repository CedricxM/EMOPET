'use client';

/**
 * LivingWorldScene — décor vivant du World (Phase 2).
 *
 * Backdrop SVG + CSS animé, posé DERRIÈRE la grille de tuiles. Donne envie
 * d'être regardé même sans interaction :
 *  - ciel à dégradé selon un cycle jour/nuit doux (heure réelle)
 *  - mer calme en bordure basse avec écume légère
 *  - herbes de dune qui ondulent
 *  - oiseaux qui dérivent occasionnellement
 *  - lanternes qui se réchauffent le soir
 *
 * Esthétique EMOPET stricte (navy/cream/teal/orange, formes douces, côte
 * bretonne). Aucune donnée, aucun score : pur décor. Respecte
 * `prefers-reduced-motion` (version statique élégante).
 *
 * Performance : SVG léger, animations CSS (compositées : transform/opacity),
 * pas de rAF JS. Le composant est lazy-loadé par le World.
 */

import { useEffect, useState } from 'react';
import styles from './living-world.module.css';

type Phase = 'day' | 'golden' | 'dusk' | 'night';

function phaseForHour(h: number): Phase {
  if (h >= 7 && h < 17) return 'day';
  if (h >= 17 && h < 20) return 'golden';
  if (h >= 20 && h < 22) return 'dusk';
  return 'night';
}

const SKY: Record<Phase, [string, string]> = {
  day: ['#BFE9E5', '#F6EFE7'], // teal pâle → cream
  golden: ['#FFC7B9', '#F6EFE7'], // orange doux → cream
  dusk: ['#6B6F9F', '#E5B29D'], // mauve → terracotta pâle
  night: ['#14123A', '#2E2B83'], // navy profond → navy
};

export function LivingWorldScene() {
  const [phase, setPhase] = useState<Phase>('day');

  useEffect(() => {
    const update = () => setPhase(phaseForHour(new Date().getHours()));
    update();
    const id = setInterval(update, 5 * 60 * 1000); // recalcule toutes les 5 min
    return () => clearInterval(id);
  }, []);

  const [skyTop, skyBottom] = SKY[phase];
  const lanternsOn = phase === 'dusk' || phase === 'night';

  return (
    <svg
      className={styles.scene}
      data-phase={phase}
      viewBox="0 0 400 240"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Décor côtier breton vivant — ciel, mer et dune au fil de la journée"
    >
      <defs>
        <linearGradient id="lw-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={skyTop} />
          <stop offset="100%" stopColor={skyBottom} />
        </linearGradient>
        <linearGradient id="lw-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--emopet-teal)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--emopet-navy)" stopOpacity="0.72" />
        </linearGradient>
      </defs>

      {/* Ciel */}
      <rect x="0" y="0" width="400" height="240" fill="url(#lw-sky)" />

      {/* Soleil / Lune selon la phase */}
      <circle
        className={styles.celestial}
        cx={phase === 'night' ? 320 : 300}
        cy={phase === 'day' ? 48 : phase === 'golden' ? 84 : 64}
        r={phase === 'night' ? 13 : 18}
        fill={phase === 'night' ? '#F6EFE7' : phase === 'golden' ? '#FFD9B0' : '#FFF3E0'}
        opacity={phase === 'night' ? 0.85 : 0.92}
      />

      {/* Oiseaux qui dérivent (cachés en reduced-motion via CSS) */}
      <g className={styles.birds} fill="none" stroke="var(--emopet-navy)" strokeWidth="1.4" strokeLinecap="round" opacity="0.5">
        <path d="M0 0 q 4 -4 8 0 q 4 -4 8 0" transform="translate(60 50)" />
        <path d="M0 0 q 3 -3 6 0 q 3 -3 6 0" transform="translate(96 64)" />
        <path d="M0 0 q 3.5 -3.5 7 0 q 3.5 -3.5 7 0" transform="translate(132 44)" />
      </g>

      {/* Dune + herbes qui ondulent */}
      <path d="M0 188 Q 120 168 240 184 T 400 178 L400 240 L0 240 Z" fill="var(--cream-300)" />
      <g className={styles.grass} stroke="var(--lichen-600)" strokeWidth="2" strokeLinecap="round">
        {Array.from({ length: 14 }, (_, i) => {
          const x = 14 + i * 27;
          return <line key={i} x1={x} y1="190" x2={x + (i % 2 ? 3 : -3)} y2="176" style={{ ['--g' as string]: String(i % 4) }} />;
        })}
      </g>

      {/* Mer calme avec vagues + écume */}
      <g className={styles.sea}>
        <rect x="0" y="206" width="400" height="34" fill="url(#lw-sea)" />
        <path className={styles.wave} d="M0 210 q 25 -5 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0" fill="none" stroke="var(--cream-50)" strokeWidth="1.5" opacity="0.6" />
        <path className={styles.waveSlow} d="M0 218 q 30 -4 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0" fill="none" stroke="var(--cream-50)" strokeWidth="1.2" opacity="0.4" />
      </g>

      {/* Lanternes (s'allument le soir) */}
      {lanternsOn && (
        <g className={styles.lanterns}>
          <circle cx="40" cy="176" r="4" fill="var(--emopet-orange)" opacity="0.85" />
          <circle cx="360" cy="172" r="4" fill="var(--emopet-orange)" opacity="0.85" />
        </g>
      )}
    </svg>
  );
}
