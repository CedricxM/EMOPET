/**
 * Bleiz v6 templates.
 *
 * Two new templates added in v6 (2026-04):
 *
 *   SEP_ANTICIPATION_DETECTED
 *     Triggered when anticipation_detected.detection_threshold_met flips
 *     to true for the first time or after 30 days since last delivery.
 *     Non-medical, never labels the dog. References McEwen + Homma &
 *     Masaoka via the computed trigger field, not in the visible text.
 *
 *   ALLO_RECOVERY_SLOWING
 *     Triggered when any sub-baseline's recovery_time 4-week trend
 *     exceeds +20%. Uses vet_disclaimer suffix per allostatic-load rules.
 */

import type { BleizTemplate } from './bleiz-content-templates.js';

function createTemplate(t: BleizTemplate): BleizTemplate {
  return t;
}

const V6_SEP_NEVER_SAY = [
  'anxiété de séparation',
  'anxieux',
  'trouble',
  'pathologique',
  'traumatisme',
  'diagnostic',
  'traitement',
];

const V6_ALLO_NEVER_SAY = [
  'charge allostatique',
  'stress chronique',
  'épuisement',
  'cortisol',
  'HPA',
  'diagnostic',
  'pathologique',
];

const VET_SUFFIX = 'Si cette tendance persiste, un échange avec votre vétérinaire peut être utile pour en discuter.';

export const SEP_ANTICIPATION_DETECTED: BleizTemplate = createTemplate({
  id: 'SEP_ANTICIPATION_DETECTED',
  category: 'behavior_education',
  channel: 'home_insight',
  priority: 78,
  // 30-day cooldown per spec ("first detection or monthly")
  cooldownHours: 30 * 24,
  weeklyBudget: 1,
  maxPerDay: 1,
  required_fields: [
    'dog.name',
    'sensor.anticipation_activity_ratio',
    'sensor.anticipation_occurrences_count',
    'sensor.anticipation_detection_threshold_met',
  ],
  triggers: [
    {
      type: 'computed',
      field: 'sensor.anticipation_detection_threshold_met',
      operator: 'eq',
      value: true,
      description: 'Pre-event activity ratio >1.5 with >=7 occurrences in 30d',
    },
  ],
  targeting: {},
  never_say: V6_SEP_NEVER_SAY,
  requires_hardware: true,
  safety: { requireNonMedical: true },
  tone: 'gentle',
  prompt: [
    "Rédige un home insight en français pour {{dog.name}}.",
    "Observation factuelle : son activité augmente dans les 15 minutes avant le départ matinal, et ce pattern s'est répété {{sensor.anticipation_occurrences_count}} fois sur le dernier mois.",
    "Ton chaleureux et prudent. Ne pas étiqueter d'émotion (pas d'anxieux, pas de trouble).",
    "Suggère une piste douce : varier la routine de sortie (ordre clés/chaussures/manteau) pour désamorcer les signaux annonciateurs.",
    "Rappelle que beaucoup de chiens développent cette anticipation.",
  ].join('\n'),
});

export const ALLO_RECOVERY_SLOWING: BleizTemplate = createTemplate({
  id: 'ALLO_RECOVERY_SLOWING',
  category: 'behavior_education',
  channel: 'home_insight',
  priority: 80,
  // 21-day cooldown per spec
  cooldownHours: 21 * 24,
  weeklyBudget: 1,
  maxPerDay: 1,
  required_fields: [
    'dog.name',
    'sensor.recovery_minutes_current',
    'sensor.recovery_minutes_baseline',
    'sensor.recovery_trend_4w_pct',
  ],
  triggers: [
    {
      type: 'computed',
      field: 'sensor.recovery_trend_4w_pct',
      operator: 'gt',
      value: 20,
      description: 'Any sub-baseline recovery_time 4-week trend > +20%',
    },
  ],
  targeting: {},
  never_say: V6_ALLO_NEVER_SAY,
  requires_hardware: true,
  suffix: VET_SUFFIX,
  safety: { requireNonMedical: true },
  tone: 'gentle',
  prompt: [
    "Rédige un home insight en français pour {{dog.name}}.",
    "Observation factuelle : le temps de retour au calme après les événements actifs (promenade, visite, bruit) s'est allongé ces dernières semaines.",
    "Il faut désormais ~{{sensor.recovery_minutes_current}} minutes contre ~{{sensor.recovery_minutes_baseline}} minutes auparavant.",
    "Ton prudent. Mentionner que cela peut arriver avec l'âge, les saisons, ou un changement de routine.",
    "Ne jamais employer les mots charge allostatique, stress chronique, épuisement.",
    "Terminer par le suffixe vétérinaire fourni.",
  ].join('\n'),
});

export const V6_BLEIZ_TEMPLATES: BleizTemplate[] = [
  SEP_ANTICIPATION_DETECTED,
  ALLO_RECOVERY_SLOWING,
];
