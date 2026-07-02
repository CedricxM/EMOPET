// ─── Freemium Content Types ────────────────────────────────────────

export type FreemiumCategory =
  | 'health_seasonal'
  | 'health_breed'
  | 'behavior_education'
  | 'nutrition'
  | 'activity_exercise'
  | 'first_aid'
  | 'life_events'
  | 'milestone'
  | 'community'
  | 'fun_fact';

export type FreemiumSourceType =
  | 'educational'
  | 'seasonal_alert'
  | 'behavior_tip'
  | 'fun_fact'
  | 'community'
  | 'milestone';

export type FreemiumChannel =
  | 'home_insight'
  | 'chat_message'
  | 'community_post'
  | 'push';

export type SizeClass = 'xs' | 'small' | 'medium' | 'large' | 'giant';

export type FurLength = 'hairless' | 'short' | 'medium' | 'long' | 'wire' | 'curly';
export type FurDensity = 'sparse' | 'moderate' | 'dense' | 'very_dense';
export type SheddingLevel = 'none' | 'low' | 'moderate' | 'heavy' | 'seasonal_heavy';
export type ActivityLevel = 'low' | 'moderate' | 'high' | 'very_high';
export type AnxietyTendency = 'low' | 'moderate' | 'high';
export type VocalizationTendency = 'quiet' | 'moderate' | 'vocal' | 'very_vocal';
export type SociabilityLevel = 'low' | 'moderate' | 'high';
export type HumanSociability = 'reserved' | 'moderate' | 'friendly' | 'very_friendly';
export type Trainability = 'independent' | 'moderate' | 'eager' | 'very_eager';
export type EnergyIndoor = 'calm' | 'moderate' | 'active';
export type HeatSensitivity = 'low' | 'moderate' | 'high' | 'very_high';
export type ColdSensitivity = 'low' | 'moderate' | 'high';
export type AlertSeverity = 'info' | 'attention' | 'urgent';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

// ─── Breed Knowledge ───────────────────────────────────────────────

export interface BreedKnowledge {
  breedId: string;
  fciNumber: number | null;
  displayNameFr: string;
  displayNameEn: string;

  sizeClass: SizeClass;
  weightMinKg: number | null;
  weightMaxKg: number | null;
  heightMinCm: number | null;
  heightMaxCm: number | null;
  isBrachycephalic: boolean;
  isLongBacked: boolean;
  isGiant: boolean;

  furLength: FurLength | null;
  furDensity: FurDensity | null;
  hasDoubleCoat: boolean;
  furContactClass: string | null;
  sheddingLevel: SheddingLevel | null;

  activityLevel: ActivityLevel | null;
  dailyExerciseMinMinutes: number | null;
  dailyExerciseMaxMinutes: number | null;
  dailyWalkKmMin: number | null;
  dailyWalkKmMax: number | null;
  exerciseTypePreference: string[];

  separationAnxietyTendency: AnxietyTendency | null;
  vocalizationTendency: VocalizationTendency | null;
  sociabilityDogs: SociabilityLevel | null;
  sociabilityHumans: HumanSociability | null;
  trainability: Trainability | null;
  energyIndoor: EnergyIndoor | null;
  destructivenessTendency: AnxietyTendency | null;

  heatSensitivity: HeatSensitivity | null;
  coldSensitivity: ColdSensitivity | null;
  heatAlertThresholdC: number | null;
  commonBreedConcerns: string[];

  lifespanMinYears: number | null;
  lifespanMaxYears: number | null;

  onboardingTips: string[];
  funFacts: string[];
  breedGroupFci: string | null;
  originCountry: string | null;

  dataCompleteness: number;
  source: string;
}

// ─── Freemium Template ─────────────────────────────────────────────

export interface FreemiumTemplate {
  id: string;
  category: FreemiumCategory;
  subcategory: string;

  breedFilter: string[];
  sizeFilter: SizeClass[];
  ageMinMonths: number | null;
  ageMaxMonths: number | null;
  seasonFilter: Season[];
  monthFilter: number[];
  regionFilter: string[];

  titleFr: string;
  bodyFr: string;
  sourceType: FreemiumSourceType;

  neverSay: string[];
  suffix: string | null;
  requiresVetDisclaimer: boolean;

  channel: FreemiumChannel;
  priority: number;
  cooldownHours: number;
  maxPerMonth: number;

  usesDogName: boolean;
  usesBreedName: boolean;
  usesAge: boolean;
  usesLocation: boolean;
  usesSeason: boolean;
}

// ─── Directory Entry ───────────────────────────────────────────────

export type DirectoryCategory =
  | 'veterinaire'
  | 'educateur'
  | 'toiletteur'
  | 'pension'
  | 'parc_chien'
  | 'animalerie'
  | 'promeneur'
  | 'osteopathe_canin'
  | 'comportementaliste';

export interface DirectoryEntry {
  id: number;
  name: string;
  category: DirectoryCategory;
  address: string | null;
  city: string;
  postalCode: string | null;
  department: string | null;
  region: string;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  hours: Record<string, string> | null;
  specialties: string[];
  acceptsEmergencies: boolean;
  ratingAvg: number | null;
  ratingCount: number;
  verified: boolean;
  source: string;
}

// ─── Weather & Alerts ──────────────────────────────────────────────

export interface WeatherData {
  locationKey: string;
  date: string;
  temperatureC: number | null;
  feelsLikeC: number | null;
  humidityPct: number | null;
  windSpeedMs: number | null;
  weatherCondition: string | null;
  uvIndex: number | null;
}

export interface SeasonalAlert {
  id: number;
  alertType: string;
  region: string;
  severity: AlertSeverity;
  titleFr: string;
  bodyFr: string;
  activeFrom: string;
  activeTo: string;
  source: string | null;
}

// ─── Onboarding ────────────────────────────────────────────────────

export interface OnboardingStep {
  step: number;
  title: string;
  type: 'text' | 'breed_search' | 'multi_input' | 'location' | 'summary';
  field?: string;
  inputs?: OnboardingInput[];
  placeholder?: string;
  allowMixed?: boolean;
  note?: string;
  show?: string[];
  cta?: string;
}

export interface OnboardingInput {
  field: string;
  type: 'date' | 'select' | 'toggle' | 'number';
  label: string;
  options?: string[];
  optional?: boolean;
}
