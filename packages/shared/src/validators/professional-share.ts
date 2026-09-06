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

export const ProfessionalShareGrantRevokeSchema = z.object({
  reason: z.string().trim().min(1).max(500).optional(),
});

export const ProfessionalShareGrantIdSchema = z.string().uuid();
