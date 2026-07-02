/**
 * Poids de confiance par catégorie. Servent à pondérer le consensus de l'arbitrage.
 * Valeurs par défaut prudentes ; un provider inconnu d'une catégorie reçoit
 * `DEFAULT_TRUST`. Ces poids reflètent la fiabilité de la SOURCE, pas une vérité.
 */

import type { ProviderCategory } from '../../api/types';

export const DEFAULT_TRUST = 0.5;

type TrustMap = Record<string, number>;

export const CATEGORY_TRUST: Partial<Record<ProviderCategory, TrustMap>> = {
  weather: {
    'open-meteo': 1.0,
    'met-no': 1.0,
    weatherapi: 0.6,
    openweathermap: 0.6,
    'pirate-weather': 0.6,
    'wttr-in': 0.3,
    'visual-crossing': 0.6,
    oikolab: 0.5,
    openuv: 0.6,
    rainviewer: 0.5,
    weatherbit: 0.6,
  },
  air_quality: {
    openaq: 1.0,
    aqicn: 0.8,
    iqair: 0.75,
    purpleair: 0.5,
    'pm25-open-data': 0.5,
    'breezometer-pollen': 0.6,
  },
  geocoding: {
    'adresse-data-gouv': 1.0,
    'geoapi-gouv': 1.0,
    geoapify: 0.6,
    'geocode-xyz': 0.3,
    'geodb-cities': 0.5,
    bigdatacloud: 0.5,
    ipstack: 0.2,
    ipapi: 0.2,
    countrystatecity: 0.4,
  },
  calendar: {
    'nager-date': 1.0,
    calendarific: 0.6,
    'non-working-days': 0.5,
    'google-calendar': 0.7,
  },
  translation: {
    libretranslate: 0.7,
    detectlanguage: 0.6,
  },
  email_validation: {
    disify: 0.7,
    eva: 0.65,
  },
};

/** Poids de confiance d'un provider dans une catégorie (0..1). */
export function trustWeight(category: string, provider: string): number {
  const map = CATEGORY_TRUST[category as ProviderCategory];
  return map?.[provider] ?? DEFAULT_TRUST;
}
