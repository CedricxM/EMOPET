/**
 * Interprétation ELI consciente de la race (Partie B) — STRICTEMENT non médicale.
 *
 * Ne modifie JAMAIS la valeur mesurée ni le niveau de confiance. Renvoie
 * seulement une contextualisation : l'écart observé est-il attendu pour ce
 * profil (pelage déclaré, gabarit) et ce contexte (température/humidité) ?
 *
 * La déclaration du propriétaire (`furType`) est autoritaire. Si elle est `null`
 * et la race ne fournit pas de défaut vérifié, l'interprétation reste neutre.
 */

import type { ConfidenceState } from './catalog';
import type { SizeCategory } from '../breeds';

export interface InterpretationContext {
  /** Pelage déclaré par le propriétaire (prioritaire). */
  furType: 'court' | 'moyen' | 'long' | 'double' | null;
  /** Depuis la race si VERIFIED, sinon null. */
  sizeCategory?: SizeCategory | null;
  /** BME280. */
  ambientTempC?: number | null;
  ambientHumidity?: number | null;
}

export interface IndicatorInput {
  value: number;
  confidenceState: ConfidenceState;
  metric: 'activite' | 'repos' | 'regulation' | 'sociabilite';
  /** Sens de l'écart par rapport à la baseline. */
  deviation: 'below' | 'above' | 'none';
}

export interface ContextualInterpretation {
  rawValue: number; // inchangé
  confidenceState: ConfidenceState; // inchangé
  expectedGivenProfile: boolean;
  contextFactors: string[]; // faits uniquement (jamais médical/émotionnel)
}

const HEAT_THRESHOLD_C = 24;

/**
 * Contextualise un indicateur. Valeur et confiance ressortent inchangées.
 */
export function interpretWithContext(ind: IndicatorInput, ctx: InterpretationContext): ContextualInterpretation {
  const contextFactors: string[] = [];
  if (ctx.furType) contextFactors.push(`poil ${ctx.furType}`);
  if (ctx.ambientTempC != null) contextFactors.push(`${Math.round(ctx.ambientTempC)} °C`);
  if (ctx.ambientHumidity != null && ctx.ambientHumidity >= 70) contextFactors.push('humidité élevée');
  if (ctx.sizeCategory) contextFactors.push(`gabarit ${ctx.sizeCategory}`);

  let expectedGivenProfile = false;
  const hot = ctx.ambientTempC != null && ctx.ambientTempC >= HEAT_THRESHOLD_C;
  const insulating = ctx.furType === 'long' || ctx.furType === 'double';

  // Chaleur + poil isolant → baisse d'activité (ou hausse de repos) attendue.
  if (hot && insulating) {
    if (ind.metric === 'activite' && ind.deviation === 'below') expectedGivenProfile = true;
    if (ind.metric === 'repos' && ind.deviation === 'above') expectedGivenProfile = true;
  }
  // Aucune autre modulation. Sans pelage déclaré → neutre (expectedGivenProfile=false).

  return {
    rawValue: ind.value,
    confidenceState: ind.confidenceState,
    expectedGivenProfile,
    contextFactors,
  };
}
