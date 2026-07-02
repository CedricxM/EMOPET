import {
  FEATURE_PROGRESS_CATALOG,
  type ConsentCreateInput,
  type ConsentPurpose,
  type ConsentRecord,
  type FeatureCatalogEntry,
  type FeatureProgressCard,
  type FeatureProgressCta,
  type FeatureProgressResponse,
  type FeatureProgressStep,
} from '@emopet/shared';

import { apiRequest } from './api';

export interface FeatureProgressLocalContext {
  userId?: string | null;
  communityRulesAccepted: boolean;
  waitlistedServiceIds: string[];
  consents: {
    location_opt_in: boolean;
    community_opt_in: boolean;
    vet_export_opt_in: boolean;
  };
}

export interface WaitlistResponse {
  serviceId: string;
  channel: 'in_app' | 'email';
  joinedAt: string;
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

function localCard(
  entry: FeatureCatalogEntry,
  context: FeatureProgressLocalContext,
): FeatureProgressCard {
  const communityOptIn = context.consents.community_opt_in;
  const locationTempOptIn = context.consents.location_opt_in;
  const communityRulesAccepted = context.communityRulesAccepted;
  const isWaitlisted = context.waitlistedServiceIds.includes(entry.serviceId);

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
          ? 'On l active seulement quand la communaute est explicite et que les regles de base sont comprises.'
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
          'On l ouvre quand les aggregations, les regles et les garde-fous anti-triche sont stables.',
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
          'Aucun partage en arriere-plan. Activation volontaire, temporaire, et desactivation simple.',
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
          'Les groupes thematiques n ouvrent qu avec regles, signalement, blocage et capacite de moderation.',
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
    case 'direct_messages':
    case 'meetups':
    case 'directory_services':
    case 'service_reviews':
    case 'marketplace':
    default:
      return {
        ...entry,
        locked: true,
        lockedReason:
          entry.serviceId === 'direct_messages'
            ? 'Protection contre le harcelement en preparation.'
            : entry.serviceId === 'meetups'
              ? 'Securite hors ligne a finaliser.'
              : entry.serviceId === 'directory_services'
                ? 'Verification partenaires en cours.'
                : entry.serviceId === 'service_reviews'
                  ? 'UGC et moderation pas encore assez solides.'
                  : 'Paiement et anti-fraude non prets.',
        whyLocked:
          entry.serviceId === 'marketplace'
            ? 'On n ouvre pas cette surface tant que paiements, litiges et anti-fraude ne sont pas robustes.'
            : 'Cette fonctionnalite reste visible avec son verrou pour expliquer ce qu il manque avant ouverture.',
        progress: progressFromSteps(
          entry.serviceId === 'direct_messages'
            ? [
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
              ]
            : entry.serviceId === 'meetups'
              ? [
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
                ]
              : entry.serviceId === 'directory_services'
                ? [
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
                  ]
                : entry.serviceId === 'service_reviews'
                  ? [
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
                    ]
                  : [
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
                    ],
        ),
        cta: [
          {
            type: entry.serviceId === 'meetups' ? 'join_waitlist' : 'learn_more',
            label:
              entry.serviceId === 'meetups' && isWaitlisted ? 'Liste rejointe' :
              entry.serviceId === 'meetups' ? 'Rejoindre la liste' :
              'En savoir plus',
            route: '/progress',
          },
        ],
      };
  }
}

export function buildLocalFeatureProgress(
  context: FeatureProgressLocalContext,
): FeatureProgressResponse {
  return {
    userId: context.userId ?? 'demo-user',
    generatedAt: new Date().toISOString(),
    services: FEATURE_PROGRESS_CATALOG.map((entry) => localCard(entry, context)),
  };
}

export async function fetchFeatureProgress(
  token: string | null | undefined,
  context: FeatureProgressLocalContext,
): Promise<FeatureProgressResponse> {
  if (!token) {
    return buildLocalFeatureProgress(context);
  }

  return apiRequest<FeatureProgressResponse>('/api/feature-progress', { token });
}

export async function saveFeatureConsent(
  token: string | null | undefined,
  input: ConsentCreateInput,
): Promise<ConsentRecord> {
  if (!token) {
    return {
      userId: 'demo-user',
      purpose: input.purpose,
      status: input.status ?? 'accepted',
      timestamp: new Date().toISOString(),
      context: input.context,
    };
  }

  return apiRequest<ConsentRecord>('/api/feature-progress/consents', {
    method: 'POST',
    body: input,
    token,
  });
}

export async function joinFeatureWaitlistRequest(
  token: string | null | undefined,
  serviceId: string,
): Promise<WaitlistResponse> {
  if (!token) {
    return {
      serviceId,
      channel: 'in_app',
      joinedAt: new Date().toISOString(),
    };
  }

  return apiRequest<WaitlistResponse>('/api/feature-progress/waitlist', {
    method: 'POST',
    body: { serviceId },
    token,
  });
}

export async function acceptCommunityRulesRequest(
  token: string | null | undefined,
): Promise<{ userId: string; acceptedAt: string }> {
  if (!token) {
    return {
      userId: 'demo-user',
      acceptedAt: new Date().toISOString(),
    };
  }

  return apiRequest<{ userId: string; acceptedAt: string }>('/api/community/rules/accept', {
    method: 'POST',
    body: { accepted: true },
    token,
  });
}

export function getConsentPromptCopy(
  purpose: ConsentPurpose,
): { title: string; body: string; confirmLabel: string; cancelLabel: string } {
  if (purpose === 'location_nearby_temp') {
    return {
      title: 'Activer la proximite (temporaire) ?',
      body:
        'EMOPET utilise votre localisation uniquement quand vous utilisez cette fonction pour suggerer des rencontres de copresence. Vous pouvez desactiver a tout moment. Pas de partage en continu.',
      confirmLabel: 'Activer maintenant',
      cancelLabel: 'Plus tard',
    };
  }

  return {
    title: 'Activer la communaute ?',
    body:
      'La communaute active les fonctions collectives visibles dans EMOPET. Vous gardez le controle et pouvez revenir en arriere plus tard.',
    confirmLabel: 'Activer',
    cancelLabel: 'Plus tard',
  };
}
