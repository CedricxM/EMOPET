'use client';

import { useEffect, useState } from 'react';

/**
 * Soleil / Lune positionné selon l'heure courante.
 *
 * - 06h → 20h : soleil terracotta-500, arc de gauche à droite, apogée à 13h
 * - 20h → 06h : lune cream-300, arc inverse
 *
 * Lit `Date` côté client uniquement (useEffect) pour éviter tout mismatch
 * d'hydratation SSR/CSR. Rendu vide tant que pas hydraté.
 */
export function SunMoon() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    // Refresh tous les 5min pour suivre la course du soleil sans bouffer le CPU
    const id = setInterval(() => setNow(new Date()), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null;

  const hour = now.getHours() + now.getMinutes() / 60;
  const isDay = hour >= 6 && hour < 20;

  // Position normalisée [0..1] sur l'arc
  let t: number;
  if (isDay) {
    t = (hour - 6) / 14; // 0 à 6h, 1 à 20h
  } else {
    const nightHour = hour < 6 ? hour + 4 : hour - 20; // 0 à 20h, 10 à 6h
    t = nightHour / 10;
  }

  // Arc dans le viewBox 0..1000 horizontal, sommet vers y=40, départ/fin à y=120
  const x = 120 + t * 760;          // marges latérales 120
  const y = 120 - Math.sin(t * Math.PI) * 90; // peak ~30, base ~120

  return (
    <g
      className="emopet-celestial"
      role="img"
      aria-label={isDay ? `Soleil — ${hour.toFixed(1)}h` : `Lune — ${hour.toFixed(1)}h`}
    >
      {isDay ? <Sun x={x} y={y} /> : <Moon x={x} y={y} />}
    </g>
  );
}

function Sun({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {/* Rayons (rotation lente) */}
      <g className="emopet-celestial-rays" stroke="var(--terracotta-500)" strokeWidth={1.2} strokeLinecap="round" opacity={0.55}>
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i * Math.PI) / 4;
          const x1 = Math.cos(a) * 15;
          const y1 = Math.sin(a) * 15;
          const x2 = Math.cos(a) * 22;
          const y2 = Math.sin(a) * 22;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
        })}
      </g>
      <circle cx={0} cy={0} r={11} fill="var(--terracotta-400)" stroke="var(--terracotta-700)" strokeWidth={0.8} />
      <circle cx={0} cy={0} r={6} fill="var(--terracotta-200)" opacity={0.7} />
    </g>
  );
}

function Moon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {/* Disque lune + croissant via 2 cercles superposés */}
      <circle cx={0} cy={0} r={11} fill="var(--cream-200)" stroke="var(--granit-500)" strokeWidth={0.8} />
      <circle cx={4} cy={-2} r={9} fill="var(--cream-50)" opacity={0.95} />
      {/* Petites étoiles autour */}
      <g fill="var(--granit-400)" opacity={0.7}>
        <circle cx={-22} cy={-8}  r={0.8} />
        <circle cx={ 18} cy={-14} r={0.6} />
        <circle cx={-14} cy={ 12} r={0.6} />
        <circle cx={ 24} cy={ 10} r={0.8} />
      </g>
    </g>
  );
}
