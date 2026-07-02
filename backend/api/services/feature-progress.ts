import { nanoid } from 'nanoid';
import {
  FEATURE_PROGRESS_CATALOG,
  type CommunityRulesAcceptInput,
  type ConsentCreateInput,
  type ConsentPurpose,
  type ConsentRecord,
  type FeatureCatalogEntry,
  type FeatureProgressCard,
  type FeatureProgressCta,
  type FeatureProgressResponse,
  type FeatureProgressStep,
  type UgcReportCreateInput,
  type UserBlockCreateInput,
  type WaitlistJoinInput,
} from '@emopet/shared';

interface WaitlistRecord {
  serviceId: string;
  channel: 'in_app' | 'email';
  joinedAt: string;
}

interface StoredReport {
  id: string;
  userId: string;
  contentId: string;
  reason: UgcReportCreateInput['reason'];
  details?: string;
  createdAt: string;
  status: 'open';
}

interface StoredBlock {
  id: string;
  blockerId: string;
  blockedId: string;
  reason?: string;
  createdAt: string;
}

const consentStore = new Map<string, ConsentRecord[]>();
const waitlistStore = new Map<string, Map<string, WaitlistRecord>>();
const communityRulesStore = new Map<string, string>();
const reportStore: StoredReport[] = [];
const blockStore: StoredBlock[] = [];

const UGC_BLACKLIST = ['haine', 'harcelement', 'violence', 'arnaque', 'spam'];

function nowIso(): string {
  return new Date().toISOString();
}

function getConsentBucket(userId: string): ConsentRecord[] {
  const existing = consentStore.get(userId);
  if (existing) {
    return existing;
  }

  const next: ConsentRecord[] = [];
  consentStore.set(userId, next);
  return next;
}

function getWaitlistBucket(userId: string): Map<string, WaitlistRecord> {
  const existing = waitlistStore.get(userId);
  if (existing) {
    return existing;
  }

  const next = new Map<string, WaitlistRecord>();
  waitlistStore.set(userId, next);
  return next;
}

function hasAcceptedConsent(userId: string, purpose: ConsentPurpose): boolean {
  const records = consentStore.get(userId) ?? [];
  const latest = [...records].reverse().find((record) => record.purpose === purpose);
  return latest?.status === 'accepted';
}

function progressFromSteps(steps: FeatureProgressStep[]): FeatureProgressCard['progress'] {
  if (steps.length === 0) {
    return { pct: 100, steps };
  }

  const doneCount = steps.filter((step) => step.state === 'done').length;
  return {
    pct: Math.round((doneCount / steps.length) * 100),
    steps,
  };
}

function buildCard(entry: FeatureCatalogEntry, userId: string): FeatureProgressCard {
  const communityOptIn = hasAcceptedConsent(userId, 'community_opt_in');
  const locationTempOptIn = hasAcceptedConsent(userId, 'location_nearby_temp');
  const communityRulesAccepted = hasAcceptedCommunityRules(userId);
  const isWaitlisted = getWaitlistBucket(userId).has(entry.serviceId);

  switch (entry.serviceId) {
    case 'community_morning_question': {
      const steps: FeatureProgressStep[] = [
        {
          key: 'community_opt_in',
          label: 'Communaute activee',
          state: communityOptIn ? 'done' : 'todo',
        },
        {
          key: 'community_rules',
          label: 'Regles communautaires acceptees',
          state: communityRulesAccepted ? 'done' : 'todo',
        },
      ];
      const locked = !(communityOptIn && communityRulesAccepted);
      const cta: FeatureProgressCta[] = locked
        ? [
            ...(communityOptIn
              ? [{
                  type: 'accept_rules' as const,
                  label: 'Accepter les regles',
                  route: '/services',
                }]
              : [{
                  type: 'consent' as const,
                  label: 'Activer la communaute',
                  purpose: 'community_opt_in' as const,
                  context: 'unlock_morning_question',
                }]),
            {
              type: 'view_progress',
              label: 'Voir ma progression',
              route: '/progress',
            },
          ]
        : [{
            type: 'open',
            label: 'Voir la question du matin',
            route: '/feed',
          }];

      return {
        ...entry,
        locked,
        lockedReason: locked
          ? communityOptIn
            ? 'Acceptation des regles requise.'
            : 'Communaute inactive.'
          : undefined,
        whyLocked: locked
          ? 'On active cette beta seulement quand la communaute est explicite et que les regles de base sont comprises.'
          : undefined,
        progress: progressFromSteps(steps),
        cta,
      };
    }
    case 'weekly_challenge_km': {
      const steps: FeatureProgressStep[] = [
        {
          key: 'community_opt_in',
          label: 'Communaute activee',
          state: communityOptIn ? 'done' : 'todo',
        },
        {
          key: 'waitlist',
          label: 'Interet signale',
          state: isWaitlisted ? 'done' : 'todo',
        },
        {
          key: 'anti_cheat',
          label: 'Classement stable et anti-triche',
          state: 'blocked',
        },
      ];

      return {
        ...entry,
        locked: true,
        lockedReason: 'En construction.',
        whyLocked:
          'On l ouvre quand les aggregations, les regles et les garde-fous anti-triche restent lisibles a grande echelle.',
        progress: progressFromSteps(steps),
        cta: [
          {
            type: 'join_waitlist',
            label: isWaitlisted ? 'Liste rejointe' : 'Rejoindre la liste',
          },
          {
            type: 'learn_more',
            label: 'En savoir plus',
            route: '/progress',
          },
        ],
      };
    }
    case 'copresence': {
      const steps: FeatureProgressStep[] = [
        {
          key: 'community_opt_in',
          label: 'Communaute activee',
          state: communityOptIn ? 'done' : 'todo',
        },
        {
          key: 'location_opt_in_temp',
          label: 'Activer la proximite (temporaire)',
          state: locationTempOptIn ? 'done' : 'todo',
        },
        {
          key: 'crossings_3',
          label: '3 croisements confirmes',
          state: 'todo',
        },
      ];

      return {
        ...entry,
        locked: true,
        lockedReason: 'Consentement proximite requis (temporaire).',
        whyLocked:
          'Aucun partage en arriere-plan: activation volontaire, temporaire, blocage et signalement avant ouverture.',
        progress: progressFromSteps(steps),
        cta: [
          {
            type: 'consent',
            label: 'Activer la proximite (temporaire)',
            purpose: 'location_nearby_temp' as const,
            context: 'unlock_copresence',
            route: '/settings/behavior',
          },
          {
            type: 'view_progress',
            label: 'Voir ma progression',
            route: '/progress',
          },
        ],
      };
    }
    case 'thematic_communities': {
      const steps: FeatureProgressStep[] = [
        {
          key: 'community_rules',
          label: 'Regles communautaires acceptees',
          state: communityRulesAccepted ? 'done' : 'todo',
        },
        {
          key: 'report_block',
          label: 'Signalement et blocage disponibles',
          state: 'done',
        },
        {
          key: 'moderation_ops',
          label: 'Moderation et outils admin prets',
          state: 'blocked',
        },
      ];

      return {
        ...entry,
        locked: true,
        lockedReason: 'Moderation obligatoire.',
        whyLocked:
          'Les groupes thematiques n ouvrent qu avec regles, signalement, blocage et capacite de moderation reelle.',
        progress: progressFromSteps(steps),
        cta: [
          ...(communityRulesAccepted
            ? []
            : [{
                type: 'accept_rules' as const,
                label: 'Accepter les regles',
                route: '/services',
              }]),
          {
            type: 'join_waitlist',
            label: isWaitlisted ? 'Liste rejointe' : 'Rejoindre la liste',
          },
        ],
      };
    }
    case 'direct_messages': {
      const steps: FeatureProgressStep[] = [
        {
          key: 'community_rules',
          label: 'Regles communautaires acceptees',
          state: communityRulesAccepted ? 'done' : 'todo',
        },
        {
          key: 'report_block',
          label: 'Blocage et signalement actifs',
          state: 'done',
        },
        {
          key: 'anti_harassment',
          label: 'Rate limits et anti-harcelement',
          state: 'blocked',
        },
      ];

      return {
        ...entry,
        locked: true,
        lockedReason: 'Protection contre le harcelement en preparation.',
        whyLocked:
          'La messagerie 1:1 ne s ouvre que quand blocage, signalement, limites de rythme et triage sont en place.',
        progress: progressFromSteps(steps),
        cta: [
          {
            type: 'learn_more',
            label: 'En savoir plus',
            route: '/progress',
          },
        ],
      };
    }
    case 'meetups': {
      const steps: FeatureProgressStep[] = [
        {
          key: 'community_opt_in',
          label: 'Communaute activee',
          state: communityOptIn ? 'done' : 'todo',
        },
        {
          key: 'offline_safety',
          label: 'Regles de securite hors ligne',
          state: 'blocked',
        },
      ];

      return {
        ...entry,
        locked: true,
        lockedReason: 'Securite hors ligne a finaliser.',
        whyLocked:
          'On montre cette fonction tot, mais on l active seulement quand les avertissements, l opt-in et le support sont prets.',
        progress: progressFromSteps(steps),
        cta: [
          {
            type: 'join_waitlist',
            label: isWaitlisted ? 'Liste rejointe' : 'Rejoindre la liste',
          },
          {
            type: 'learn_more',
            label: 'En savoir plus',
            route: '/progress',
          },
        ],
      };
    }
    case 'directory_services': {
      const steps: FeatureProgressStep[] = [
        {
          key: 'verified_partners',
          label: 'Fiches partenaires verifiees',
          state: 'blocked',
        },
        {
          key: 'contact_flow',
          label: 'Flux de contact et consentement',
          state: 'blocked',
        },
      ];

      return {
        ...entry,
        locked: true,
        lockedReason: 'Verification partenaires en cours.',
        whyLocked:
          'L annuaire reste visible, mais il n ouvre qu une fois les fiches verifiees et les contacts qualifies.',
        progress: progressFromSteps(steps),
        cta: [
          {
            type: 'learn_more',
            label: 'En savoir plus',
            route: '/progress',
          },
        ],
      };
    }
    case 'service_reviews': {
      const steps: FeatureProgressStep[] = [
        {
          key: 'community_rules',
          label: 'Regles communautaires acceptees',
          state: communityRulesAccepted ? 'done' : 'todo',
        },
        {
          key: 'report_block',
          label: 'Signalement et blocage disponibles',
          state: 'done',
        },
        {
          key: 'anti_fake',
          label: 'Detection anti-fake',
          state: 'blocked',
        },
      ];

      return {
        ...entry,
        locked: true,
        lockedReason: 'UGC et moderation pas encore assez solides.',
        whyLocked:
          'Les avis demandent moderation, anti-fake et traitement des signalements avant ouverture.',
        progress: progressFromSteps(steps),
        cta: [
          {
            type: 'learn_more',
            label: 'En savoir plus',
            route: '/progress',
          },
        ],
      };
    }
    case 'marketplace': {
      const steps: FeatureProgressStep[] = [
        {
          key: 'payments',
          label: 'Paiements integres',
          state: 'blocked',
        },
        {
          key: 'disputes',
          label: 'Gestion des litiges',
          state: 'blocked',
        },
        {
          key: 'anti_fraud',
          label: 'Anti-fraude et verification',
          state: 'blocked',
        },
      ];

      return {
        ...entry,
        locked: true,
        lockedReason: 'Paiement et anti-fraude non prets.',
        whyLocked:
          'On n ouvre pas cette surface tant que paiements, litiges et anti-fraude ne sont pas robustes.',
        progress: progressFromSteps(steps),
        cta: [
          {
            type: 'learn_more',
            label: 'En savoir plus',
            route: '/progress',
          },
        ],
      };
    }
    default:
      return {
        ...entry,
        locked: true,
        lockedReason: 'En preparation.',
        whyLocked: 'Cette fonctionnalite reste visible pour expliquer la feuille de route.',
        progress: { pct: 0, steps: [] },
        cta: [],
      };
  }
}

export function buildFeatureProgress(userId: string): FeatureProgressResponse {
  return {
    userId,
    generatedAt: nowIso(),
    services: FEATURE_PROGRESS_CATALOG.map((entry) => buildCard(entry, userId)),
  };
}

export function recordConsent(userId: string, input: ConsentCreateInput): ConsentRecord {
  if (!input.status) throw new Error('Consent status is required.');
  const record: ConsentRecord = {
    userId,
    purpose: input.purpose,
    status: input.status,
    timestamp: nowIso(),
    context: input.context,
  };
  getConsentBucket(userId).push(record);
  return record;
}

export function getConsentRecordsForUser(userId: string): ConsentRecord[] {
  return [...(consentStore.get(userId) ?? [])];
}

export function joinFeatureWaitlist(userId: string, input: WaitlistJoinInput): WaitlistRecord {
  const record: WaitlistRecord = {
    serviceId: input.serviceId,
    channel: input.channel ?? 'in_app',
    joinedAt: nowIso(),
  };
  getWaitlistBucket(userId).set(input.serviceId, record);
  return record;
}

export function acceptCommunityRules(
  userId: string,
  input: CommunityRulesAcceptInput,
): { userId: string; acceptedAt: string } {
  if (!input.accepted) {
    throw new Error('Community rules must be accepted explicitly.');
  }

  const acceptedAt = nowIso();
  communityRulesStore.set(userId, acceptedAt);
  recordConsent(userId, {
    purpose: 'community_rules',
    status: 'accepted',
    context: 'community_rules_acceptance',
  });
  return { userId, acceptedAt };
}

export function hasAcceptedCommunityRules(userId: string): boolean {
  return communityRulesStore.has(userId) || hasAcceptedConsent(userId, 'community_rules');
}

export function containsObjectionableContent(content: string): boolean {
  const normalized = content.toLowerCase();
  return UGC_BLACKLIST.some((term) => normalized.includes(term));
}

export function canCreateCommunityContent(userId: string): boolean {
  return hasAcceptedCommunityRules(userId);
}

export function createUgcReport(userId: string, input: UgcReportCreateInput): StoredReport {
  const report: StoredReport = {
    id: nanoid(),
    userId,
    contentId: input.contentId,
    reason: input.reason,
    details: input.details,
    createdAt: nowIso(),
    status: 'open',
  };
  reportStore.push(report);
  return report;
}

export function getUgcReports(): StoredReport[] {
  return [...reportStore];
}

export function createUserBlock(blockerId: string, input: UserBlockCreateInput): StoredBlock {
  const block: StoredBlock = {
    id: nanoid(),
    blockerId,
    blockedId: input.targetUserId,
    reason: input.reason,
    createdAt: nowIso(),
  };
  blockStore.push(block);
  return block;
}

export function getUserBlocks(): StoredBlock[] {
  return [...blockStore];
}
