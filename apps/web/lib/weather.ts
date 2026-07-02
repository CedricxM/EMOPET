/**
 * Météo réelle via Open-Meteo (Réalité R2) — open data, sans clé API.
 * Données © Open-Meteo (CC-BY 4.0).
 *
 * Sert au contexte des balades (carnet) et à l'affichage local.
 */

export interface CurrentWeather {
  tempC: number;
  code: number;
  label: string;
  windKph: number;
  time: string;
}

export interface DailyWeather {
  date: string;
  code: number;
  label: string;
  maxC: number;
  minC: number;
}

/** WMO weather code → libellé français court. */
export function weatherLabel(code: number): string {
  if (code === 0) return 'Ciel dégagé';
  if (code === 1) return 'Plutôt dégagé';
  if (code === 2) return 'Partiellement nuageux';
  if (code === 3) return 'Couvert';
  if (code === 45 || code === 48) return 'Brouillard';
  if (code >= 51 && code <= 57) return 'Bruine';
  if (code >= 61 && code <= 67) return 'Pluie';
  if (code >= 71 && code <= 77) return 'Neige';
  if (code >= 80 && code <= 82) return 'Averses';
  if (code === 85 || code === 86) return 'Averses de neige';
  if (code >= 95) return 'Orage';
  return 'Variable';
}

const BASE = 'https://api.open-meteo.com/v1/forecast';
const currentCache = new Map<string, CurrentWeather>();

function key(lat: number, lon: number): string {
  return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}

/** Météo actuelle pour un point. Renvoie null en cas d'échec réseau. */
export async function fetchCurrentWeather(lat: number, lon: number, signal?: AbortSignal): Promise<CurrentWeather | null> {
  const k = key(lat, lon);
  const cached = currentCache.get(k);
  if (cached) return cached;
  try {
    const url = `${BASE}?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto`;
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const j = (await res.json()) as { current?: { temperature_2m: number; weather_code: number; wind_speed_10m: number; time: string } };
    if (!j.current) return null;
    const cw: CurrentWeather = {
      tempC: Math.round(j.current.temperature_2m),
      code: j.current.weather_code,
      label: weatherLabel(j.current.weather_code),
      windKph: Math.round(j.current.wind_speed_10m),
      time: j.current.time,
    };
    currentCache.set(k, cw);
    return cw;
  } catch {
    return null;
  }
}

/** Prévisions journalières (N jours). Renvoie [] en cas d'échec. */
export async function fetchForecast(lat: number, lon: number, days = 3, signal?: AbortSignal): Promise<DailyWeather[]> {
  try {
    const url = `${BASE}?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=${days}`;
    const res = await fetch(url, { signal });
    if (!res.ok) return [];
    const j = (await res.json()) as { daily?: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[] } };
    const d = j.daily;
    if (!d) return [];
    return d.time.map((date, i) => ({
      date,
      code: d.weather_code[i] ?? 0,
      label: weatherLabel(d.weather_code[i] ?? 0),
      maxC: Math.round(d.temperature_2m_max[i] ?? 0),
      minC: Math.round(d.temperature_2m_min[i] ?? 0),
    }));
  } catch {
    return [];
  }
}
