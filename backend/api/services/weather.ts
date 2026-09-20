/**
 * Weather Context Service
 *
 * Fetches daily weather for the dog's location using OpenWeatherMap free tier.
 * Used by Bleiz/Freemium scheduler to contextualize messages.
 *
 * API: OpenWeatherMap free tier (1000 calls/day)
 */

import type { WeatherData } from '@emopet/shared';
import { db } from '../../db/index.js';
import { weatherContext } from '../../db/schema/index.js';
import { eq, and } from 'drizzle-orm';

const OWM_API_KEY = process.env['OPENWEATHERMAP_API_KEY'] ?? '';
const OWM_BASE = 'https://api.openweathermap.org/data/2.5/weather';

// ─── Known Locations ────────────────────────────────────────────────

const KNOWN_LOCATIONS: Record<string, { lat: number; lon: number }> = {
  lorient: { lat: 47.7483, lon: -3.3702 },
  lanester: { lat: 47.7627, lon: -3.3431 },
  hennebont: { lat: 47.8047, lon: -3.2802 },
  ploemeur: { lat: 47.7336, lon: -3.4280 },
  vannes: { lat: 47.6583, lon: -2.7600 },
  quimper: { lat: 47.9960, lon: -4.1024 },
  brest: { lat: 48.3905, lon: -4.4861 },
  rennes: { lat: 48.1173, lon: -1.6778 },
  nantes: { lat: 47.2184, lon: -1.5536 },
  paris: { lat: 48.8566, lon: 2.3522 },
  lyon: { lat: 45.7640, lon: 4.8357 },
  marseille: { lat: 43.2965, lon: 5.3698 },
  bordeaux: { lat: 44.8378, lon: -0.5792 },
  toulouse: { lat: 43.6047, lon: 1.4442 },
  lille: { lat: 50.6292, lon: 3.0573 },
  strasbourg: { lat: 48.5734, lon: 7.7521 },
  nice: { lat: 43.7102, lon: 7.2620 },
  montpellier: { lat: 43.6108, lon: 3.8767 },
};

// ─── Fetch Weather ──────────────────────────────────────────────────

export interface FetchWeatherResult {
  data: WeatherData | null;
  fromCache: boolean;
  error?: string;
}

/**
 * Fetch weather for a location. Checks cache first (same-day),
 * then calls OpenWeatherMap API.
 */
export async function fetchWeather(
  locationKey: string,
  lat?: number,
  lon?: number,
): Promise<FetchWeatherResult> {
  const today = new Date().toISOString().split('T')[0]!;

  // Check cache
  const [cached] = await db
    .select()
    .from(weatherContext)
    .where(and(eq(weatherContext.locationKey, locationKey), eq(weatherContext.date, today)))
    .limit(1);

  if (cached) {
    return {
      data: {
        locationKey: cached.locationKey,
        date: cached.date,
        temperatureC: cached.temperatureC,
        feelsLikeC: cached.feelsLikeC,
        humidityPct: cached.humidityPct,
        windSpeedMs: cached.windSpeedMs,
        weatherCondition: cached.weatherCondition,
        uvIndex: cached.uvIndex,
      },
      fromCache: true,
    };
  }

  // Resolve coordinates
  const coords = lat != null && lon != null
    ? { lat, lon }
    : KNOWN_LOCATIONS[locationKey.toLowerCase()];

  if (!coords) {
    return { data: null, fromCache: false, error: `Unknown location: ${locationKey}` };
  }

  if (!OWM_API_KEY) {
    return { data: null, fromCache: false, error: 'OPENWEATHERMAP_API_KEY not configured' };
  }

  try {
    const url = `${OWM_BASE}?lat=${coords.lat}&lon=${coords.lon}&units=metric&appid=${OWM_API_KEY}`;
    const res = await fetch(url);

    if (!res.ok) {
      return { data: null, fromCache: false, error: `OWM API error: ${res.status}` };
    }

    const json = await res.json() as {
      main: { temp: number; feels_like: number; humidity: number };
      wind: { speed: number };
      weather: Array<{ main: string }>;
    };

    const weatherData: WeatherData = {
      locationKey,
      date: today,
      temperatureC: json.main.temp,
      feelsLikeC: json.main.feels_like,
      humidityPct: json.main.humidity,
      windSpeedMs: json.wind.speed,
      weatherCondition: json.weather[0]?.main?.toLowerCase() ?? null,
      uvIndex: null, // UV requires OneCall API (paid tier)
    };

    // Store in cache
    await db.insert(weatherContext).values({
      locationKey,
      date: today,
      temperatureC: weatherData.temperatureC,
      feelsLikeC: weatherData.feelsLikeC,
      humidityPct: weatherData.humidityPct,
      windSpeedMs: weatherData.windSpeedMs,
      weatherCondition: weatherData.weatherCondition,
      uvIndex: weatherData.uvIndex,
    }).onConflictDoNothing();

    return { data: weatherData, fromCache: false };
  } catch (err) {
    return { data: null, fromCache: false, error: String(err) };
  }
}

// ─── Weather Triggers ───────────────────────────────────────────────

export interface WeatherTrigger {
  type: 'heat' | 'cold' | 'storm' | 'uv';
  severity: 'info' | 'attention' | 'urgent';
  message: string;
}

/**
 * Evaluate weather data against breed-specific thresholds.
 * Returns triggers that should influence content selection.
 */
export function evaluateWeatherTriggers(
  weather: WeatherData,
  heatAlertThresholdC?: number | null,
): WeatherTrigger[] {
  const triggers: WeatherTrigger[] = [];

  const heatThreshold = heatAlertThresholdC ?? 25;

  if (weather.temperatureC != null) {
    // Heat alerts
    if (weather.temperatureC >= heatThreshold + 8) {
      triggers.push({
        type: 'heat',
        severity: 'urgent',
        message: `Température extrême : ${weather.temperatureC}°C`,
      });
    } else if (weather.temperatureC >= heatThreshold + 3) {
      triggers.push({
        type: 'heat',
        severity: 'attention',
        message: `Chaleur importante : ${weather.temperatureC}°C`,
      });
    } else if (weather.temperatureC >= heatThreshold) {
      triggers.push({
        type: 'heat',
        severity: 'info',
        message: `Température élevée : ${weather.temperatureC}°C`,
      });
    }

    // Cold alerts
    if (weather.temperatureC <= -10) {
      triggers.push({
        type: 'cold',
        severity: 'urgent',
        message: `Froid extrême : ${weather.temperatureC}°C`,
      });
    } else if (weather.temperatureC <= 0) {
      triggers.push({
        type: 'cold',
        severity: 'attention',
        message: `Gel : ${weather.temperatureC}°C`,
      });
    }
  }

  // Wind/storm
  if (weather.windSpeedMs != null && weather.windSpeedMs > 13.9) {
    // >50 km/h
    triggers.push({
      type: 'storm',
      severity: weather.windSpeedMs > 20.8 ? 'urgent' : 'attention',
      message: `Vent fort : ${Math.round(weather.windSpeedMs * 3.6)} km/h`,
    });
  }

  // UV
  if (weather.uvIndex != null && weather.uvIndex > 6) {
    triggers.push({
      type: 'uv',
      severity: weather.uvIndex > 8 ? 'attention' : 'info',
      message: `UV élevé : ${weather.uvIndex}`,
    });
  }

  return triggers;
}
