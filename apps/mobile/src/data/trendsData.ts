// EMOPET — 14-day trends mock data
// Pedagogical dataset: demonstrates 3-source rule by showing how
// reliability degradation correlates with declared events.

export type ReliabilityState = 'valid' | 'degraded' | 'suppressed';

export interface JournalEvent {
  kind: 'contexte' | 'promenade' | 'visite' | 'routine' | 'veto';
  text: string;
}

export interface DayPoint {
  dayOffset: number;       // 0 = today, -1 = yesterday, …, -13 = 14 days ago
  dateLabel: string;       // "Sam 18", etc.
  eli: number | null;      // null when SUPPRESSED
  state: ReliabilityState;
  validHours: number;      // hours of valid signal that day
  events: JournalEvent[];
  observed: string;        // sensor summary, always present
  interpretation: string | null; // Breiz interpretation or null
}

// Data tells a story:
// - Baseline: stable 0.38–0.45 (VALID)
// - Day -10: storm event → DEGRADED, rest fragmented
// - Day -7 to -6: user traveled, MAT left home → SUPPRESSED (no signal)
// - Day -3: vet visit declared → DEGRADED, known context
// - Today: back to VALID baseline

export const TRENDS_14D: DayPoint[] = [
  {
    dayOffset: -13, dateLabel: 'Sam 5',
    eli: 0.41, state: 'valid', validHours: 21.4,
    events: [],
    observed: 'MAT 98 % · TAG 92 % · signal 21h24',
    interpretation: null,
  },
  {
    dayOffset: -12, dateLabel: 'Dim 6',
    eli: 0.38, state: 'valid', validHours: 22.1,
    events: [{ kind: 'routine', text: 'Journée calme à la maison.' }],
    observed: 'MAT 99 % · TAG 94 % · signal 22h06',
    interpretation: null,
  },
  {
    dayOffset: -11, dateLabel: 'Lun 7',
    eli: 0.43, state: 'valid', validHours: 20.8,
    events: [{ kind: 'promenade', text: 'Plage de Gâvres, 50 min.' }],
    observed: 'MAT 96 % · TAG 89 % · signal 20h48',
    interpretation: null,
  },
  {
    dayOffset: -10, dateLabel: 'Mar 8',
    eli: 0.58, state: 'degraded', validHours: 18.2,
    events: [{ kind: 'contexte', text: 'Orage en soirée — fenêtres fermées.' }],
    observed: 'MAT 94 % · TAG 82 % · 4 interruptions nocturnes',
    interpretation: 'Charge élevée cohérente avec le contexte déclaré.',
  },
  {
    dayOffset: -9, dateLabel: 'Mer 9',
    eli: 0.49, state: 'valid', validHours: 21.2,
    events: [{ kind: 'visite', text: 'Invités · deux enfants bruyants.' }],
    observed: 'MAT 97 % · TAG 91 % · signal 21h12',
    interpretation: null,
  },
  {
    dayOffset: -8, dateLabel: 'Jeu 10',
    eli: 0.42, state: 'valid', validHours: 22.4,
    events: [],
    observed: 'MAT 99 % · TAG 95 % · signal 22h24',
    interpretation: null,
  },
  {
    dayOffset: -7, dateLabel: 'Ven 11',
    eli: null, state: 'suppressed', validHours: 2.1,
    events: [{ kind: 'contexte', text: 'Week-end à Quiberon.' }],
    observed: 'MAT éteint · TAG 68 %',
    interpretation: null,
  },
  {
    dayOffset: -6, dateLabel: 'Sam 12',
    eli: null, state: 'suppressed', validHours: 0.0,
    events: [],
    observed: 'MAT éteint · TAG hors portée',
    interpretation: null,
  },
  {
    dayOffset: -5, dateLabel: 'Dim 13',
    eli: 0.44, state: 'valid', validHours: 19.8,
    events: [{ kind: 'contexte', text: 'Retour à la maison.' }],
    observed: 'MAT 95 % · TAG 88 % · signal 19h48',
    interpretation: null,
  },
  {
    dayOffset: -4, dateLabel: 'Lun 14',
    eli: 0.40, state: 'valid', validHours: 22.6,
    events: [],
    observed: 'MAT 99 % · TAG 96 % · signal 22h36',
    interpretation: null,
  },
  {
    dayOffset: -3, dateLabel: 'Mar 15',
    eli: 0.52, state: 'degraded', validHours: 17.8,
    events: [{ kind: 'veto', text: 'Visite vétérinaire · rappel vaccins.' }],
    observed: 'MAT 92 % · TAG 78 % · 2h absence (rendez-vous)',
    interpretation: 'Charge élevée cohérente avec la visite déclarée.',
  },
  {
    dayOffset: -2, dateLabel: 'Mer 16',
    eli: 0.39, state: 'valid', validHours: 21.9,
    events: [],
    observed: 'MAT 98 % · TAG 93 % · signal 21h54',
    interpretation: null,
  },
  {
    dayOffset: -1, dateLabel: 'Jeu 17',
    eli: 0.45, state: 'degraded', validHours: 6.2,
    events: [],
    observed: 'MAT 99 % · TAG 42 % · contact partiel 18h',
    interpretation: 'Contact TAG dégradé — ajustement du collier à vérifier.',
  },
  {
    dayOffset: 0, dateLabel: "Aujourd'hui",
    eli: 0.42, state: 'valid', validHours: 6.2, // up to 9:41 AM
    events: [],
    observed: 'MAT 98 % · TAG 91 % · signal 6h12 (en cours)',
    interpretation: null,
  },
];

// Summary aggregates (for stat row)
export const TRENDS_SUMMARY = {
  eliAvg: 0.44,           // mean across VALID + DEGRADED days
  daysValid: 10,
  daysDegraded: 3,
  daysSuppressed: 2,
  eventsCount: TRENDS_14D.reduce((acc, d) => acc + d.events.length, 0),
};

// ─── Event styling (colors + labels) ───────────────────────────────
import { T } from '@/tokens';

export const EVENT_COLORS: Record<JournalEvent['kind'], string> = {
  contexte:  T.colors.eliDegraded,
  promenade: T.colors.accent2,
  visite:    T.colors.fg2,
  routine:   T.colors.borderStrong,
  veto:      T.colors.accent,
};

export const EVENT_LABELS: Record<JournalEvent['kind'], string> = {
  contexte:  'Contexte',
  promenade: 'Promenade',
  visite:    'Visite',
  routine:   'Routine',
  veto:      'Vétérinaire',
};
