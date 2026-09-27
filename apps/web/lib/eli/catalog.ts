/**
 * RSI prototype thresholds.
 * PROTOTYPE ONLY / NOT PRODUCT OR SCIENTIFIC AUTHORITY (#91).
 * No controlled "ELI v6 §8" authority has been recovered for 80/50 or the
 * three-day publication rule.
 */
export const RSI_STABLE_THRESHOLD = 80;
export const RSI_ALERT_THRESHOLD = 50;

/** 5 sous-baselines contextuelles (ELI v6 §4). Comparer au bon contexte. */
export interface SubBaselineMeta {
  id: string;
  label: string;
  description: string;
}
export const SUB_BASELINES: SubBaselineMeta[] = [
  { id: 'deep_rest_mat', label: 'Repos profond (MAT)', description: 'Nuit, présence MAT >30 min, immobilité élevée — fenêtres Gold uniquement.' },
  { id: 'light_rest_mat', label: 'Repos léger (MAT)', description: 'Journée, présence MAT, immobilité moyenne.' },
  { id: 'owner_present', label: 'Propriétaire présent', description: 'Téléphone détecté, activité normale.' },
  { id: 'owner_absent', label: 'Propriétaire absent', description: 'Téléphone non détecté >15 min.' },
  { id: 'daytime_active', label: 'Activité diurne', description: 'Hors MAT, journée, activité modérée.' },
];

/** Message factuel de dérive prolongée (baseline freeze >30 j, ELI v6 §9). NON médical. */
export function driftMessage(dogName: string): string {
  return `Les signaux de ${dogName} ne sont pas revenus à leur profil habituel depuis un mois. Vous pouvez en parler à votre vétérinaire.`;
}
