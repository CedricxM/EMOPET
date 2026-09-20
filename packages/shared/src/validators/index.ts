import { z } from 'zod';

// ── Dog Validators ──────────────────────────────────────────────

export const FurClassSchema = z.enum(['FC1', 'FC2', 'FC3', 'FC4']);
export const SubscriptionTierSchema = z.enum(['free', 'trial', 'kit', 'premium']);
export const AIToneProfileSchema = z.enum([
  'BREIZ',
  'BREIZIG',
  'BREIZENN',
  'BREIZOU',
  'BREIZAT',
  'BREIZ_BASE',
  'FR_BREIZ',
  'FR_NORM',
  'FR_IDF',
  'FR_PROV',
  'FR_OCC',
  'FR_ARA',
  'FR_HDF',
  'FR_GE',
  'FR_NAQ',
  'FR_PDL',
  'FR_CVL',
  'FR_BFC',
  'FR_COR',
]);
export const UserConsentsSchema = z.object({
  location_opt_in: z.boolean(),
  community_opt_in: z.boolean(),
  vet_export_opt_in: z.boolean(),
});
export const FeatureStatusSchema = z.enum(['planned', 'building', 'beta', 'shipped']);
export const FeatureStepStateSchema = z.enum(['done', 'todo', 'blocked']);
export const FeatureCtaTypeSchema = z.enum([
  'open',
  'learn_more',
  'join_waitlist',
  'consent',
  'view_progress',
  'accept_rules',
]);
export const ConsentPurposeSchema = z.enum([
  'community_opt_in',
  'community_rules',
  'location_nearby_temp',
  'directory_contact',
  'vet_report_share',
]);
export const ConsentStatusSchema = z.enum(['accepted', 'declined', 'revoked']);
export const FeatureProgressStepSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  state: FeatureStepStateSchema,
});
export const FeatureProgressCtaSchema = z.object({
  type: FeatureCtaTypeSchema,
  label: z.string().min(1),
  route: z.string().min(1).optional(),
  purpose: ConsentPurposeSchema.optional(),
  context: z.string().min(1).optional(),
});
export const FeatureProgressCardSchema = z.object({
  serviceId: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  status: FeatureStatusSchema,
  locked: z.boolean(),
  lockedReason: z.string().min(1).optional(),
  whyLocked: z.string().min(1).optional(),
  progress: z.object({
    pct: z.number().min(0).max(100),
    steps: z.array(FeatureProgressStepSchema),
  }),
  cta: z.array(FeatureProgressCtaSchema),
  tags: z.array(z.string()).optional(),
});
export const FeatureProgressResponseSchema = z.object({
  userId: z.string().min(1),
  generatedAt: z.string().datetime(),
  services: z.array(FeatureProgressCardSchema),
});
export const ConsentRecordSchema = z.object({
  userId: z.string().min(1),
  purpose: ConsentPurposeSchema,
  status: ConsentStatusSchema,
  timestamp: z.string().datetime(),
  context: z.string().optional(),
});
export const ConsentCreateSchema = z.object({
  purpose: ConsentPurposeSchema,
  status: ConsentStatusSchema,
  context: z.string().max(200).optional(),
});
export const WaitlistJoinSchema = z.object({
  serviceId: z.string().min(1),
  channel: z.enum(['in_app', 'email']).default('in_app'),
});
export const UgcReportCreateSchema = z.object({
  contentId: z.string().min(1),
  reason: z.enum(['spam', 'harassment', 'illegal', 'unsafe', 'other']),
  details: z.string().max(500).optional(),
});
export const UserBlockCreateSchema = z.object({
  targetUserId: z.string().min(1),
  reason: z.string().max(200).optional(),
});
export const CommunityRulesAcceptSchema = z.object({
  accepted: z.boolean(),
});

export const DogCreateSchema = z.object({
  name: z.string().min(1).max(50),
  breed: z.string().min(1).max(100),
  breedFciNumber: z.number().int().positive().optional(),
  birthDate: z.coerce.date(),
  sex: z.enum(['male', 'female']),
  weight: z.number().positive().max(120),
  furClass: FurClassSchema,
  photo: z.string().url().optional(),
});

export const DogUpdateSchema = DogCreateSchema.partial();

// ── ELI Validators ──────────────────────────────────────────────

export const GateStatusSchema = z.enum(['PUBLISH', 'DEGRADE', 'REJECT']);
export const ReliabilityStateSchema = z.enum(['VALID', 'DEGRADED', 'SUPPRESSED']);

export const ELIStateSchema = z.object({
  timestamp: z.coerce.date(),
  dogId: z.string().uuid(),
  arousal: z.number().finite().min(0).max(1),
  valence: z.number().finite().min(-1).max(1),
  load: z.number().finite().min(0).max(1),
  confidence: z.number().finite().min(0).max(1),
  gateStatus: GateStatusSchema,
  sensorReliability: z.object({
    pvdf: ReliabilityStateSchema,
    loadCells: ReliabilityStateSchema,
    imu: ReliabilityStateSchema,
    mic: ReliabilityStateSchema,
    piezo: ReliabilityStateSchema,
    gps: ReliabilityStateSchema,
  }),
});

// ── Sensor Summary Validators ───────────────────────────────────

export const SensorSummaryCreateSchema = z.object({
  timestamp: z.coerce.date(),
  dogId: z.string().uuid(),
  source: z.enum(['MAT', 'TAG']),
  matPresenceMinutes: z.number().min(0).max(60).optional(),
  respiratoryRate: z.object({
    mean: z.number().finite().positive(),
    std: z.number().finite().min(0),
    confidence: z.number().finite().min(0).max(1),
  }).optional(),
  weightKg: z.number().finite().positive().max(120).optional(),
  positionChanges: z.number().int().min(0).optional(),
  activityMinutes: z.number().finite().min(0).max(60).optional(),
  distanceKm: z.number().finite().min(0).optional(),
  vocalEvents: z.number().int().min(0).optional(),
  vocalEnergyMean: z.number().finite().min(0).optional(),
  postureDistribution: z.object({
    lying: z.number().finite().min(0).max(1),
    sitting: z.number().finite().min(0).max(1),
    standing: z.number().finite().min(0).max(1),
    walking: z.number().finite().min(0).max(1),
    running: z.number().finite().min(0).max(1),
  }).optional(),
  agitationEvents: z.number().int().min(0).optional(),
  temperatureC: z.number().finite().min(-40).max(60).optional(),
  humidityPct: z.number().finite().min(0).max(100).optional(),
});

// ── Community Validators ────────────────────────────────────────

export const PostCreateSchema = z.object({
  communityId: z.string().uuid(),
  type: z.enum(['moment', 'insight', 'challenge', 'event', 'help_request']),
  content: z.string().min(1).max(2000),
  mediaUrls: z.array(z.string().url()).max(9).default([]),
});

export const CommentCreateSchema = z.object({
  postId: z.string().uuid(),
  content: z.string().min(1).max(1000),
});

export const EventCreateSchema = z.object({
  communityId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).default(''),
  location: z.string().min(1).max(200),
  latitude: z.number().finite().min(-90).max(90).optional(),
  longitude: z.number().finite().min(-180).max(180).optional(),
  startsAt: z.coerce.date(),
});

// ── Health Journal Validators ───────────────────────────────────

export const HealthEntryCreateSchema = z.object({
  dogId: z.string().uuid(),
  type: z.enum(['vaccination', 'weight', 'vet_visit', 'medication', 'antiparasitic', 'note']),
  date: z.coerce.date(),
  title: z.string().min(1).max(200),
  details: z.string().max(2000).optional(),
  value: z.number().finite().optional(),
  nextDueDate: z.coerce.date().optional(),
});

// ── Auth Validators ─────────────────────────────────────────────

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ── Presence / Vet Export ───────────────────────────────────────

export const PresenceEventCreateSchema = z.object({
  dogId: z.string().uuid(),
  phoneSeen: z.boolean(),
  timestamp: z.coerce.date(),
  rssi: z.number().int().min(-120).max(0).optional(),
  source: z.enum(['phone_passive', 'manual_override']).default('phone_passive'),
});

const StrictBooleanQuerySchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === false) return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}, z.boolean().optional());

export const VetReportQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(30).default(14),
  share: StrictBooleanQuerySchema,
});
