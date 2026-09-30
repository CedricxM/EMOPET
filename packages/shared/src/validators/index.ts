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

/**
 * Device/network boundary for persisted summaries. Unknown fields are rejected
 * so raw sensor payloads cannot hitchhike beside approved summary features.
 *
 * ingestionId/deviceId stay parser-optional so the route can return the
 * controlled SENSOR_PROVENANCE_REQUIRED domain error. The fresh DB baseline
 * enforces both as NOT NULL.
 */
export const SensorSummaryCreateSchema = z.object({
  timestamp: z.coerce.date(),
  dogId: z.string().uuid(),
  ingestionId: z.string().uuid().optional(),
  deviceId: z.string().uuid().optional(),
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
}).strict();


export const ActivityVariabilityFeatureTransportFrameSchema = z.object({
  transportVersion: z.literal(1),
  source: z.literal('TAG'),
  featureKey: z.literal('activity_variability'),
  featureContractVersion: z.literal('tag-activity-variability-cv30m-v1'),
  sequence: z.number().int().min(0).max(0xffff),
  bootSessionId: z.number().int().min(0).max(0xffffffff),
  windowEndMs: z.number().int().min(0).max(0xffffffff),
  windowSeconds: z.literal(1800),
  validSeconds: z.number().int().min(0).max(1800),
  observationStatus: z.enum(['OBSERVED', 'NOT_OBSERVED']),
  nullReason: z.enum([
    'INSUFFICIENT_COVERAGE',
    'MEAN_BELOW_DIVISION_GUARD',
  ]).nullable(),
  qualityState: z.enum(['VALID', 'DEGRADED', 'SUPPRESSED']),
  value: z.number().finite().min(0).nullable(),
}).strict().superRefine((value, ctx) => {
  if (value.observationStatus === 'OBSERVED') {
    if (value.value === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['value'],
        message: 'OBSERVED requires a finite non-null value',
      });
    }
    if (value.nullReason !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['nullReason'],
        message: 'OBSERVED must not carry a null reason',
      });
    }
    if (value.validSeconds < 900) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['validSeconds'],
        message: 'OBSERVED requires at least 900 valid seconds',
      });
    }
    if (value.qualityState === 'SUPPRESSED') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['qualityState'],
        message: 'OBSERVED must not be SUPPRESSED',
      });
    }
    return;
  }

  if (value.value !== null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['value'],
      message: 'NOT_OBSERVED must carry null value',
    });
  }
  if (value.nullReason === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['nullReason'],
      message: 'NOT_OBSERVED requires an explicit null reason',
    });
  }
  if (value.nullReason === 'INSUFFICIENT_COVERAGE' && value.validSeconds >= 900) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['validSeconds'],
      message: 'INSUFFICIENT_COVERAGE requires fewer than 900 valid seconds',
    });
  }
  if (value.nullReason === 'MEAN_BELOW_DIVISION_GUARD' && value.validSeconds < 900) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['validSeconds'],
      message: 'MEAN_BELOW_DIVISION_GUARD requires at least 900 valid seconds',
    });
  }
});

export const ActivityVariabilityFeatureObservationCreateSchema = z.object({
  dogId: z.string().uuid(),
  ingestionId: z.string().uuid().optional(),
  deviceId: z.string().uuid(),
  observedAt: z.coerce.date(),
  source: z.literal('TAG'),
  featureKey: z.literal('activity_variability'),
  value: z.number().finite().min(0).nullable(),
  observationStatus: z.enum(['OBSERVED', 'NOT_OBSERVED']),
  nullReason: z.enum([
    'INSUFFICIENT_COVERAGE',
    'MEAN_BELOW_DIVISION_GUARD',
  ]).nullable(),
  featureContractVersion: z.literal('tag-activity-variability-cv30m-v1'),
  windowSeconds: z.literal(1800),
  validSeconds: z.number().int().min(0).max(1800),
  qualityState: z.enum(['VALID', 'DEGRADED', 'SUPPRESSED']).optional(),
  transportProvenance: z.object({
    transportVersion: z.literal(1),
    bootSessionId: z.number().int().min(0).max(0xffffffff),
    sequence: z.number().int().min(0).max(0xffff),
    windowEndMs: z.number().int().min(0).max(0xffffffff),
  }).strict().optional(),
  eventTimeProvenance: z.object({
    strategy: z.literal('BOOT_ANCHOR_V1'),
    anchorDeviceMs: z.number().int().min(0).max(0xffffffff),
    anchorUtc: z.coerce.date(),
    uncertaintyMs: z.number().int().min(0).max(0x7fffffff),
  }).strict().optional(),
}).strict().superRefine((value, ctx) => {
  if (!value.ingestionId && !value.transportProvenance) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['ingestionId'],
      message: 'ingestionId or transportProvenance is required',
    });
  }

  if (value.eventTimeProvenance && !value.transportProvenance) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['eventTimeProvenance'],
      message: 'eventTimeProvenance requires transportProvenance',
    });
  }

  if (value.transportProvenance && !value.qualityState) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['qualityState'],
      message: 'transportProvenance requires qualityState',
    });
  }

  if (value.observationStatus === 'OBSERVED') {
    if (value.value === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['value'],
        message: 'OBSERVED requires a finite non-null value',
      });
    }
    if (value.nullReason !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['nullReason'],
        message: 'OBSERVED must not carry a null reason',
      });
    }
    if (value.qualityState === 'SUPPRESSED') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['qualityState'],
        message: 'OBSERVED must not be SUPPRESSED',
      });
    }
    if (value.validSeconds < 900) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['validSeconds'],
        message: 'OBSERVED requires at least 900 valid seconds',
      });
    }
    return;
  }

  if (value.value !== null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['value'],
      message: 'NOT_OBSERVED must carry null value',
    });
  }

  if (value.nullReason === 'INSUFFICIENT_COVERAGE' && value.validSeconds >= 900) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['validSeconds'],
      message: 'INSUFFICIENT_COVERAGE requires fewer than 900 valid seconds',
    });
  }

  if (value.nullReason === 'MEAN_BELOW_DIVISION_GUARD' && value.validSeconds < 900) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['validSeconds'],
      message: 'MEAN_BELOW_DIVISION_GUARD requires at least 900 valid seconds',
    });
  }

  if (value.nullReason === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['nullReason'],
      message: 'NOT_OBSERVED requires an explicit null reason',
    });
  }
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
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(1).max(100),
});

export const LoginSchema = z.object({
  email: z.string().trim().email(),
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

export * from './professional-share.js';


export const ActivityFeatureForwardingCandidateV1Schema = z.object({
  schemaVersion: z.literal('activity-feature-forwarding-v1'),
  dogId: z.string().uuid(),
  deviceId: z.string().uuid(),
  frame: ActivityVariabilityFeatureTransportFrameSchema,
  clockAnchor: z.object({
    strategy: z.literal('BOOT_ANCHOR_V1'),
    bootSessionId: z.number().int().min(0).max(0xffffffff),
    anchorDeviceMs: z.number().int().min(0).max(0xffffffff),
    anchorUtc: z.string().datetime(),
    uncertaintyMs: z.number().int().min(0).max(0x7fffffff),
  }).strict(),
}).strict().superRefine((value, ctx) => {
  if (value.frame.bootSessionId !== value.clockAnchor.bootSessionId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['clockAnchor', 'bootSessionId'],
      message: 'feature frame and clock anchor must share the same boot session',
    });
  }
});


export const OwnerDogCanonicalDeviceSchema = z.object({
  id: z.string().uuid(),
  dogId: z.string().uuid(),
  type: z.enum(['MAT', 'TAG']),
  firmwareVersion: z.string().nullable(),
  supportsV6Features: z.boolean(),
  bindingStatus: z.literal('BOUND'),
  physicalDeviceAuthentication: z.literal('NOT_ESTABLISHED'),
}).strict();

export const OwnerDogCanonicalDeviceRegistryResponseSchema = z.object({
  schemaVersion: z.literal('owner-dog-device-registry-v1'),
  dogId: z.string().uuid(),
  devices: z.array(OwnerDogCanonicalDeviceSchema),
  identityAuthority: z.literal('BACKEND_REGISTRY_ONLY'),
  bleTransportIdentifierIsCanonicalIdentity: z.literal(false),
  physicalDeviceAuthenticationEstablished: z.literal(false),
}).strict();


// ── Device Trust PoP contract ───────────────────────────────────

const Base64UrlNoPaddingSchema = z.string().regex(/^[A-Za-z0-9_-]+$/);

export const DeviceIdentityKeySlotV1Schema = z.enum(['A', 'B']);

export const DeviceIdentityEnrollmentReceiptV1Schema = z.object({
  schemaVersion: z.literal('device-identity-enrollment-receipt-v1'),
  protocolVersion: z.literal(1),
  credentialVersion: z.number().int().positive().max(0xffffffff),
  keySlot: DeviceIdentityKeySlotV1Schema,
  psaKeyId: z.number().int().min(0x00010000).max(0x00010001),
  algorithm: z.literal('ECDSA_P256_SHA256'),
  publicKeyFormat: z.literal('SEC1_UNCOMPRESSED_P256_65'),
  publicKey: Base64UrlNoPaddingSchema.length(87),
  firmwareVersion: z.string().trim().min(1).max(128),
  hardwareRevision: z.string().trim().min(1).max(128),
  bootstrapRevision: z.string().trim().min(1).max(128),
  state: z.literal('PENDING_PROOF'),
  privateKeyExported: z.literal(false),
  devicePrincipalBinding: z.literal('BACKEND_MANUFACTURING_AUTHORITY_REQUIRED'),
}).strict().superRefine((value, ctx) => {
  const expectedKeyId = value.keySlot === 'A' ? 0x00010000 : 0x00010001;
  if (value.psaKeyId !== expectedKeyId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['psaKeyId'],
      message: 'psaKeyId must match the reserved identity slot',
    });
  }
});

export const DevicePopPurposeV1Schema = z.literal('DEVICE_DATA_TELEMETRY_INGRESS');

export const DevicePopChallengeV1Schema = z.object({
  schemaVersion: z.literal('device-pop-challenge-v1'),
  protocolVersion: z.literal(1),
  deviceId: z.string().uuid(),
  credentialVersion: z.number().int().positive().max(0xffffffff),
  purpose: DevicePopPurposeV1Schema,
  challengeId: z.string().uuid(),
  nonce: Base64UrlNoPaddingSchema.length(43),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  signingContract: z.literal('EMOPET_DEVICE_POP_FIXED_BINARY_V1'),
}).strict().superRefine((value, ctx) => {
  const issued = Date.parse(value.issuedAt);
  const expires = Date.parse(value.expiresAt);
  if (!Number.isFinite(issued) || !Number.isFinite(expires) || expires <= issued) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['expiresAt'],
      message: 'expiresAt must be strictly after issuedAt',
    });
  }
});

export const DevicePopResponseV1Schema = z.object({
  schemaVersion: z.literal('device-pop-response-v1'),
  protocolVersion: z.literal(1),
  deviceId: z.string().uuid(),
  credentialVersion: z.number().int().positive().max(0xffffffff),
  purpose: DevicePopPurposeV1Schema,
  challengeId: z.string().uuid(),
  signatureFormat: z.literal('ECDSA_P256_SHA256_P1363_64'),
  signature: Base64UrlNoPaddingSchema.length(86),
}).strict();


// ── Device Trust activation evidence / receipt contract ─────────

export const DeviceCredentialActivationEvidenceRefsV1Schema = z.object({
  schemaVersion: z.literal('device-credential-activation-evidence-refs-v1'),
  protocolVersion: z.literal(1),
  deviceId: z.string().uuid(),
  pendingCredentialVersion: z.number().int().positive().max(0xffffffff),
  popVerificationReceiptId: z.string().uuid(),
  popChallengeId: z.string().uuid(),
  debugStateReceiptId: z.string().uuid(),
  targetEvidenceReceiptId: z.string().uuid(),
  firmwareVersion: z.string().trim().min(1).max(128),
  hardwareRevision: z.string().trim().min(1).max(128),
  bootstrapRevision: z.string().trim().min(1).max(128),
  predecessorCredentialVersion: z.number().int().positive().max(0xffffffff).nullable(),
  authority: z.literal('SERVER_SIDE_MANUFACTURING_EVIDENCE_AUTHORITY'),
  recordedAt: z.string().datetime(),
}).strict().superRefine((value, ctx) => {
  if (value.predecessorCredentialVersion === value.pendingCredentialVersion) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['predecessorCredentialVersion'],
      message: 'predecessor credential must differ from pending credential',
    });
  }
});

export const DeviceCredentialActivationReceiptV1Schema = z.object({
  schemaVersion: z.literal('device-credential-activation-receipt-v1'),
  protocolVersion: z.literal(1),
  activationId: z.string().uuid(),
  deviceId: z.string().uuid(),
  credentialVersion: z.number().int().positive().max(0xffffffff),
  predecessorCredentialVersion: z.number().int().positive().max(0xffffffff).nullable(),
  cutoverType: z.enum(['INITIAL', 'ROTATION']),
  evidenceRefs: DeviceCredentialActivationEvidenceRefsV1Schema,
  resultingCredentialState: z.literal('ACTIVE'),
  predecessorResultingState: z.enum(['NONE', 'REVOKED_PENDING_ERASE']),
  activatedAt: z.string().datetime(),
  deviceDataTrustAuthorized: z.literal(false),
  networkTelemetryPersistenceAuthorized: z.literal(false),
}).strict().superRefine((value, ctx) => {
  if (value.evidenceRefs.deviceId !== value.deviceId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['evidenceRefs', 'deviceId'],
      message: 'evidence deviceId must match activation deviceId',
    });
  }

  if (value.evidenceRefs.pendingCredentialVersion !== value.credentialVersion) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['evidenceRefs', 'pendingCredentialVersion'],
      message: 'evidence credential version must match activated credential',
    });
  }

  if (
    value.evidenceRefs.predecessorCredentialVersion
    !== value.predecessorCredentialVersion
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['evidenceRefs', 'predecessorCredentialVersion'],
      message: 'evidence predecessor must match activation predecessor',
    });
  }

  if (value.cutoverType === 'INITIAL') {
    if (value.predecessorCredentialVersion !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['predecessorCredentialVersion'],
        message: 'INITIAL activation must not name a predecessor',
      });
    }
    if (value.predecessorResultingState !== 'NONE') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['predecessorResultingState'],
        message: 'INITIAL activation requires predecessor state NONE',
      });
    }
  } else {
    if (value.predecessorCredentialVersion === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['predecessorCredentialVersion'],
        message: 'ROTATION requires a predecessor credential',
      });
    }
    if (value.predecessorResultingState !== 'REVOKED_PENDING_ERASE') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['predecessorResultingState'],
        message: 'ROTATION must retire predecessor as REVOKED_PENDING_ERASE',
      });
    }
  }

  const recordedAt = Date.parse(value.evidenceRefs.recordedAt);
  const activatedAt = Date.parse(value.activatedAt);
  if (
    Number.isFinite(recordedAt)
    && Number.isFinite(activatedAt)
    && activatedAt < recordedAt
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['activatedAt'],
      message: 'activation cannot precede controlled evidence recording',
    });
  }
});
