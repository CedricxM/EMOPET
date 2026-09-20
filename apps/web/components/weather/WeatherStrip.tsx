'use client';

/**
 * Bandeau météo réelle (Réalité R2) — Open-Meteo, actuel + 3 jours.
 * Contexte des balades. Données ouvertes, aucune interprétation médicale.
 *
 * Trois états distincts, jamais deux : chargement, données, indisponible. Une
 * source qui n'a pas répondu se dit ; elle ne reste pas en « Chargement… ».
 */

import { useEffect, useState } from 'react';
import { fetchCurrentWeather, fetchForecast, settleCurrentWeather, settleForecast } from '../../lib/weather';
import type { CurrentWeather, DailyWeather, SettledWeather } from '../../lib/weather';

const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export function WeatherStrip({ lat, lon, placeLabel }: { lat: number; lon: number; placeLabel: string }) {
  const [current, setCurrent] = useState<SettledWeather<CurrentWeather> | null>(null);
  const [forecast, setForecast] = useState<SettledWeather<DailyWeather[]> | null>(null);

  useEffect(() => {
    // Pas d'abort : Open-Meteo répond vite et l'annulation fausse le résultat
    // (StrictMode). Un drapeau suffit pour ne pas setstate après démontage.
    let cancelled = false;
    Promise.all([
      fetchCurrentWeather(lat, lon),
      fetchForecast(lat, lon, 3),
    ]).then(([c, f]) => {
      if (cancelled) return;
      setCurrent(settleCurrentWeather(c));
      setForecast(settleForecast(f));
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
        {current === null ? (
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--fg-muted)' }}>Chargement…</span>
        ) : current.status === 'ok' ? (
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--fg-strong)' }}>
            <strong style={{ fontFamily: 'var(--font-serif)', fontSize: 22 }}>{current.data.tempC}°</strong> · {current.data.label} · vent {current.data.windKph} km/h
          </span>
        ) : (
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--fg-muted)' }}>
            Météo indisponible pour le moment.
          </span>
        )}
      </div>
      {forecast?.status === 'ok' && (
        <div style={{ display: 'flex', gap: 14, marginLeft: 'auto' }}>
          {forecast.data.map((d) => {
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
