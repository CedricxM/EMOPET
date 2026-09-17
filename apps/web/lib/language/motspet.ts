export type ClaimGuardLevel = 'BLOCK' | 'REVIEW' | 'STYLE';

export interface MotsPetEntry {
  conceptId: string;
  preferredFr: string;
  preferredEn: string;
  definition: string;
  guard: ClaimGuardLevel;
  forbiddenShortcuts: string[];
  regionalAdaptation: 'NONE' | 'LIMITED' | 'ALLOWED';
}

export const MOTSPET_ENTRIES: readonly MotsPetEntry[] = [
  {
    conceptId: 'ELS.UNKNOWN',
    preferredFr: "pas assez d’informations fiables",
    preferredEn: 'not enough reliable information',
    definition: 'The available evidence cannot support a stronger statement.',
    guard: 'STYLE',
    forbiddenShortcuts: ['tout va bien', 'everything is normal', 'probably fine'],
    regionalAdaptation: 'LIMITED',
  },
  {
    conceptId: 'ELS.ABSTENTION',
    preferredFr: 'attendre un signal plus clair',
    preferredEn: 'wait for a clearer signal',
    definition: 'EMOPET intentionally withholds an interpretation because the evidence is insufficient or unreliable.',
    guard: 'STYLE',
    forbiddenShortcuts: ['algorithm refuses', 'something is wrong'],
    regionalAdaptation: 'LIMITED',
  },
  {
    conceptId: 'ELS.EXTERNAL_CONTEXT',
    preferredFr: 'contexte extérieur',
    preferredEn: 'external context',
    definition: 'Sourced information such as weather, place, event, reference or cultural context.',
    guard: 'REVIEW',
    forbiddenShortcuts: ['measured by EMOPET', 'cause of dog state'],
    regionalAdaptation: 'ALLOWED',
  },
  {
    conceptId: 'LONG.BASELINE',
    preferredFr: 'ses repères habituels',
    preferredEn: 'usual pattern',
    definition: "The dog's own qualified longitudinal reference used for comparison.",
    guard: 'REVIEW',
    forbiddenShortcuts: ['normal for dogs', 'healthy normal'],
    regionalAdaptation: 'LIMITED',
  },
  {
    conceptId: 'LONG.CHANGE',
    preferredFr: 'un changement par rapport à ses habitudes',
    preferredEn: 'a change from the usual pattern',
    definition: 'A qualified difference relative to the personal longitudinal reference.',
    guard: 'REVIEW',
    forbiddenShortcuts: ['something is wrong', 'abnormal'],
    regionalAdaptation: 'LIMITED',
  },
  {
    conceptId: 'LONG.TREND',
    preferredFr: 'une évolution qui se dessine',
    preferredEn: 'a pattern that may be emerging',
    definition: 'A persistent qualified pattern across sufficient observations.',
    guard: 'REVIEW',
    forbiddenShortcuts: ['clear trend detected from one event'],
    regionalAdaptation: 'LIMITED',
  },
  {
    conceptId: 'REL.OWNER_REPORT',
    preferredFr: 'ce que vous avez remarqué',
    preferredEn: 'what you have noticed',
    definition: 'Guardian-reported context, not biological ground truth.',
    guard: 'REVIEW',
    forbiddenShortcuts: ['confirmed by EMOPET'],
    regionalAdaptation: 'LIMITED',
  },
] as const;

export function getMotsPetEntry(conceptId: string): MotsPetEntry | undefined {
  return MOTSPET_ENTRIES.find((entry) => entry.conceptId === conceptId);
}
