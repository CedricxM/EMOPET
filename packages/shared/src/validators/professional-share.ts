import { z } from 'zod';

export const ProfessionalShareRecipientTypeSchema = z.enum([
  'VETERINARIAN',
  'VETERINARY_CLINIC',
  'RESEARCHER',
  'OTHER_PROFESSIONAL',
]);

export const ProfessionalSharePurposeSchema = z.enum([
  'VETERINARY_CONSULTATION',
  'FOLLOW_UP',
  'SECOND_OPINION',
  'RESEARCH_WITH_SEPARATE_CONSENT',
  'OTHER_DECLARED_PURPOSE',
]);

export const ProfessionalShareScopeSchema = z.enum([
  'VETERINARY_SUMMARY',
  'OWNER_SELECTED_NOTES',
  'QUALIFIED_LONGITUDINAL_OBSERVATIONS',
  'DATA_COVERAGE_AND_CONFIDENCE',
  'DECLARED_CONTEXT',
]);

export const ProfessionalShareGrantStatusSchema = z.enum([
  'PENDING',
  'ACTIVE',
  'EXPIRED',
  'REVOKED',
  'SUSPENDED',
]);

export const ProfessionalShareRecipientSchema = z.object({
  displayName: z.string().trim().min(1).max(160),
  type: ProfessionalShareRecipientTypeSchema,
  organizationName: z.string().trim().min(1).max(200).optional(),
  email: z.string().email().max(254).optional(),
  principalId: z.string().min(1).max(128).optional(),
}).superRefine((recipient, ctx) => {
  if (!recipient.email && !recipient.principalId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Recipient must be bound to an email or verified professional principal.',
      path: ['email'],
    });
  }
});

export const ProfessionalShareWindowSchema = z.object({
  dataFrom: z.string().datetime(),
  dataTo: z.string().datetime(),
  accessExpiresAt: z.string().datetime(),
}).superRefine((window, ctx) => {
  const from = Date.parse(window.dataFrom);
  const to = Date.parse(window.dataTo);
  const expires = Date.parse(window.accessExpiresAt);

  if (to < from) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'dataTo must be on or after dataFrom.',
      path: ['dataTo'],
    });
  }
  if (expires <= Date.now()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'accessExpiresAt must be in the future.',
      path: ['accessExpiresAt'],
    });
  }
});

export const ProfessionalShareGrantCreateSchema = z.object({
  dogId: z.string().uuid(),
  recipient: ProfessionalShareRecipientSchema,
  purpose: ProfessionalSharePurposeSchema,
  purposeNote: z.string().trim().max(500).optional(),
  scopes: z.array(ProfessionalShareScopeSchema).min(1).max(5),
  window: ProfessionalShareWindowSchema,
}).superRefine((grant, ctx) => {
  if (grant.purpose === 'OTHER_DECLARED_PURPOSE' && !grant.purposeNote) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'purposeNote is required for OTHER_DECLARED_PURPOSE.',
      path: ['purposeNote'],
    });
  }

  if (
    grant.purpose === 'RESEARCH_WITH_SEPARATE_CONSENT' &&
    grant.recipient.type !== 'RESEARCHER'
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Research-purpose grants require a researcher recipient type.',
      path: ['recipient', 'type'],
    });
  }
});

const GuardianProfessionalShareRecipientSchema = z.object({
  displayName: z.string().trim().min(1).max(160),
  type: ProfessionalShareRecipientTypeSchema,
  organizationName: z.string().trim().min(1).max(200).optional(),
  email: z.string().email().max(254),
}).strict();

const GuardianProfessionalShareWindowSchema = z.object({
  dataFrom: z.string().datetime(),
  dataTo: z.string().datetime(),
  accessExpiresAt: z.string().datetime(),
}).strict().superRefine((window, ctx) => {
  if (Date.parse(window.dataTo) < Date.parse(window.dataFrom)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'dataTo must be on or after dataFrom.',
      path: ['dataTo'],
    });
  }
  if (Date.parse(window.accessExpiresAt) <= Date.now()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'accessExpiresAt must be in the future.',
      path: ['accessExpiresAt'],
    });
  }
});

const GuardianProfessionalShareScopesSchema = z.array(ProfessionalShareScopeSchema)
  .min(1).max(5)
  .refine((scopes) => new Set(scopes).size === scopes.length, 'Duplicate scopes are not allowed.');

/**
 * Guardian-facing creation contract.
 *
 * The client may provide contact metadata, never a verified professional
 * principal. New grants are persisted as PENDING by the server. Research and
 * selected note/context grants stay unavailable until their separate authorities
 * are implemented rather than being smuggled through a syntactically valid body.
 */
export const GuardianProfessionalShareGrantCreateSchema = z.object({
  recipient: GuardianProfessionalShareRecipientSchema,
  purpose: ProfessionalSharePurposeSchema,
  purposeNote: z.string().trim().min(1).max(500).optional(),
  scopes: GuardianProfessionalShareScopesSchema,
  window: GuardianProfessionalShareWindowSchema,
}).strict().superRefine((grant, ctx) => {
  if (grant.purpose === 'OTHER_DECLARED_PURPOSE' && !grant.purposeNote) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'purposeNote is required for OTHER_DECLARED_PURPOSE.',
      path: ['purposeNote'],
    });
  }
  if (grant.purpose === 'RESEARCH_WITH_SEPARATE_CONSENT') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Research sharing is unavailable until separate consent authority is implemented.',
      path: ['purpose'],
    });
  }
  for (const blockedScope of ['OWNER_SELECTED_NOTES', 'DECLARED_CONTEXT'] as const) {
    if (grant.scopes.includes(blockedScope)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${blockedScope} is unavailable until selection semantics are implemented.`,
        path: ['scopes'],
      });
    }
  }
});

export const GuardianProfessionalShareGrantRevokeSchema = z.object({
  reason: z.string().trim().min(1).max(500).optional(),
}).strict();

export const ProfessionalShareGrantRevokeSchema = z.object({
  reason: z.string().trim().min(1).max(500).optional(),
});

export const ProfessionalShareGrantIdSchema = z.string().uuid();

const UniqueProfessionalShareScopesSchema = z.array(ProfessionalShareScopeSchema)
  .min(1).max(5)
  .refine((scopes) => new Set(scopes).size === scopes.length, 'Duplicate scopes are not allowed.');

/** Request intent only; caller-supplied identity, consent or grant state is rejected. */
export const ProfessionalShareReadIntentSchema = z.object({
  grantId: ProfessionalShareGrantIdSchema,
  dogId: z.string().uuid(),
  purpose: ProfessionalSharePurposeSchema,
  scopes: UniqueProfessionalShareScopesSchema,
  dataFrom: z.string().datetime(),
  dataTo: z.string().datetime(),
}).strict().refine((value) => Date.parse(value.dataTo) >= Date.parse(value.dataFrom), {
  message: 'dataTo must be on or after dataFrom.',
  path: ['dataTo'],
});

/**
 * Validate persisted authority at access time. Do not reuse the creation schema:
 * expired/revoked records must remain readable so the policy can deny explicitly.
 * Only fields used by the access policy survive this projection.
 */
export const ProfessionalShareAccessRecordSchema = z.object({
  id: ProfessionalShareGrantIdSchema,
  guardianUserId: z.string().trim().min(1).max(128),
  dogId: z.string().uuid(),
  recipient: ProfessionalShareRecipientSchema,
  purpose: ProfessionalSharePurposeSchema,
  purposeNote: z.string().trim().min(1).max(500).optional(),
  scopes: UniqueProfessionalShareScopesSchema,
  window: z.object({
    dataFrom: z.string().datetime(),
    dataTo: z.string().datetime(),
    accessExpiresAt: z.string().datetime(),
  }),
  status: ProfessionalShareGrantStatusSchema,
  createdAt: z.string().datetime(),
  activatedAt: z.string().datetime().optional(),
  revokedAt: z.string().datetime().optional(),
}).superRefine((grant, ctx) => {
  if (Date.parse(grant.window.dataTo) < Date.parse(grant.window.dataFrom)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid stored data window.' });
  }
  if (grant.purpose === 'OTHER_DECLARED_PURPOSE' && !grant.purposeNote) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Declared purpose is missing.' });
  }
});
