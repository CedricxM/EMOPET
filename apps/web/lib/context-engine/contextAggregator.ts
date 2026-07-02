/**
 * Agrégateur de contexte EMOPET. Compose des signaux ARBITRÉS en un `EMOPETContext`
 * prudent et NON MÉDICAL. La sortie porte toujours le tampon de politique : aucune
 * conclusion sur l'animal, aucun diagnostic, aucune inférence émotionnelle.
 *
 * `assembleContext` est pur (prend des signaux déjà arbitrés) → testable sans réseau.
 * L'orchestration live (appel des adaptateurs par catégorie → arbitrage) se branche
 * au-dessus, en réutilisant `activeProviders` du registre et les adaptateurs.
 */

import type { ArbitratedSignal, ContextSignal } from '../api/types';
import { POLICY_STAMP } from './policies/nonMedicalPolicy';
import { toNumericReadings } from './arbitration/evidenceResolver';
import { arbitrateNumeric } from './arbitration/contextArbitrator';

export interface ContextParts {
  locationContext?: ArbitratedSignal;
  weatherContext?: ArbitratedSignal;
  airQualityContext?: ArbitratedSignal;
  calendarContext?: ArbitratedSignal;
  dogKnowledgeContext?: ArbitratedSignal;
}

export interface EMOPETContext extends ContextParts {
  warnings: string[];
  confidence: number;
  policy: typeof POLICY_STAMP;
}

const UNCERTAIN_STATUSES = new Set<ArbitratedSignal['status']>(['conflicting_sources', 'insufficient_data', 'not_available', 'provider_error']);

/** Assemble un `EMOPETContext` à partir de signaux déjà arbitrés. Pur, tamponné politique. */
export function assembleContext(parts: ContextParts): EMOPETContext {
  const present = [parts.locationContext, parts.weatherContext, parts.airQualityContext, parts.calendarContext, parts.dogKnowledgeContext].filter(
    (x): x is ArbitratedSignal => Boolean(x),
  );

  const warnings: string[] = [];
  for (const p of present) {
    for (const w of p.warnings) warnings.push(`${p.category}: ${w}`);
    if (UNCERTAIN_STATUSES.has(p.status)) warnings.push(`${p.category}: contexte indisponible ou incertain`);
  }

  const confidence = present.length === 0 ? 0 : present.reduce((acc, p) => acc + p.confidence, 0) / present.length;

  return { ...parts, warnings, confidence: Math.round(confidence * 100) / 100, policy: POLICY_STAMP };
}

/**
 * Helper : arbitre la température (°C) depuis des signaux météo multi-providers.
 * Contexte numérique SÛR → consensus pondéré + retrait d'outliers.
 */
export function arbitrateWeatherTemperature(
  signals: ReadonlyArray<ContextSignal<{ tempC?: number }>>,
): ArbitratedSignal<number> {
  const readings = toNumericReadings(signals, 'weather', (v) => v.tempC);
  return arbitrateNumeric(readings, { category: 'weather', unit: '°C' });
}

/**
 * Helper : arbitre un polluant (µg/m³) depuis des signaux qualité d'air multi-providers.
 */
export function arbitrateAirQuality(
  signals: ReadonlyArray<ContextSignal<{ pm25?: number }>>,
): ArbitratedSignal<number> {
  const readings = toNumericReadings(signals, 'air_quality', (v) => v.pm25);
  return arbitrateNumeric(readings, { category: 'air_quality', unit: 'µg/m³' });
}
