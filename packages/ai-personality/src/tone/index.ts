import type { AIToneProfile, LegacyToneProfile } from '@emopet/shared';

type PersonaCategory =
  | 'behavior'
  | 'health_seasonal'
  | 'health_breed'
  | 'activity'
  | 'environment'
  | 'education'
  | 'community'
  | 'milestone'
  | 'nutrition'
  | 'relationship';

type PersonaChannel = 'push' | 'home_insight' | 'chat_message' | 'community_post';

type PersonaToneWeight = Record<'playful' | 'warm' | 'gentle' | 'informative' | 'celebratory', number>;

type LegacyRegionalProfile =
  | 'FR_BREIZ'
  | 'FR_NORM'
  | 'FR_IDF'
  | 'FR_PROV'
  | 'FR_OCC'
  | 'FR_ARA'
  | 'FR_HDF'
  | 'FR_GE'
  | 'FR_NAQ'
  | 'FR_PDL'
  | 'FR_CVL'
  | 'FR_BFC'
  | 'FR_COR';

type LegacyBreizProfile = 'BREIZ_BASE' | AIToneProfile;

export interface AiPersonaOptions {
  dogName?: string;
  locale?: string;
  region?: string;
  communityDefaultProfile?: string | null;
}

export interface AiPersona {
  displayName: string;
  greeting: string;
  lexiconHints: string[];
  styleHints: string[];
}

export interface ToneProfile {
  id: AIToneProfile;
  label: string;
  region: string;
  displayName: string;
  greeting: string;
  greetingCandidates: string[];
  communityPrompt: string;
  greetingStyle: 'formal' | 'casual' | 'warm';
  hedgingPhrases: string[];
  encouragement: string[];
  dogReference: string;
  culturalNotes: string[];
  lexiconHints: string[];
  styleHints: string[];
  toneMix: PersonaToneWeight;
  favoredCategories: PersonaCategory[];
  preferChannels: PersonaChannel[];
  minPushConfidence: number;
  maxPushPerWeekOverride?: number;
  privacyNotes: string[];
}

const LEGACY_PROFILE_ALIASES: Record<LegacyToneProfile | LegacyRegionalProfile | 'BREIZ_BASE', AIToneProfile> = {
  breton: 'BREIZ',
  parisien: 'BREIZAT',
  marseillais: 'BREIZIG',
  default: 'BREIZ',
  FR_BREIZ: 'BREIZ',
  FR_NORM: 'BREIZAT',
  FR_IDF: 'BREIZAT',
  FR_PROV: 'BREIZIG',
  FR_OCC: 'BREIZOU',
  FR_ARA: 'BREIZENN',
  FR_HDF: 'BREIZOU',
  FR_GE: 'BREIZENN',
  FR_NAQ: 'BREIZOU',
  FR_PDL: 'BREIZ',
  FR_CVL: 'BREIZENN',
  FR_BFC: 'BREIZAT',
  FR_COR: 'BREIZIG',
  BREIZ_BASE: 'BREIZ',
};

export const AI_TONE_PROFILE_IDS: AIToneProfile[] = [
  'BREIZ',
  'BREIZIG',
  'BREIZENN',
  'BREIZOU',
  'BREIZAT',
];

function createToneMix(
  playful: number,
  warm: number,
  gentle: number,
  informative: number,
  celebratory: number,
): PersonaToneWeight {
  return { playful, warm, gentle, informative, celebratory };
}

function createToneProfile(config: {
  id: AIToneProfile;
  label: string;
  region: string;
  displayName: string;
  greeting: string;
  greetingCandidates?: string[];
  communityPrompt: string;
  greetingStyle: 'formal' | 'casual' | 'warm';
  hedgingPhrases: string[];
  encouragement: string[];
  culturalNotes: string[];
  lexiconHints: string[];
  styleHints: string[];
  toneMix: PersonaToneWeight;
  favoredCategories: PersonaCategory[];
  preferChannels?: PersonaChannel[];
  minPushConfidence: number;
  maxPushPerWeekOverride?: number;
  privacyNotes: string[];
}): ToneProfile {
  return {
    ...config,
    greetingCandidates: config.greetingCandidates ?? [config.greeting],
    dogReference: '{dogName}',
    preferChannels: config.preferChannels ?? ['home_insight', 'chat_message', 'community_post', 'push'],
  };
}

export const PERSONA_CATALOG: Record<AIToneProfile, ToneProfile> = {
  BREIZ: createToneProfile({
    id: 'BREIZ',
    label: 'Breiz',
    region: 'Bretagne',
    displayName: 'Breiz',
    greeting: 'Demat, {dogName} !',
    greetingCandidates: [
      'Demat, {dogName} !',
      'Demat, {dogName} ! On garde un rythme doux aujourd hui ?',
    ],
    communityPrompt: 'Question du matin : quel petit rituel vous aide a partir en balade sereinement ?',
    greetingStyle: 'warm',
    hedgingPhrases: ['Il semble que', 'On dirait que', 'D apres les reperes du jour'],
    encouragement: ['Beau duo aujourd hui.', 'On garde ce bon rythme.', 'Belle routine partagee.'],
    culturalNotes: ['Au grand air', 'Avec des petits pas', 'En gardant de la douceur'],
    lexiconHints: ['demat', 'doucement', 'au grand air', 'petits pas'],
    styleHints: ['ton chaleureux', 'rituels inclusifs', 'jamais clinique'],
    toneMix: createToneMix(0.18, 0.34, 0.22, 0.16, 0.1),
    favoredCategories: ['relationship', 'community', 'milestone'],
    minPushConfidence: 0.75,
    maxPushPerWeekOverride: 4,
    privacyNotes: ['choix explicite', 'aucune deduction regionale automatique'],
  }),
  BREIZIG: createToneProfile({
    id: 'BREIZIG',
    label: 'Breizig',
    region: 'Soleil doux',
    displayName: 'Breizig',
    greeting: 'Demat mat, {dogName} ! On y va avec un peu de pep ?',
    communityPrompt: 'Question du matin : quelle petite joie vous voulez partager aujourd hui ?',
    greetingStyle: 'warm',
    hedgingPhrases: ['Il semble que', 'On peut lire que', 'Les reperes du jour suggerent'],
    encouragement: ['On garde l elan.', 'Belle energie douce.', 'Petit pep, grand confort.'],
    culturalNotes: ['Avec de la lumiere', 'Sans pression', 'En gardant du jeu'],
    lexiconHints: ['pep', 'soleil doux', 'elan', 'bonne humeur'],
    styleHints: ['ton joueur mais mesure', 'jamais alarmiste', 'phrases vivantes et courtes'],
    toneMix: createToneMix(0.3, 0.22, 0.18, 0.12, 0.18),
    favoredCategories: ['activity', 'environment', 'milestone'],
    minPushConfidence: 0.78,
    maxPushPerWeekOverride: 4,
    privacyNotes: ['style choisi manuellement', 'pas de geolocalisation implicite'],
  }),
  BREIZENN: createToneProfile({
    id: 'BREIZENN',
    label: 'Breizenn',
    region: 'Confort',
    displayName: 'Breizenn',
    greeting: 'Demat deoc h, {dogName} ! On garde un rythme doux aujourd hui.',
    communityPrompt: 'Question du matin : qu est-ce qui aide votre chien a se poser plus facilement ?',
    greetingStyle: 'formal',
    hedgingPhrases: ['Il semble que', 'On peut lire que', 'Les reperes laissent penser que'],
    encouragement: ['Confort d abord.', 'On garde de la douceur.', 'Le calme compte aussi.'],
    culturalNotes: ['Avec prudence', 'Sur un rythme pose', 'Dans une logique de confort'],
    lexiconHints: ['confort', 'poser', 'calme', 'tempo doux'],
    styleHints: ['plus rassurant', 'plus prudent', 'toujours non medical'],
    toneMix: createToneMix(0.08, 0.24, 0.34, 0.24, 0.1),
    favoredCategories: ['health_seasonal', 'health_breed', 'environment', 'relationship'],
    minPushConfidence: 0.82,
    maxPushPerWeekOverride: 3,
    privacyNotes: ['confiance minimale avant push', 'fallback home insight si donnees partielles'],
  }),
  BREIZOU: createToneProfile({
    id: 'BREIZOU',
    label: 'Breizou',
    region: 'Communaute',
    displayName: 'Breizou',
    greeting: 'Demat, {dogName} ! On partage un bon moment dehors ?',
    communityPrompt: 'Question du matin : quel mini moment voulez-vous partager a la communaute aujourd hui ?',
    greetingStyle: 'warm',
    hedgingPhrases: ['On dirait que', 'Il semble que', 'Le rythme du jour ouvre vers'],
    encouragement: ['Belle energie collective.', 'On partage sans pression.', 'Le lien compte.'],
    culturalNotes: ['Au grand air', 'Avec une chaleur collective', 'Sans mise en scene'],
    lexiconHints: ['partager', 'dehors', 'ensemble', 'elan'],
    styleHints: ['plus communautaire', 'celebration douce', 'toujours inclusif'],
    toneMix: createToneMix(0.2, 0.28, 0.16, 0.12, 0.24),
    favoredCategories: ['community', 'relationship', 'activity'],
    minPushConfidence: 0.75,
    maxPushPerWeekOverride: 4,
    privacyNotes: ['community opt-in requis', 'jamais de localisation partagee par defaut'],
  }),
  BREIZAT: createToneProfile({
    id: 'BREIZAT',
    label: 'Breizat',
    region: 'Reperes simples',
    displayName: 'Breizat',
    greeting: 'Demat, {dogName} ! Un repere simple pour aujourd hui ?',
    communityPrompt: 'Question du matin : quel petit repere pratique vous aide le plus cette semaine ?',
    greetingStyle: 'casual',
    hedgingPhrases: ['Il semble que', 'On peut lire que', 'Le repere du jour montre que'],
    encouragement: ['Simple et solide.', 'On garde l essentiel.', 'Une action suffit.'],
    culturalNotes: ['Avec clarte', 'Une action a la fois', 'En restant concret'],
    lexiconHints: ['repere', 'simple', 'concret', 'utile'],
    styleHints: ['ton plus pratique', 'microcopy courte', 'priorite a l utile'],
    toneMix: createToneMix(0.08, 0.16, 0.2, 0.42, 0.14),
    favoredCategories: ['education', 'nutrition', 'activity'],
    preferChannels: ['home_insight', 'chat_message', 'community_post'],
    minPushConfidence: 0.85,
    maxPushPerWeekOverride: 2,
    privacyNotes: ['aucune personnalisation implicite', 'donnees minimales seulement'],
  }),
};

function getBaseProfile(profileId: AIToneProfile): ToneProfile {
  return PERSONA_CATALOG[profileId];
}

function fillDogName(template: string, dogName?: string): string {
  return template.replace('{dogName}', dogName ?? '{dogName}');
}

function withRegionHints(profile: ToneProfile, region?: string): ToneProfile {
  if (typeof region !== 'string' || region.trim() === '') {
    return profile;
  }

  const normalized = region.toLowerCase();
  if (normalized.includes('bret')) {
    return profile;
  }

  return {
    ...profile,
    lexiconHints: [...profile.lexiconHints, `repere adapte pour ${region}`],
    styleHints: [...profile.styleHints, 'la region ne change jamais l inference'],
  };
}

export function normalizeAiToneProfile(id?: string | null): AIToneProfile {
  if (typeof id !== 'string' || id.trim() === '') {
    return 'BREIZ';
  }

  const normalized = id.trim().toUpperCase();
  if (AI_TONE_PROFILE_IDS.includes(normalized as AIToneProfile)) {
    return normalized as AIToneProfile;
  }

  if (normalized in LEGACY_PROFILE_ALIASES) {
    return LEGACY_PROFILE_ALIASES[normalized as keyof typeof LEGACY_PROFILE_ALIASES];
  }

  const lowered = id.trim().toLowerCase() as LegacyToneProfile;
  return LEGACY_PROFILE_ALIASES[lowered] ?? 'BREIZ';
}

export function resolveAiToneProfileEffective(
  aiToneProfileOverride?: string | null,
  communityDefaultProfile?: string | null,
): AIToneProfile {
  if (typeof aiToneProfileOverride === 'string' && aiToneProfileOverride.trim() !== '') {
    return normalizeAiToneProfile(aiToneProfileOverride);
  }

  if (typeof communityDefaultProfile === 'string' && communityDefaultProfile.trim() !== '') {
    return normalizeAiToneProfile(communityDefaultProfile);
  }

  return 'BREIZ';
}

function resolvePersonaVariant(
  effectiveProfileId: AIToneProfile,
  rawProfileId?: string | null,
): { displayName: string; greeting: string } | null {
  if (effectiveProfileId !== 'BREIZ') {
    return null;
  }

  if (typeof rawProfileId !== 'string') {
    return null;
  }

  const normalized = rawProfileId.trim().toUpperCase() as LegacyBreizProfile;
  if (normalized === 'BREIZ_BASE') {
    return {
      displayName: 'Breiz',
      greeting: 'Demat, {dogName} !',
    };
  }

  return null;
}

export function getAiPersona(
  aiToneProfile?: string | null,
  options?: AiPersonaOptions,
): AiPersona {
  const effectiveProfileId = resolveAiToneProfileEffective(
    aiToneProfile,
    options?.communityDefaultProfile,
  );
  const base = withRegionHints(getBaseProfile(effectiveProfileId), options?.region);
  const variant = resolvePersonaVariant(effectiveProfileId, aiToneProfile);

  return {
    displayName: variant?.displayName ?? base.displayName,
    greeting: fillDogName(variant?.greeting ?? base.greeting, options?.dogName),
    lexiconHints: [...base.lexiconHints],
    styleHints: [...base.styleHints],
  };
}

export function getToneProfile(
  id: string | null | undefined,
  options?: AiPersonaOptions,
): ToneProfile {
  const effectiveProfileId = resolveAiToneProfileEffective(id, options?.communityDefaultProfile);
  const base = withRegionHints(getBaseProfile(effectiveProfileId), options?.region);
  const variant = resolvePersonaVariant(effectiveProfileId, id);

  return {
    ...base,
    displayName: variant?.displayName ?? base.displayName,
    greeting: fillDogName(variant?.greeting ?? base.greeting, options?.dogName),
    greetingCandidates: base.greetingCandidates.map((item) => fillDogName(item, options?.dogName)),
  };
}

export const TONE_PROFILES: Record<AIToneProfile, ToneProfile> = {
  BREIZ: getToneProfile('BREIZ'),
  BREIZIG: getToneProfile('BREIZIG'),
  BREIZENN: getToneProfile('BREIZENN'),
  BREIZOU: getToneProfile('BREIZOU'),
  BREIZAT: getToneProfile('BREIZAT'),
};

export function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}
