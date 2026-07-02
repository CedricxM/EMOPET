import { pgTable, text, timestamp, date, integer, real, serial, jsonb, boolean, index, uniqueIndex } from 'drizzle-orm/pg-core';

// ─── Breed Knowledge Database ──────────────────────────────────────

export const breedKnowledge = pgTable('breed_knowledge', {
  breedId: text('breed_id').primaryKey(),
  fciNumber: integer('fci_number'),
  displayNameFr: text('display_name_fr').notNull(),
  displayNameEn: text('display_name_en').notNull(),

  // Morphology
  sizeClass: text('size_class').notNull(), // xs, small, medium, large, giant
  weightMinKg: real('weight_min_kg'),
  weightMaxKg: real('weight_max_kg'),
  heightMinCm: real('height_min_cm'),
  heightMaxCm: real('height_max_cm'),
  isBrachycephalic: boolean('is_brachycephalic').default(false),
  isLongBacked: boolean('is_long_backed').default(false),
  isGiant: boolean('is_giant').default(false),

  // Fur & contact
  furLength: text('fur_length'), // hairless, short, medium, long, wire, curly
  furDensity: text('fur_density'), // sparse, moderate, dense, very_dense
  hasDoubleCoat: boolean('has_double_coat').default(false),
  furContactClass: text('fur_contact_class'), // FC-1, FC-2, FC-3
  sheddingLevel: text('shedding_level'), // none, low, moderate, heavy, seasonal_heavy

  // Activity needs
  activityLevel: text('activity_level'), // low, moderate, high, very_high
  dailyExerciseMinMinutes: integer('daily_exercise_min_minutes'),
  dailyExerciseMaxMinutes: integer('daily_exercise_max_minutes'),
  dailyWalkKmMin: real('daily_walk_km_min'),
  dailyWalkKmMax: real('daily_walk_km_max'),
  exerciseTypePreference: jsonb('exercise_type_preference').default([]),

  // Behavior (C-BARQ simplified)
  separationAnxietyTendency: text('separation_anxiety_tendency'), // low, moderate, high
  vocalizationTendency: text('vocalization_tendency'), // quiet, moderate, vocal, very_vocal
  sociabilityDogs: text('sociability_dogs'), // low, moderate, high
  sociabilityHumans: text('sociability_humans'), // reserved, moderate, friendly, very_friendly
  trainability: text('trainability'), // independent, moderate, eager, very_eager
  energyIndoor: text('energy_indoor'), // calm, moderate, active
  destructivenessTendency: text('destructiveness_tendency'), // low, moderate, high

  // Health sensitivities (non-medical, for content targeting only)
  heatSensitivity: text('heat_sensitivity'), // low, moderate, high, very_high
  coldSensitivity: text('cold_sensitivity'), // low, moderate, high
  heatAlertThresholdC: real('heat_alert_threshold_c'),
  commonBreedConcerns: jsonb('common_breed_concerns').default([]),

  // Lifespan
  lifespanMinYears: integer('lifespan_min_years'),
  lifespanMaxYears: integer('lifespan_max_years'),

  // Content metadata
  onboardingTips: jsonb('onboarding_tips').default([]),
  funFacts: jsonb('fun_facts').default([]),
  breedGroupFci: text('breed_group_fci'),
  originCountry: text('origin_country'),

  // Data quality
  dataCompleteness: real('data_completeness').default(0),
  source: text('source').default('fci_standard'),
  lastUpdated: timestamp('last_updated', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_breed_size').on(table.sizeClass),
  index('idx_breed_activity').on(table.activityLevel),
  index('idx_breed_brachy').on(table.isBrachycephalic),
]);

// ─── Bleiz Freemium Templates ──────────────────────────────────────

export const bleizFreemiumTemplates = pgTable('bleiz_freemium_templates', {
  id: text('id').primaryKey(),
  category: text('category').notNull(),
  subcategory: text('subcategory'),

  // Targeting
  breedFilter: jsonb('breed_filter').default([]),
  sizeFilter: jsonb('size_filter').default([]),
  ageMinMonths: integer('age_min_months'),
  ageMaxMonths: integer('age_max_months'),
  seasonFilter: jsonb('season_filter').default([]),
  monthFilter: jsonb('month_filter').default([]),
  regionFilter: jsonb('region_filter').default(['all']),

  // Content
  titleFr: text('title_fr').notNull(),
  bodyFr: text('body_fr').notNull(),
  sourceType: text('source_type').notNull(), // educational, seasonal_alert, behavior_tip, fun_fact, community, milestone

  // Safety
  neverSay: jsonb('never_say').notNull().default([]),
  suffix: text('suffix'),
  requiresVetDisclaimer: boolean('requires_vet_disclaimer').default(false),

  // Scheduling
  channel: text('channel').notNull().default('home_insight'),
  priority: integer('priority').notNull().default(5),
  cooldownHours: integer('cooldown_hours').notNull().default(168),
  maxPerMonth: integer('max_per_month').notNull().default(2),

  // Personalization
  usesDogName: boolean('uses_dog_name').default(true),
  usesBreedName: boolean('uses_breed_name').default(true),
  usesAge: boolean('uses_age').default(false),
  usesLocation: boolean('uses_location').default(false),
  usesSeason: boolean('uses_season').default(true),

  // Metadata
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  version: integer('version').default(1),
}, (table) => [
  index('idx_bft_category').on(table.category),
]);

// ─── Local Directory ───────────────────────────────────────────────

export const localDirectory = pgTable('local_directory', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(), // veterinaire, educateur, toiletteur, pension, parc_chien, animalerie, promeneur, osteopathe_canin, comportementaliste

  // Location
  address: text('address'),
  city: text('city').notNull(),
  postalCode: text('postal_code'),
  department: text('department'),
  region: text('region').default('bretagne'),
  latitude: real('latitude'),
  longitude: real('longitude'),

  // Contact
  phone: text('phone'),
  website: text('website'),
  email: text('email'),

  // Details
  hours: jsonb('hours'),
  specialties: jsonb('specialties').default([]),
  acceptsEmergencies: boolean('accepts_emergencies').default(false),

  // Community
  ratingAvg: real('rating_avg'),
  ratingCount: integer('rating_count').default(0),
  verified: boolean('verified').default(false),

  // Source
  source: text('source').default('manual'),
  sourceId: text('source_id'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_dir_category').on(table.category),
  index('idx_dir_city').on(table.city),
  index('idx_dir_geo').on(table.latitude, table.longitude),
]);

// ─── Weather Context ───────────────────────────────────────────────

export const weatherContext = pgTable('weather_context', {
  id: serial('id').primaryKey(),
  locationKey: text('location_key').notNull(),
  date: date('date').notNull(),
  temperatureC: real('temperature_c'),
  feelsLikeC: real('feels_like_c'),
  humidityPct: integer('humidity_pct'),
  windSpeedMs: real('wind_speed_ms'),
  weatherCondition: text('weather_condition'),
  uvIndex: real('uv_index'),
  fetchedAt: timestamp('fetched_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  uniqueIndex('uq_weather_location_date').on(table.locationKey, table.date),
]);

// ─── Seasonal Alerts ───────────────────────────────────────────────

export const seasonalAlerts = pgTable('seasonal_alerts', {
  id: serial('id').primaryKey(),
  alertType: text('alert_type').notNull(),
  region: text('region').notNull().default('bretagne'),
  severity: text('severity').notNull(), // info, attention, urgent
  titleFr: text('title_fr').notNull(),
  bodyFr: text('body_fr').notNull(),
  activeFrom: date('active_from').notNull(),
  activeTo: date('active_to').notNull(),
  source: text('source'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
