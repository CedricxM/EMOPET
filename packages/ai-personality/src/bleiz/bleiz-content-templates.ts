import type { AIToneProfile } from '@emopet/shared';

export type BleizCategory =
  | 'behavior'
  | 'behavior_education'     // v6
  | 'health_seasonal'
  | 'health_breed'
  | 'activity'
  | 'environment'
  | 'education'
  | 'community'
  | 'milestone'
  | 'nutrition'
  | 'relationship';

export type BleizChannel =
  | 'push'
  | 'home_insight'
  | 'chat_message'
  | 'community_post';

export type BleizTone =
  | 'playful'
  | 'warm'
  | 'gentle'
  | 'informative'
  | 'celebratory';

export type ConfidenceGate = 'PUBLISH' | 'DEGRADE' | 'REJECT';

export type BleizTriggerKind =
  | 'sensor'
  | 'temporal'
  | 'breed'
  | 'community'
  | 'user'
  | 'milestone'
  | 'computed'
  | 'event';

export type TriggerOperator =
  | 'exists'
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'between'
  | 'contains';

export interface TriggerSpec {
  type: BleizTriggerKind;
  field: string;
  operator: TriggerOperator;
  value?: boolean | number | string | string[] | number[] | { min?: number; max?: number };
  description: string;
}

export interface SensorContext {
  mat_presence_today_min?: number;
  mat_sessions_count?: number;
  resting_rr_today?: number;
  resting_rr_baseline?: number;
  resting_rr_delta_pct?: number;
  pvdf_resting_signal_quality?: number;
  activity_km_today?: number;
  activity_km_7d_avg?: number;
  agitation_events_today?: number;
  vocal_events_today?: number;
  vocal_events_7d_avg?: number;
  pacing_minutes?: number;
  weather_alert_level?: number;
  weather_condition?: string;
  temperature_c?: number;
  humidity_pct?: number;
  hour?: number;
  day_of_week?: number;
  month?: number;
  season?: 'spring' | 'summer' | 'autumn' | 'winter';
  mat_streak_days?: number;
  personal_best_km?: number;
  weight_kg?: number;
  weight_delta_pct_30d?: number;
  post_meal_agitation?: number;
  weekend_mat_pct_higher?: number;
  data_days?: number;
  data_weeks?: number;
  days_with_valid_rest_data?: number;
  rest_rr_valid_today?: boolean;
  coverage_14d?: number;
  eli_confidence?: number;
  eli_gate?: ConfidenceGate;
  absent_vocal_events_per_hour?: number;
  present_vocal_events_per_hour?: number;
  absent_imu_agitation_index_mean?: number;
  present_imu_agitation_index_mean?: number;
  absent_mat_rest_min?: number;
  present_mat_rest_min?: number;
  absence_effect_size?: number;
  absence_confidence?: number;
}

export interface DogContext {
  id?: string;
  name: string;
  breed: string;
  size: 'toy' | 'small' | 'medium' | 'large' | 'giant';
  ageMonths: number;
  sex?: 'male' | 'female';
  sterilized?: boolean;
  is_brachycephalic?: boolean;
  morphology_flags?: string[];
  adoptionAnniversaryToday?: boolean;
}

export interface CommunityContext {
  communityId?: string;
  aiToneProfileDefault?: AIToneProfile;
  city?: string;
  language?: string;
  copresence_count?: number;
  copresence_days?: number;
  otherDogName?: string;
  otherDogBreed?: string;
  weekly_distance_goal?: number;
  weekly_distance_last?: number;
  owner_presence_calm_correlation?: number;
}

export interface UserContext {
  user_id?: string;
  aiToneProfile?: AIToneProfile | 'BREIZ_BASE';
  locale?: string;
  timezone?: string;
  region?: string;
  subscription_tier?: 'free' | 'trial' | 'kit' | 'premium';
  hardware_linked?: boolean;
  consents?: {
    location_opt_in: boolean;
    community_opt_in: boolean;
    vet_export_opt_in: boolean;
  };
  days_since_onboarding?: number;
  total_km?: number;
  total_insights?: number;
  treats_today_count?: number;
}

export interface BleizTargeting {
  breed?: string[];
  size?: Array<DogContext['size']>;
  ageMonths?: { min?: number; max?: number };
  seasons?: Array<NonNullable<SensorContext['season']>>;
}

export interface BleizTemplate {
  id: string;
  category: BleizCategory;
  channel: BleizChannel;
  priority: number;
  cooldownHours: number;
  weeklyBudget: number;
  maxPerDay?: number;
  required_fields: string[];
  triggers: TriggerSpec[];
  targeting: BleizTargeting;
  never_say: string[];
  requires_hardware?: boolean;
  suffix?: string;
  safety: {
    requireNonMedical: true;
    blacklistOverride?: string[];
  };
  tone: BleizTone;
  prompt: string;
}

export interface BleizContexts {
  sensor: SensorContext;
  dog: DogContext;
  user: UserContext;
  community?: CommunityContext;
}

function createTemplate(template: BleizTemplate): BleizTemplate {
  return template;
}

export const BEHAVIOR_TEMPLATES: BleizTemplate[] = [
  createTemplate({
    id: 'BHV_ANXIETY_PATTERN',
    category: 'behavior',
    channel: 'home_insight',
    priority: 84,
    cooldownHours: 72,
    weeklyBudget: 1,
    maxPerDay: 1,
    required_fields: [
      'dog.name',
      'sensor.activity_km_today',
      'sensor.activity_km_7d_avg',
      'sensor.mat_presence_today_min',
      'sensor.vocal_events_today',
      'sensor.vocal_events_7d_avg',
    ],
    triggers: [
      {
        type: 'sensor',
        field: 'sensor.activity_km_today',
        operator: 'gt',
        value: 5.5,
        description: 'Activity is clearly elevated today',
      },
      {
        type: 'sensor',
        field: 'sensor.mat_presence_today_min',
        operator: 'lt',
        value: 45,
        description: 'Rest on the mat is limited',
      },
      {
        type: 'sensor',
        field: 'sensor.vocal_events_today',
        operator: 'gt',
        value: 12,
        description: 'Vocal activity is above a calm day',
      },
    ],
    targeting: {},
    never_say: ['anxieux', 'stress', 'trouble', 'pathologique'],
    suffix: 'Si cela revient souvent, un veterinaire ou un educateur canin peut vous guider.',
    safety: { requireNonMedical: true },
    tone: 'gentle',
    prompt: [
      'Write a short home insight in French for {{dog.name}}.',
      'Observe a day with more movement, less mat rest, and more vocal activity than usual.',
      'Stay non-medical. Present simple soothing ideas for routine and enrichment.',
    ].join('\n'),
  }),
  createTemplate({
    id: 'BHV_BARK_SMALL',
    category: 'behavior',
    channel: 'chat_message',
    priority: 74,
    cooldownHours: 120,
    weeklyBudget: 1,
    maxPerDay: 1,
    required_fields: [
      'dog.name',
      'dog.breed',
      'dog.size',
      'sensor.vocal_events_today',
      'sensor.vocal_events_7d_avg',
    ],
    triggers: [
      {
        type: 'breed',
        field: 'dog.size',
        operator: 'in',
        value: ['toy', 'small'],
        description: 'This content is meant for smaller dogs',
      },
      {
        type: 'sensor',
        field: 'sensor.vocal_events_today',
        operator: 'gt',
        value: 18,
        description: 'Vocal activity is high today',
      },
    ],
    targeting: { size: ['toy', 'small'] },
    never_say: ['mal eduque', 'insupportable', 'punir'],
    safety: { requireNonMedical: true },
    tone: 'warm',
    prompt: [
      'Write a friendly chat message in French about a very vocal day for {{dog.name}}, a {{dog.breed}}.',
      'Normalize communication without labelling the dog.',
      'Offer one calm routine tip and one reward-based idea.',
    ].join('\n'),
  }),
  createTemplate({
    id: 'BHV_PACING_PATTERN',
    category: 'behavior',
    channel: 'home_insight',
    priority: 76,
    cooldownHours: 48,
    weeklyBudget: 2,
    required_fields: [
      'dog.name',
      'sensor.pacing_minutes',
      'sensor.activity_km_today',
      'sensor.agitation_events_today',
    ],
    triggers: [
      {
        type: 'sensor',
        field: 'sensor.pacing_minutes',
        operator: 'gt',
        value: 35,
        description: 'Back and forth movement is visible',
      },
      {
        type: 'sensor',
        field: 'sensor.activity_km_today',
        operator: 'lt',
        value: 1.5,
        description: 'Outdoor activity stayed low',
      },
    ],
    targeting: {},
    never_say: ['compulsif', 'stereotypie', 'anormal'],
    safety: { requireNonMedical: true },
    tone: 'gentle',
    prompt: [
      'Write a home insight in French for {{dog.name}} after many back-and-forth movements indoors.',
      'Keep the tone gentle and practical.',
      'Suggest one extra decompression idea without sounding clinical.',
    ].join('\n'),
  }),
  createTemplate({
    id: 'BHV_ABSENCE_AGITATION',
    category: 'behavior',
    channel: 'home_insight',
    priority: 82,
    cooldownHours: 96,
    weeklyBudget: 1,
    maxPerDay: 1,
    required_fields: [
      'dog.name',
      'sensor.absent_vocal_events_per_hour',
      'sensor.present_vocal_events_per_hour',
      'sensor.absent_imu_agitation_index_mean',
      'sensor.present_imu_agitation_index_mean',
      'sensor.absence_effect_size',
      'sensor.absence_confidence',
      'user.hardware_linked',
    ],
    triggers: [
      {
        type: 'sensor',
        field: 'sensor.absence_effect_size',
        operator: 'gt',
        value: 0.35,
        description: 'Difference between presence and absence is meaningful',
      },
      {
        type: 'sensor',
        field: 'sensor.absence_confidence',
        operator: 'gte',
        value: 0.6,
        description: 'Comparison confidence is good enough',
      },
    ],
    targeting: {},
    never_say: ['anxiete', 'stress', 'panique', 'trouble'],
    safety: { requireNonMedical: true },
    tone: 'gentle',
    prompt: [
      'Write a French home insight for {{dog.name}} comparing presence and absence periods.',
      'Say the dog tends to be more active or more vocal during absence, never anxious or stressed.',
      'Suggest one calmer departure routine and one enrichment idea.',
    ].join('\n'),
  }),
];

export const HEALTH_SEASONAL_TEMPLATES: BleizTemplate[] = [
  createTemplate({
    id: 'HSE_SPRING_CHECK',
    category: 'health_seasonal',
    channel: 'home_insight',
    priority: 95,
    cooldownHours: 720,
    weeklyBudget: 1,
    maxPerDay: 1,
    required_fields: ['dog.name', 'sensor.month', 'sensor.season'],
    triggers: [
      {
        type: 'temporal',
        field: 'sensor.season',
        operator: 'eq',
        value: 'spring',
        description: 'Spring routine reminder',
      },
    ],
    targeting: { seasons: ['spring'] },
    never_say: ['diagnostic', 'urgence', 'obligatoire'],
    safety: { requireNonMedical: true },
    tone: 'informative',
    prompt: [
      'Write a short spring check-in for {{dog.name}} in French.',
      'Mention seasonal routine items like reminders, outdoor checks, and calm observation.',
      'Never use clinical language.',
    ].join('\n'),
  }),
  createTemplate({
    id: 'HSE_TICK_SEASON',
    category: 'health_seasonal',
    channel: 'push',
    priority: 98,
    cooldownHours: 336,
    weeklyBudget: 1,
    maxPerDay: 1,
    required_fields: ['dog.name', 'sensor.temperature_c', 'sensor.season'],
    triggers: [
      {
        type: 'temporal',
        field: 'sensor.season',
        operator: 'in',
        value: ['spring', 'autumn'],
        description: 'Tick seasons are active',
      },
      {
        type: 'sensor',
        field: 'sensor.temperature_c',
        operator: 'gt',
        value: 7,
        description: 'Mild weather supports tick activity',
      },
    ],
    targeting: { seasons: ['spring', 'autumn'] },
    never_say: ['grave', 'panique', 'mortel'],
    suffix: 'Un simple controle au retour de balade suffit souvent a garder de bons reperes.',
    safety: { requireNonMedical: true },
    tone: 'informative',
    prompt: [
      'Write a concise French push for {{dog.name}} about checking the coat after a walk in tick season.',
      'Keep it calm, practical, and strictly non-medical.',
    ].join('\n'),
  }),
  createTemplate({
    id: 'HSE_HEAT_ALERT',
    category: 'health_seasonal',
    channel: 'push',
    priority: 99,
    cooldownHours: 48,
    weeklyBudget: 3,
    maxPerDay: 1,
    required_fields: ['dog.name', 'sensor.temperature_c', 'dog.size', 'dog.is_brachycephalic'],
    triggers: [
      {
        type: 'sensor',
        field: 'sensor.temperature_c',
        operator: 'gt',
        value: 22,
        description: 'Warm day ahead',
      },
    ],
    targeting: { size: ['large', 'giant'], seasons: ['summer'] },
    never_say: ['coup de chaleur', 'danger mortel', 'urgence vitale'],
    suffix: 'Si vous avez un doute sur le confort de votre chien, votre veterinaire peut vous conseiller.',
    safety: { requireNonMedical: true },
    tone: 'informative',
    prompt: [
      'Write a short French push for {{dog.name}} on a warm day at {{sensor.temperature_c}} degrees.',
      'Mention shade, water, and gentler timing for walks.',
      'Stay observational and non-medical.',
    ].join('\n'),
  }),
];

export const HEALTH_BREED_TEMPLATES: BleizTemplate[] = [
  createTemplate({
    id: 'HBR_BRACHY_REST_BREATHING',
    category: 'health_breed',
    channel: 'push',
    priority: 100,
    cooldownHours: 168,
    weeklyBudget: 1,
    maxPerDay: 1,
    required_fields: [
      'dog.name',
      'dog.is_brachycephalic',
      'sensor.resting_rr_today',
      'sensor.resting_rr_delta_pct',
      'sensor.days_with_valid_rest_data',
      'sensor.rest_rr_valid_today',
      'sensor.coverage_14d',
    ],
    triggers: [
      {
        type: 'breed',
        field: 'dog.is_brachycephalic',
        operator: 'eq',
        value: true,
        description: 'Template targets short-muzzled dogs',
      },
      {
        type: 'sensor',
        field: 'sensor.resting_rr_delta_pct',
        operator: 'gt',
        value: 15,
        description: 'Resting rhythm is clearly above the recent baseline',
      },
    ],
    targeting: {},
    never_say: ['diagnostic', 'detresse', 'pathologie', 'respiration anormale'],
    suffix: 'En cas d inquietude, un veterinaire peut vous aider a lire ces observations.',
    safety: { requireNonMedical: true },
    tone: 'gentle',
    prompt: [
      'Write a careful French message for {{dog.name}} after a resting-breathing change on a short-muzzled dog.',
      'Only describe a difference from the usual baseline. Never diagnose.',
      'Offer calm environment and observation tips.',
    ].join('\n'),
  }),
  createTemplate({
    id: 'HBR_LONG_BACK_ROUTINE',
    category: 'health_breed',
    channel: 'chat_message',
    priority: 88,
    cooldownHours: 336,
    weeklyBudget: 1,
    required_fields: ['dog.name', 'dog.breed', 'dog.morphology_flags'],
    triggers: [
      {
        type: 'breed',
        field: 'dog.morphology_flags',
        operator: 'contains',
        value: 'long_back',
        description: 'Long-backed dogs receive adapted routine content',
      },
    ],
    targeting: {},
    never_say: ['hernie', 'lesion', 'paralyse'],
    safety: { requireNonMedical: true },
    tone: 'informative',
    prompt: [
      'Write a gentle French educational note for {{dog.name}} about protecting a long-backed dog in daily life.',
      'Focus on smooth routines, thoughtful surfaces, and avoiding sudden big jumps.',
      'No medical language.',
    ].join('\n'),
  }),
  createTemplate({
    id: 'HBR_GIANT_MEAL_PACING',
    category: 'health_breed',
    channel: 'home_insight',
    priority: 90,
    cooldownHours: 240,
    weeklyBudget: 1,
    required_fields: ['dog.name', 'dog.size', 'sensor.post_meal_agitation'],
    triggers: [
      {
        type: 'breed',
        field: 'dog.size',
        operator: 'in',
        value: ['large', 'giant'],
        description: 'Large and giant dogs get paced-meal routine reminders',
      },
      {
        type: 'sensor',
        field: 'sensor.post_meal_agitation',
        operator: 'gt',
        value: 6,
        description: 'The dog stays very animated after meals',
      },
    ],
    targeting: { size: ['large', 'giant'] },
    never_say: ['torsion', 'urgence', 'fatal'],
    safety: { requireNonMedical: true },
    tone: 'gentle',
    prompt: [
      'Write a French home insight for {{dog.name}} after a lively post-meal period.',
      'Keep it practical for a large dog: quieter pacing after meals, calmer transitions, fresh water.',
      'Stay non-medical.',
    ].join('\n'),
  }),
];

export const ACTIVITY_TEMPLATES: BleizTemplate[] = [
  createTemplate({
    id: 'ACT_LOW_ACTIVITY_DAY',
    category: 'activity',
    channel: 'home_insight',
    priority: 68,
    cooldownHours: 48,
    weeklyBudget: 2,
    required_fields: [
      'dog.name',
      'sensor.activity_km_today',
      'sensor.activity_km_7d_avg',
      'sensor.mat_presence_today_min',
    ],
    triggers: [
      {
        type: 'sensor',
        field: 'sensor.activity_km_today',
        operator: 'lt',
        value: 2,
        description: 'Movement stayed light today',
      },
    ],
    targeting: {},
    never_say: ['trop inactif', 'probleme', 'sedentaire'],
    safety: { requireNonMedical: true },
    tone: 'warm',
    prompt: [
      'Write a French home insight for {{dog.name}} after a quieter day than usual.',
      'Frame it as a softer rhythm, not as a problem.',
      'Suggest one gentle activity for tomorrow.',
    ].join('\n'),
  }),
  createTemplate({
    id: 'ACT_RECOVERY_DAY',
    category: 'activity',
    channel: 'chat_message',
    priority: 65,
    cooldownHours: 72,
    weeklyBudget: 2,
    required_fields: [
      'dog.name',
      'sensor.mat_presence_today_min',
      'sensor.activity_km_today',
      'sensor.agitation_events_today',
    ],
    triggers: [
      {
        type: 'sensor',
        field: 'sensor.mat_presence_today_min',
        operator: 'gt',
        value: 180,
        description: 'The dog spent ample quiet time on the mat',
      },
      {
        type: 'sensor',
        field: 'sensor.agitation_events_today',
        operator: 'lt',
        value: 4,
        description: 'The day stayed settled',
      },
    ],
    targeting: {},
    never_say: ['fatigue chronique', 'epuise'],
    safety: { requireNonMedical: true },
    tone: 'gentle',
    prompt: [
      'Write a warm French chat message for {{dog.name}} after a calm recovery-style day.',
      'Highlight balance between movement and rest.',
    ].join('\n'),
  }),
  createTemplate({
    id: 'ACT_DISTANCE_RECORD',
    category: 'activity',
    channel: 'home_insight',
    priority: 72,
    cooldownHours: 24,
    weeklyBudget: 2,
    maxPerDay: 1,
    required_fields: ['dog.name', 'sensor.activity_km_today', 'sensor.personal_best_km'],
    triggers: [
      {
        type: 'milestone',
        field: 'sensor.activity_km_today',
        operator: 'gt',
        value: 8,
        description: 'A strong distance day happened',
      },
      {
        type: 'milestone',
        field: 'sensor.personal_best_km',
        operator: 'exists',
        description: 'A personal best marker is available',
      },
    ],
    targeting: {},
    never_say: ['performance absolue', 'obligation'],
    safety: { requireNonMedical: true },
    tone: 'celebratory',
    prompt: [
      'Write a celebratory French home insight for {{dog.name}} after a standout walk day.',
      'Celebrate rhythm and togetherness more than raw performance.',
    ].join('\n'),
  }),
];

export const ENVIRONMENT_TEMPLATES: BleizTemplate[] = [
  createTemplate({
    id: 'ENV_STORM_ROUTINE',
    category: 'environment',
    channel: 'chat_message',
    priority: 58,
    cooldownHours: 24,
    weeklyBudget: 2,
    required_fields: ['dog.name', 'sensor.weather_alert_level', 'sensor.weather_condition'],
    triggers: [
      {
        type: 'sensor',
        field: 'sensor.weather_alert_level',
        operator: 'gte',
        value: 2,
        description: 'Weather is more intense than usual',
      },
    ],
    targeting: {},
    never_say: ['tempete dangereuse', 'panique'],
    safety: { requireNonMedical: true },
    tone: 'gentle',
    prompt: [
      'Write a short French chat note for {{dog.name}} during louder or rougher weather.',
      'Suggest one grounding indoor routine and a calm tone.',
    ].join('\n'),
  }),
  createTemplate({
    id: 'ENV_COLD_COMFORT',
    category: 'environment',
    channel: 'push',
    priority: 60,
    cooldownHours: 48,
    weeklyBudget: 3,
    required_fields: ['dog.name', 'dog.size', 'sensor.temperature_c'],
    triggers: [
      {
        type: 'sensor',
        field: 'sensor.temperature_c',
        operator: 'lt',
        value: 2,
        description: 'Cold conditions outside',
      },
      {
        type: 'breed',
        field: 'dog.size',
        operator: 'in',
        value: ['toy', 'small'],
        description: 'Cold reminders target smaller dogs',
      },
    ],
    targeting: { size: ['toy', 'small'], seasons: ['winter'] },
    never_say: ['hypothermie', 'gelure'],
    safety: { requireNonMedical: true },
    tone: 'warm',
    prompt: [
      'Write a short French push for {{dog.name}} on a cold day at {{sensor.temperature_c}} degrees.',
      'Mention shorter outings and comfort on the way back home.',
    ].join('\n'),
  }),
  createTemplate({
    id: 'ENV_HOME_SAFETY',
    category: 'environment',
    channel: 'chat_message',
    priority: 45,
    cooldownHours: 720,
    weeklyBudget: 1,
    required_fields: ['dog.name', 'user.days_since_onboarding'],
    triggers: [
      {
        type: 'user',
        field: 'user.days_since_onboarding',
        operator: 'between',
        value: { min: 10, max: 20 },
        description: 'A gentle onboarding reminder window',
      },
    ],
    targeting: {},
    never_say: ['empoisonnement', 'catastrophe'],
    safety: { requireNonMedical: true },
    tone: 'informative',
    prompt: [
      'Write a French educational chat message for {{dog.name}} about simple home safety habits.',
      'Keep it calm, everyday, and non-alarmist.',
    ].join('\n'),
  }),
];

export const EDUCATION_TEMPLATES: BleizTemplate[] = [
  createTemplate({
    id: 'EDU_PUPPY_PLAY',
    category: 'education',
    channel: 'chat_message',
    priority: 50,
    cooldownHours: 168,
    weeklyBudget: 1,
    required_fields: ['dog.name', 'dog.breed', 'dog.ageMonths'],
    triggers: [
      {
        type: 'breed',
        field: 'dog.ageMonths',
        operator: 'lt',
        value: 12,
        description: 'Puppy age range',
      },
    ],
    targeting: { ageMonths: { max: 12 } },
    never_say: ['punir', 'dominer'],
    safety: { requireNonMedical: true },
    tone: 'playful',
    prompt: [
      'Write a playful French message for {{dog.name}}, a young {{dog.breed}}.',
      'Give two short tips for safe, short, joyful play sessions.',
    ].join('\n'),
  }),
  createTemplate({
    id: 'EDU_SOCIALIZATION_WINDOW',
    category: 'education',
    channel: 'home_insight',
    priority: 52,
    cooldownHours: 240,
    weeklyBudget: 1,
    required_fields: ['dog.name', 'dog.ageMonths'],
    triggers: [
      {
        type: 'breed',
        field: 'dog.ageMonths',
        operator: 'between',
        value: { min: 3, max: 18 },
        description: 'Young dog learning phase',
      },
    ],
    targeting: { ageMonths: { min: 3, max: 18 } },
    never_say: ['agressif', 'peureux pour toujours'],
    safety: { requireNonMedical: true },
    tone: 'informative',
    prompt: [
      'Write a French home insight for {{dog.name}} about calm social exposure and pacing.',
      'Keep the tone supportive and very concrete.',
    ].join('\n'),
  }),
  createTemplate({
    id: 'EDU_CALM_DEPARTURES',
    category: 'education',
    channel: 'chat_message',
    priority: 56,
    cooldownHours: 240,
    weeklyBudget: 1,
    required_fields: ['dog.name', 'user.days_since_onboarding'],
    triggers: [
      {
        type: 'user',
        field: 'user.days_since_onboarding',
        operator: 'between',
        value: { min: 7, max: 30 },
        description: 'Early routine-shaping phase',
      },
    ],
    targeting: {},
    never_say: ['abandon', 'faute'],
    safety: { requireNonMedical: true },
    tone: 'warm',
    prompt: [
      'Write a gentle French chat message for {{dog.name}} about calm departures and calm returns.',
      'Do not moralize. Focus on rituals and predictability.',
    ].join('\n'),
  }),
];

export const COMMUNITY_TEMPLATES: BleizTemplate[] = [
  createTemplate({
    id: 'COM_MORNING_QUESTION',
    category: 'community',
    channel: 'community_post',
    priority: 30,
    cooldownHours: 20,
    weeklyBudget: 5,
    maxPerDay: 1,
    required_fields: ['community.city', 'sensor.hour'],
    triggers: [
      {
        type: 'temporal',
        field: 'sensor.hour',
        operator: 'eq',
        value: 7,
        description: 'Morning community slot',
      },
    ],
    targeting: {},
    never_say: ['offre', 'premium', 'pub'],
    safety: { requireNonMedical: true },
    tone: 'playful',
    prompt: [
      'Write a short community post in French for {{community.city}}.',
      'It should feel like a light morning question for dog families.',
      'Keep it warm and inclusive.',
    ].join('\n'),
  }),
  createTemplate({
    id: 'COM_COPRESENCE_HINT',
    category: 'community',
    channel: 'chat_message',
    priority: 36,
    cooldownHours: 168,
    weeklyBudget: 1,
    maxPerDay: 1,
    required_fields: [
      'community.city',
      'community.copresence_count',
      'community.otherDogName',
      'community.otherDogBreed',
    ],
    triggers: [
      {
        type: 'community',
        field: 'community.copresence_count',
        operator: 'gte',
        value: 3,
        description: 'Repeated community co-presence happened',
      },
    ],
    targeting: {},
    never_say: ['surveillance', 'traquer'],
    safety: { requireNonMedical: true },
    tone: 'playful',
    prompt: [
      'Write a playful French chat note about often crossing paths with {{community.otherDogName}}, a {{community.otherDogBreed}}, in {{community.city}}.',
      'Keep it optional and light.',
    ].join('\n'),
  }),
  createTemplate({
    id: 'COM_WEEKLY_CHALLENGE',
    category: 'community',
    channel: 'community_post',
    priority: 32,
    cooldownHours: 156,
    weeklyBudget: 1,
    maxPerDay: 1,
    required_fields: ['community.city', 'community.weekly_distance_goal', 'sensor.day_of_week'],
    triggers: [
      {
        type: 'temporal',
        field: 'sensor.day_of_week',
        operator: 'eq',
        value: 1,
        description: 'Monday challenge slot',
      },
    ],
    targeting: {},
    never_say: ['classement humiliant', 'perdant'],
    safety: { requireNonMedical: true },
    tone: 'celebratory',
    prompt: [
      'Write a short French community challenge post for {{community.city}}.',
      'The shared goal is {{community.weekly_distance_goal}} km this week.',
      'Keep it collective, upbeat, and non-competitive.',
    ].join('\n'),
  }),
];

export const MILESTONE_TEMPLATES: BleizTemplate[] = [
  createTemplate({
    id: 'MIL_DISTANCE_RECORD',
    category: 'milestone',
    channel: 'push',
    priority: 66,
    cooldownHours: 24,
    weeklyBudget: 2,
    maxPerDay: 1,
    required_fields: ['dog.name', 'sensor.activity_km_today', 'sensor.personal_best_km'],
    triggers: [
      {
        type: 'milestone',
        field: 'sensor.activity_km_today',
        operator: 'gt',
        value: 8,
        description: 'Big walking day',
      },
    ],
    targeting: {},
    never_say: ['exploit obligatoire'],
    safety: { requireNonMedical: true },
    tone: 'celebratory',
    prompt: [
      'Write a short celebratory French push for {{dog.name}} after a new walking record.',
      'Celebrate the shared moment, not pure performance.',
    ].join('\n'),
  }),
  createTemplate({
    id: 'MIL_MAT_STREAK',
    category: 'milestone',
    channel: 'home_insight',
    priority: 62,
    cooldownHours: 24,
    weeklyBudget: 1,
    maxPerDay: 1,
    required_fields: ['dog.name', 'sensor.mat_streak_days'],
    triggers: [
      {
        type: 'milestone',
        field: 'sensor.mat_streak_days',
        operator: 'in',
        value: [7, 14, 30, 60, 100],
        description: 'Mat streak milestone',
      },
    ],
    targeting: {},
    never_say: [],
    safety: { requireNonMedical: true },
    tone: 'celebratory',
    prompt: [
      'Write a French home insight celebrating {{sensor.mat_streak_days}} days of mat routine for {{dog.name}}.',
      'Link the streak to steadier daily understanding, not to diagnosis.',
    ].join('\n'),
  }),
  createTemplate({
    id: 'MIL_ADOPTION_DAY',
    category: 'milestone',
    channel: 'chat_message',
    priority: 60,
    cooldownHours: 8760,
    weeklyBudget: 1,
    maxPerDay: 1,
    required_fields: ['dog.name', 'dog.adoptionAnniversaryToday'],
    triggers: [
      {
        type: 'milestone',
        field: 'dog.adoptionAnniversaryToday',
        operator: 'eq',
        value: true,
        description: 'Adoption anniversary marker',
      },
    ],
    targeting: {},
    never_say: [],
    safety: { requireNonMedical: true },
    tone: 'celebratory',
    prompt: [
      'Write a warm French chat message for {{dog.name}} on an adoption anniversary.',
      'Make it tender, simple, and grounded in the relationship.',
    ].join('\n'),
  }),
];

export const NUTRITION_TEMPLATES: BleizTemplate[] = [
  createTemplate({
    id: 'NUT_WEIGHT_TREND',
    category: 'nutrition',
    channel: 'home_insight',
    priority: 78,
    cooldownHours: 336,
    weeklyBudget: 1,
    maxPerDay: 1,
    required_fields: ['dog.name', 'sensor.weight_kg', 'sensor.weight_delta_pct_30d'],
    triggers: [
      {
        type: 'sensor',
        field: 'sensor.weight_delta_pct_30d',
        operator: 'gt',
        value: 5,
        description: 'Weight trend moved up over a month',
      },
    ],
    targeting: {},
    never_say: ['obese', 'gros', 'malade'],
    suffix: 'Votre veterinaire peut vous aider a definir un repere de poids adapte.',
    safety: { requireNonMedical: true },
    tone: 'gentle',
    prompt: [
      'Write a gentle French home insight for {{dog.name}} about a gradual weight trend.',
      'Use calm everyday ideas around portions, treats, and movement.',
      'No judgement, no medical wording.',
    ].join('\n'),
  }),
  createTemplate({
    id: 'NUT_TREAT_BALANCE',
    category: 'nutrition',
    channel: 'chat_message',
    priority: 57,
    cooldownHours: 168,
    weeklyBudget: 1,
    required_fields: ['dog.name', 'user.treats_today_count', 'sensor.activity_km_today'],
    triggers: [
      {
        type: 'user',
        field: 'user.treats_today_count',
        operator: 'gt',
        value: 5,
        description: 'Treat day was generous',
      },
    ],
    targeting: {},
    never_say: ['trop nourri', 'faute'],
    safety: { requireNonMedical: true },
    tone: 'warm',
    prompt: [
      'Write a short French chat note for {{dog.name}} about balancing treats and activity on a generous day.',
      'Stay kind and practical.',
    ].join('\n'),
  }),
  createTemplate({
    id: 'NUT_BREED_APPETITE',
    category: 'nutrition',
    channel: 'chat_message',
    priority: 55,
    cooldownHours: 720,
    weeklyBudget: 1,
    required_fields: ['dog.name', 'dog.breed', 'sensor.weight_kg'],
    triggers: [
      {
        type: 'breed',
        field: 'dog.breed',
        operator: 'in',
        value: ['labrador', 'labrador retriever', 'golden retriever'],
        description: 'Breed with strong food motivation',
      },
    ],
    targeting: { breed: ['labrador', 'labrador retriever', 'golden retriever'] },
    never_say: ['goinfre', 'vorace'],
    safety: { requireNonMedical: true },
    tone: 'informative',
    prompt: [
      'Write a French educational chat note for {{dog.name}}, a {{dog.breed}}, about food motivation.',
      'Keep it understanding and practical, without blame.',
    ].join('\n'),
  }),
];

export const RELATIONSHIP_TEMPLATES: BleizTemplate[] = [
  createTemplate({
    id: 'REL_PRESENCE_CALM',
    category: 'relationship',
    channel: 'home_insight',
    priority: 70,
    cooldownHours: 336,
    weeklyBudget: 1,
    maxPerDay: 1,
    required_fields: [
      'dog.name',
      'community.owner_presence_calm_correlation',
      'sensor.data_days',
    ],
    triggers: [
      {
        type: 'community',
        field: 'community.owner_presence_calm_correlation',
        operator: 'gt',
        value: 0.6,
        description: 'A calm-with-presence pattern is strong enough',
      },
      {
        type: 'sensor',
        field: 'sensor.data_days',
        operator: 'gte',
        value: 21,
        description: 'Enough days exist to speak about a stable pattern',
      },
    ],
    targeting: {},
    never_say: ['dependance', 'abandon', 'culpabilite'],
    safety: { requireNonMedical: true },
    tone: 'warm',
    prompt: [
      'Write a warm French home insight about how {{dog.name}} settles more easily when daily presence is more stable.',
      'Frame it as a relationship rhythm, not as a problem.',
    ].join('\n'),
  }),
  createTemplate({
    id: 'REL_WEEKEND_PATTERN',
    category: 'relationship',
    channel: 'chat_message',
    priority: 64,
    cooldownHours: 672,
    weeklyBudget: 1,
    required_fields: ['dog.name', 'sensor.weekend_mat_pct_higher', 'sensor.data_weeks'],
    triggers: [
      {
        type: 'sensor',
        field: 'sensor.weekend_mat_pct_higher',
        operator: 'gt',
        value: 30,
        description: 'Weekend calm pattern stands out',
      },
      {
        type: 'sensor',
        field: 'sensor.data_weeks',
        operator: 'gte',
        value: 4,
        description: 'Pattern has enough weekly depth',
      },
    ],
    targeting: {},
    never_say: ['codendant', 'anxiete'],
    safety: { requireNonMedical: true },
    tone: 'warm',
    prompt: [
      'Write a warm French chat message for {{dog.name}} about a calmer weekend rhythm.',
      'Celebrate the shared pace and household calm.',
    ].join('\n'),
  }),
  createTemplate({
    id: 'REL_MEMORY_6M',
    category: 'relationship',
    channel: 'chat_message',
    priority: 63,
    cooldownHours: 8760,
    weeklyBudget: 1,
    maxPerDay: 1,
    required_fields: [
      'dog.name',
      'user.days_since_onboarding',
      'user.total_km',
      'user.total_insights',
    ],
    triggers: [
      {
        type: 'user',
        field: 'user.days_since_onboarding',
        operator: 'eq',
        value: 180,
        description: 'Six month milestone',
      },
    ],
    targeting: {},
    never_say: [],
    safety: { requireNonMedical: true },
    tone: 'celebratory',
    prompt: [
      'Write a reflective French chat message for {{dog.name}} at the six-month mark.',
      'Mention the path travelled and the growing understanding between human and dog.',
      'Keep it soft and sincere.',
    ].join('\n'),
  }),
  createTemplate({
    id: 'REL_ABSENCE_ROUTINE',
    category: 'relationship',
    channel: 'home_insight',
    priority: 69,
    cooldownHours: 168,
    weeklyBudget: 1,
    maxPerDay: 1,
    required_fields: [
      'dog.name',
      'sensor.absent_mat_rest_min',
      'sensor.present_mat_rest_min',
      'sensor.absence_effect_size',
      'sensor.absence_confidence',
      'user.hardware_linked',
    ],
    triggers: [
      {
        type: 'sensor',
        field: 'sensor.present_mat_rest_min',
        operator: 'gt',
        value: 40,
        description: 'Rest is visibly easier when someone is around',
      },
      {
        type: 'sensor',
        field: 'sensor.absence_confidence',
        operator: 'gte',
        value: 0.55,
        description: 'The comparison is stable enough',
      },
    ],
    targeting: {},
    never_say: ['abandon', 'culpabilite', 'dependance'],
    safety: { requireNonMedical: true },
    tone: 'warm',
    prompt: [
      'Write a warm French home insight for {{dog.name}} about a steadier routine when presence is more predictable.',
      'Keep it non-medical and relationship-focused.',
      'Use the idea of a calmer daily rhythm between presence and absence periods.',
    ].join('\n'),
  }),
];

export const ELI_V5_TEMPLATES: BleizTemplate[] = [
  createTemplate({
    id: 'REL_ROUTINE_STABLE',
    category: 'relationship',
    channel: 'chat_message',
    priority: 4,
    cooldownHours: 336,
    weeklyBudget: 1,
    required_fields: ['dog.name', 'sensor.rsi'],
    requires_hardware: true,
    triggers: [
      {
        type: 'computed',
        field: 'computed.rsi_stable_14d',
        operator: 'gt',
        value: 0.85,
        description: 'rsi > 0.85 for 14+ days',
      },
    ],
    targeting: {},
    never_say: [],
    safety: { requireNonMedical: true },
    tone: 'celebratory',
    prompt: [
      'Write a celebratory French chat message for {{dog.name}}.',
      'Highlight the stability of the routine over the past two weeks.',
      'Celebrate the consistency and the bond it reflects.',
    ].join('\n'),
  }),
  createTemplate({
    id: 'REL_ROUTINE_BREAK',
    category: 'relationship',
    channel: 'home_insight',
    priority: 7,
    cooldownHours: 168,
    weeklyBudget: 1,
    required_fields: ['dog.name', 'sensor.rsi'],
    requires_hardware: true,
    triggers: [
      {
        type: 'computed',
        field: 'computed.routine_break',
        operator: 'gte',
        value: 3,
        description: 'routine_break_detected && days >= 3',
      },
    ],
    targeting: {},
    never_say: ['perturbé', 'stressé', 'instable', 'anxieux', 'problème'],
    safety: { requireNonMedical: true },
    tone: 'gentle',
    prompt: [
      'Write a gentle French home insight for {{dog.name}}.',
      'Acknowledge a recent shift in routine without alarm.',
      'Normalise change and offer reassurance.',
    ].join('\n'),
  }),
  createTemplate({
    id: 'REL_ROUTINE_RECOVERING',
    category: 'relationship',
    channel: 'home_insight',
    priority: 5,
    cooldownHours: 168,
    weeklyBudget: 1,
    required_fields: ['dog.name', 'sensor.rsi'],
    requires_hardware: true,
    triggers: [
      {
        type: 'computed',
        field: 'computed.rsi_recovering',
        operator: 'exists',
        description: 'rsi improving after break',
      },
    ],
    targeting: {},
    never_say: [],
    safety: { requireNonMedical: true },
    tone: 'warm',
    prompt: [
      'Write a warm French home insight for {{dog.name}}.',
      'Note that the routine seems to be settling back in after a disruption.',
      'Encourage without overstating the recovery.',
    ].join('\n'),
  }),
  createTemplate({
    id: 'REL_BASELINE_DRIFT',
    category: 'relationship',
    channel: 'home_insight',
    priority: 8,
    cooldownHours: 336,
    weeklyBudget: 1,
    required_fields: ['dog.name', 'sensor.rr_drift_sigma'],
    requires_hardware: true,
    triggers: [
      {
        type: 'computed',
        field: 'computed.drift_significant',
        operator: 'exists',
        description: 'drift_significant && !baseline_frozen',
      },
    ],
    targeting: {},
    never_say: ['anormal', 'malade', 'inquiétant', 'problème', 'dégradé'],
    suffix: 'En cas de doute, votre vétérinaire peut vous rassurer.',
    safety: { requireNonMedical: true },
    tone: 'gentle',
    prompt: [
      'Write a gentle French home insight for {{dog.name}}.',
      'Mention that the resting rhythm baseline has shifted noticeably.',
      'Keep the tone neutral and non-medical. Suggest a vet visit only via the suffix.',
    ].join('\n'),
  }),
  createTemplate({
    id: 'REL_BASELINE_FROZEN_30D',
    category: 'relationship',
    channel: 'chat_message',
    priority: 9,
    cooldownHours: 720,
    weeklyBudget: 1,
    required_fields: ['dog.name', 'sensor.baseline_frozen'],
    requires_hardware: true,
    triggers: [
      {
        type: 'computed',
        field: 'computed.baseline_frozen_days',
        operator: 'gt',
        value: 30,
        description: 'baseline_frozen && freeze_days > 30',
      },
    ],
    targeting: {},
    never_say: ['anormal', 'malade', 'chronique', 'problème'],
    suffix: "Une visite de routine chez le vétérinaire peut être l'occasion d'en parler.",
    safety: { requireNonMedical: true },
    tone: 'gentle',
    prompt: [
      'Write a gentle French chat message for {{dog.name}}.',
      'Explain that the baseline has been on hold for over a month.',
      'Keep the tone calm and suggest a routine vet visit via the suffix.',
    ].join('\n'),
  }),
  createTemplate({
    id: 'ACT_WALK_QUALITY',
    category: 'activity',
    channel: 'home_insight',
    priority: 5,
    cooldownHours: 20,
    weeklyBudget: 7,
    required_fields: ['dog.name', 'sensor.wqi'],
    requires_hardware: true,
    triggers: [
      {
        type: 'event',
        field: 'event.walk_completed',
        operator: 'exists',
        description: 'walk_completed',
      },
    ],
    targeting: {},
    never_say: ['mauvaise promenade', 'insuffisant', 'score'],
    safety: { requireNonMedical: true },
    tone: 'warm',
    prompt: [
      'Write a warm French home insight for {{dog.name}} about a recent walk.',
      'Reflect on walk quality without exposing a numeric score.',
      'Focus on the shared experience and what made this walk special.',
    ].join('\n'),
  }),
  createTemplate({
    id: 'REL_PRESENCE_CALM',
    category: 'relationship',
    channel: 'home_insight',
    priority: 6,
    cooldownHours: 168,
    weeklyBudget: 1,
    required_fields: [
      'dog.name',
      'sensor.absence_agitation_index',
      'sensor.presence_agitation_index',
    ],
    requires_hardware: true,
    triggers: [
      {
        type: 'computed',
        field: 'computed.absence_calm_ratio',
        operator: 'gt',
        value: 0.8,
        description: 'absence_calm_ratio > 0.8 && sample_days >= 7',
      },
    ],
    targeting: {},
    never_say: ['anxiété', 'stress', 'séparation'],
    safety: { requireNonMedical: true },
    tone: 'warm',
    prompt: [
      'Write a warm French home insight for {{dog.name}}.',
      'Highlight that the dog stays calm whether the owner is present or away.',
      'Frame it as a sign of confidence and emotional balance.',
    ].join('\n'),
  }),
];

import {
  SEPARATION_TEMPLATES,
  NOISE_TEMPLATES,
  THERMAL_TEMPLATES,
  MULTI_SENSOR_TEMPLATES,
  ALLOSTATIC_TEMPLATES,
} from './bleiz-science-templates.js';

export {
  SEPARATION_TEMPLATES,
  NOISE_TEMPLATES,
  THERMAL_TEMPLATES,
  MULTI_SENSOR_TEMPLATES,
  ALLOSTATIC_TEMPLATES,
};

export const BLEIZ_TEMPLATES: BleizTemplate[] = [
  ...BEHAVIOR_TEMPLATES,
  ...HEALTH_SEASONAL_TEMPLATES,
  ...HEALTH_BREED_TEMPLATES,
  ...ACTIVITY_TEMPLATES,
  ...ENVIRONMENT_TEMPLATES,
  ...EDUCATION_TEMPLATES,
  ...COMMUNITY_TEMPLATES,
  ...MILESTONE_TEMPLATES,
  ...NUTRITION_TEMPLATES,
  ...RELATIONSHIP_TEMPLATES,
  ...ELI_V5_TEMPLATES,
  ...SEPARATION_TEMPLATES,
  ...NOISE_TEMPLATES,
  ...THERMAL_TEMPLATES,
  ...MULTI_SENSOR_TEMPLATES,
  ...ALLOSTATIC_TEMPLATES,
];

export const BLEIZ_TEMPLATE_STATS = {
  total: BLEIZ_TEMPLATES.length,
  by_category: {
    behavior: BEHAVIOR_TEMPLATES.length,
    health_seasonal: HEALTH_SEASONAL_TEMPLATES.length,
    health_breed: HEALTH_BREED_TEMPLATES.length,
    activity: ACTIVITY_TEMPLATES.length,
    environment: ENVIRONMENT_TEMPLATES.length,
    education: EDUCATION_TEMPLATES.length,
    community: COMMUNITY_TEMPLATES.length,
    milestone: MILESTONE_TEMPLATES.length,
    nutrition: NUTRITION_TEMPLATES.length,
    relationship: RELATIONSHIP_TEMPLATES.length,
    eli_v5: ELI_V5_TEMPLATES.length,
    separation: SEPARATION_TEMPLATES.length,
    noise: NOISE_TEMPLATES.length,
    thermal: THERMAL_TEMPLATES.length,
    multi_sensor: MULTI_SENSOR_TEMPLATES.length,
    allostatic: ALLOSTATIC_TEMPLATES.length,
  },
};
