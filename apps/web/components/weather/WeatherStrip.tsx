'use client';

/**
 * Bandeau météo réelle (Réalité R2) — Open-Meteo, actuel + 3 jours.
 * Contexte des balades. Données ouvertes, aucune interprétation médicale.
 */

import { useEffect, useState } from 'react';
import { fetchCurrentWeather, fetchForecast } from '../../lib/weather';
import type { CurrentWeather, DailyWeather } from '../../lib/weather';

const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export function WeatherStrip({ lat, lon, placeLabel }: { lat: number; lon: number; placeLabel: string }) {
  const [current, setCurrent] = useState<CurrentWeather | null>(null);
  const [forecast, setForecast] = useState<DailyWeather[]>([]);

  useEffect(() => {
    // Pas d'abort : Open-Meteo répond vite et l'annulation fausse le résultat
    // (StrictMode). Un drapeau suffit pour ne pas setstate après démontage.
    let cancelled = false;
    Promise.all([
      fetchCurrentWeather(lat, lon),
      fetchForecast(lat, lon, 3),
    ]).then(([c, f]) => {
      if (cancelled) return;
      setCurrent(c);
      setForecast(f);
    });
    return () => { cancelled = true; };
  }, [lat, lon]);

  return (
    <div
      style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 18,
        padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--terracotta-700)' }}>
          ⊙ Météo · {placeLabel}
        </span>
        {current ? (
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--fg-strong)' }}>
            <strong style={{ fontFamily: 'var(--font-serif)', fontSize: 22 }}>{current.tempC}°</strong> · {current.label} · vent {current.windKph} km/h
          </span>
        ) : (
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--fg-muted)' }}>Chargement…</span>
        )}
      </div>
      {forecast.length > 0 && (
        <div style={{ display: 'flex', gap: 14, marginLeft: 'auto' }}>
          {forecast.map((d) => {
            const day = DAYS[new Date(`${d.date}T12:00`).getDay()];
            return (
              <div key={d.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase' }}>{day}</span>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg-strong)' }}>{d.maxC}°<span style={{ color: 'var(--fg-muted)' }}>/{d.minC}°</span></span>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: 'var(--fg-2)' }}>{d.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
