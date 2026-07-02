import { getAiPersona, getToneProfile } from '../tone/index.js';
import type {
  BleizCategory,
  BleizChannel,
  BleizContexts,
  BleizTemplate,
  ConfidenceGate,
  DogContext,
  SensorContext,
  TriggerSpec,
  UserContext,
  CommunityContext,
} from './bleiz-content-templates.js';
import { BLEIZ_TEMPLATES } from './bleiz-content-templates.js';

export interface BleizHistoryRecord {
  templateId: string;
  channel: BleizChannel;
  sentAt: Date | number | string;
}

export interface ContentJob {
  templateId: string;
  channel: BleizChannel;
  tone: BleizTemplate['tone'];
  prompt: string;
  metadata: {
    category: BleizCategory;
    priority: number;
    gate: ConfidenceGate;
    greetingInjected: boolean;
    personaDisplayName: string;
    blockedTerms: string[];
  };
  gate: ConfidenceGate;
}

export interface SchedulerOptions {
  templates?: BleizTemplate[];
  contexts: BleizContexts;
  history?: BleizHistoryRecord[];
  now?: Date;
}

export const DAILY_CHANNEL_BUDGET: Record<BleizChannel, number> = {
  push: 1,
  home_insight: 2,
  chat_message: 1,
  community_post: 3,
};

const FREE_SAFE_CATEGORIES = new Set<BleizCategory>([
  'education',
  'relationship',
  'community',
]);

const CATEGORY_PRIORITY: Record<BleizCategory, number> = {
  health_seasonal: 500,
  health_breed: 480,
  behavior: 400,
  nutrition: 340,
  activity: 300,
  environment: 260,
  relationship: 240,
  education: 220,
  milestone: 210,
  community: 150,
};

export const GLOBAL_BLACKLIST = [
  'diagnostic',
  'diagnostiquer',
  'diagnosis',
  'maladie',
  'pathologie',
  'clinical',
  'clinique',
  'traitement',
  'medicament',
  'prescription',
  'symptome',
  'euthanasie',
  'mort',
  'mourir',
  'agressif',
  'dangereux',
  'stress',
  'traumatis',
  'depress',
  'certainement',
  'sans aucun doute',
  'a coup sur',
];

const SAFETY_REPLACEMENTS: Record<string, string> = {
  diagnostic: 'observation',
  diagnostiquer: 'observer',
  diagnosis: 'observation',
  maladie: 'inconfort',
  pathologie: 'situation',
  clinical: 'prudent',
  clinique: 'prudent',
  traitement: 'accompagnement',
  medicament: 'suivi',
  prescription: 'conseil',
  symptome: 'signe du quotidien',
  euthanasie: 'accompagnement',
  mort: 'situation serieuse',
  mourir: 'aller tres mal',
  agressif: 'plus reactif',
  dangereux: 'delicat',
  stress: 'tension du jour',
  traumatis: 'bouscule',
  depress: 'moins en entrain',
  certainement: 'il semble',
  'sans aucun doute': 'il semble',
  'a coup sur': 'il semble',
};

function toRecord(value: object): Record<string, unknown> {
  return value as unknown as Record<string, unknown>;
}

function asTimestamp(value: BleizHistoryRecord['sentAt']): number {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === 'number') {
    return value;
  }

  return new Date(value).getTime();
}

function isPresent(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return true;
}

function resolveField(
  path: string,
  sensorCtx: SensorContext,
  dogCtx: DogContext,
  userCtx: UserContext,
  communityCtx?: CommunityContext,
): unknown {
  const [root, ...rest] = path.split('.');
  const base: Record<string, unknown> | undefined =
    root === 'sensor'
      ? toRecord(sensorCtx)
      : root === 'dog'
        ? toRecord(dogCtx)
        : root === 'user'
          ? toRecord(userCtx)
          : root === 'community'
            ? toRecord(communityCtx ?? {})
            : undefined;

  let current: unknown = base;
  for (const part of rest) {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

function passesTargeting(
  template: BleizTemplate,
  sensorCtx: SensorContext,
  dogCtx: DogContext,
): boolean {
  if (template.targeting.breed && !template.targeting.breed.includes(dogCtx.breed.toLowerCase())) {
    return false;
  }

  if (template.targeting.size && !template.targeting.size.includes(dogCtx.size)) {
    return false;
  }

  if (template.targeting.ageMonths) {
    const { min, max } = template.targeting.ageMonths;
    if (typeof min === 'number' && dogCtx.ageMonths < min) {
      return false;
    }
    if (typeof max === 'number' && dogCtx.ageMonths > max) {
      return false;
    }
  }

  if (
    template.targeting.seasons &&
    sensorCtx.season &&
    !template.targeting.seasons.includes(sensorCtx.season)
  ) {
    return false;
  }

  return true;
}

function usesSensorSignals(template: BleizTemplate): boolean {
  return template.triggers.some((trigger) => trigger.type === 'sensor')
    || template.required_fields.some((field) => field.startsWith('sensor.'));
}

function resolvePersonaProfile(contexts: BleizContexts) {
  return getToneProfile(contexts.user.aiToneProfile, {
    dogName: contexts.dog.name,
    locale: contexts.user.locale,
    region: contexts.user.region,
    communityDefaultProfile: contexts.community?.aiToneProfileDefault,
  });
}

function isHealthCategory(template: BleizTemplate): boolean {
  return template.category === 'health_breed' || template.category === 'health_seasonal';
}

export function hasRequiredFields(
  template: BleizTemplate,
  sensorCtx: SensorContext,
  dogCtx: DogContext,
  userCtx: UserContext,
  communityCtx?: CommunityContext,
): boolean {
  return template.required_fields.every((field) =>
    isPresent(resolveField(field, sensorCtx, dogCtx, userCtx, communityCtx)),
  );
}

function evaluateSpec(
  spec: TriggerSpec,
  sensorCtx: SensorContext,
  dogCtx: DogContext,
  userCtx: UserContext,
  communityCtx?: CommunityContext,
): boolean {
  const actual = resolveField(spec.field, sensorCtx, dogCtx, userCtx, communityCtx);
  if (spec.operator === 'exists') {
    return isPresent(actual);
  }

  if (!isPresent(actual)) {
    return false;
  }

  switch (spec.operator) {
    case 'eq':
      return actual === spec.value;
    case 'neq':
      return actual !== spec.value;
    case 'gt':
      return typeof actual === 'number' && typeof spec.value === 'number' && actual > spec.value;
    case 'gte':
      return typeof actual === 'number' && typeof spec.value === 'number' && actual >= spec.value;
    case 'lt':
      return typeof actual === 'number' && typeof spec.value === 'number' && actual < spec.value;
    case 'lte':
      return typeof actual === 'number' && typeof spec.value === 'number' && actual <= spec.value;
    case 'in':
      return Array.isArray(spec.value) && spec.value.includes(actual as never);
    case 'between':
      if (
        typeof actual !== 'number' ||
        typeof spec.value !== 'object' ||
        spec.value === null ||
        Array.isArray(spec.value)
      ) {
        return false;
      }

      return (
        (typeof spec.value.min !== 'number' || actual >= spec.value.min) &&
        (typeof spec.value.max !== 'number' || actual <= spec.value.max)
      );
    case 'contains':
      return (
        Array.isArray(actual) &&
        (typeof spec.value === 'string' || typeof spec.value === 'number') &&
        actual.includes(spec.value)
      );
    default:
      return false;
  }
}

function usesRestingSignals(template: BleizTemplate): boolean {
  const allFields = [
    ...template.required_fields,
    ...template.triggers.map((trigger) => trigger.field),
  ].join(' ');

  return /resting_rr|rest_rr_valid_today|days_with_valid_rest_data|coverage_14d|pvdf_resting/i.test(
    allFields,
  );
}

function hasValidRestBaseline(sensorCtx: SensorContext): boolean {
  return (
    sensorCtx.rest_rr_valid_today === true &&
    typeof sensorCtx.days_with_valid_rest_data === 'number' &&
    sensorCtx.days_with_valid_rest_data >= 7 &&
    typeof sensorCtx.coverage_14d === 'number' &&
    sensorCtx.coverage_14d >= 0.4
  );
}

export function publishDecision(
  template: BleizTemplate,
  contexts: BleizContexts,
): ConfidenceGate {
  const isFreeTier = contexts.user.subscription_tier === 'free';
  const sensorDriven = usesSensorSignals(template);

  if (sensorDriven && contexts.user.hardware_linked === false) {
    return 'REJECT';
  }

  if (
    !hasRequiredFields(
      template,
      contexts.sensor,
      contexts.dog,
      contexts.user,
      contexts.community,
    )
  ) {
    return 'REJECT';
  }

  if (isFreeTier) {
    if (sensorDriven) {
      return 'REJECT';
    }

    if (isHealthCategory(template)) {
      return 'DEGRADE';
    }

    if (!FREE_SAFE_CATEGORIES.has(template.category)) {
      return 'REJECT';
    }
  }

  if (usesRestingSignals(template) && !hasValidRestBaseline(contexts.sensor)) {
    if (template.category === 'health_breed' || template.category === 'health_seasonal') {
      return 'DEGRADE';
    }

    return 'REJECT';
  }

  return 'PUBLISH';
}

function countRecentDeliveries(
  history: BleizHistoryRecord[],
  templateId: string,
  sinceTimestamp: number,
): number {
  return history.filter(
    (item) => item.templateId === templateId && asTimestamp(item.sentAt) >= sinceTimestamp,
  ).length;
}

export function evaluateTrigger(
  template: BleizTemplate,
  sensorCtx: SensorContext,
  dogCtx: DogContext,
  userCtx: UserContext,
  communityCtx?: CommunityContext,
): boolean {
  if (usesSensorSignals(template) && userCtx.hardware_linked === false) {
    return false;
  }

  if (!hasRequiredFields(template, sensorCtx, dogCtx, userCtx, communityCtx)) {
    return false;
  }

  if (!passesTargeting(template, sensorCtx, dogCtx)) {
    return false;
  }

  return template.triggers.every((trigger) =>
    evaluateSpec(trigger, sensorCtx, dogCtx, userCtx, communityCtx),
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function applySafetyFilterToText(text: string, template: BleizTemplate): {
  text: string;
  blockedTerms: string[];
} {
  let next = text;
  const blockedTerms: string[] = [];
  const blacklist = [
    ...GLOBAL_BLACKLIST,
    ...template.never_say,
    ...(template.safety.blacklistOverride ?? []),
  ];

  for (const rawTerm of blacklist) {
    const term = rawTerm.toLowerCase();
    const pattern = new RegExp(escapeRegExp(rawTerm), 'gi');
    if (pattern.test(next)) {
      blockedTerms.push(term);
      next = next.replace(pattern, SAFETY_REPLACEMENTS[term] ?? '');
    }
  }

  return {
    text: next.replace(/\s{2,}/g, ' ').trim(),
    blockedTerms,
  };
}

export function filterPrompt(template: BleizTemplate, prompt: string): {
  prompt: string;
  blockedTerms: string[];
} {
  const filtered = applySafetyFilterToText(prompt, template);
  return { prompt: filtered.text, blockedTerms: filtered.blockedTerms };
}

export function filterGeneratedText(template: BleizTemplate, text: string): {
  text: string;
  blockedTerms: string[];
} {
  return applySafetyFilterToText(text, template);
}

function interpolatePrompt(template: BleizTemplate, contexts: BleizContexts): string {
  return template.prompt.replace(/\{\{([^}]+)\}\}/g, (_match: string, path: string) => {
    const value = resolveField(path.trim(), contexts.sensor, contexts.dog, contexts.user, contexts.community);
    return value === undefined || value === null ? '' : String(value);
  });
}

function resolveChannel(
  template: BleizTemplate,
  gate: ConfidenceGate,
  userCtx: UserContext,
  sensorCtx: SensorContext,
  personaProfile: ReturnType<typeof getToneProfile>,
): BleizChannel | null {
  if (userCtx.subscription_tier === 'free' && isHealthCategory(template)) {
    return template.channel === 'chat_message' ? 'chat_message' : 'home_insight';
  }

  let resolvedChannel: BleizChannel | null;

  if (gate === 'PUBLISH') {
    resolvedChannel = template.channel;
  } else if (gate === 'DEGRADE') {
    if (template.category === 'health_breed' || template.category === 'health_seasonal') {
      resolvedChannel = 'home_insight';
    } else {
      resolvedChannel = template.channel === 'push' ? 'chat_message' : template.channel;
    }
  } else {
    resolvedChannel = null;
  }

  if (!resolvedChannel) {
    return null;
  }

  if (resolvedChannel === 'push') {
    const candidateConfidence = sensorCtx.eli_confidence ?? sensorCtx.absence_confidence;
    if (
      !personaProfile.preferChannels.includes('push') ||
      (typeof candidateConfidence === 'number' && candidateConfidence < personaProfile.minPushConfidence)
    ) {
      return 'home_insight';
    }
  }

  return resolvedChannel;
}

function countChannelUsage(
  history: BleizHistoryRecord[],
  now: Date,
  channel: BleizChannel,
): number {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return history.filter(
    (item) => item.channel === channel && asTimestamp(item.sentAt) >= start.getTime(),
  ).length;
}

function noveltyBonus(history: BleizHistoryRecord[], template: BleizTemplate, now: Date): number {
  const recent = history.find((item) => item.templateId === template.id);
  if (!recent) {
    return 20;
  }

  const hoursSince = (now.getTime() - asTimestamp(recent.sentAt)) / (1000 * 60 * 60);
  return Math.max(0, Math.min(20, Math.floor(hoursSince / 24)));
}

function shouldInjectGreeting(channel: BleizChannel, sensorCtx: SensorContext): boolean {
  return channel === 'chat_message' && typeof sensorCtx.hour === 'number' && sensorCtx.hour < 11;
}

function buildPrompt(
  template: BleizTemplate,
  contexts: BleizContexts,
  channel: BleizChannel,
  gate: ConfidenceGate,
): {
  prompt: string;
  greetingInjected: boolean;
} {
  const persona = getAiPersona(contexts.user.aiToneProfile, {
    dogName: contexts.dog.name,
    locale: contexts.user.locale,
    region: contexts.user.region,
    communityDefaultProfile: contexts.community?.aiToneProfileDefault,
  });
  const toneProfile = resolvePersonaProfile(contexts);
  const greetingInjected = shouldInjectGreeting(channel, contexts.sensor);
  const systemLines = [
    `You are ${persona.displayName}, an EMOPET content assistant.`,
    'Strict rule: never diagnose, never use clinical language, never claim certainty.',
    'Regional voice is an explicit user or community choice. Never infer it from raw geolocation.',
    'If physiological data is partial, stay observational and educational only.',
    `User tier: ${contexts.user.subscription_tier ?? 'free'}. Hardware linked: ${contexts.user.hardware_linked === true ? 'yes' : 'no'}.`,
    `Persona profile: ${toneProfile.id}. Preferred channels: ${toneProfile.preferChannels.join(', ')}. Min push confidence: ${toneProfile.minPushConfidence}.`,
    `Forbidden terms include: ${[...GLOBAL_BLACKLIST, ...template.never_say].join(', ')}.`,
    `Channel: ${channel}. Tone: ${template.tone}. Gate: ${gate}.`,
  ];

  if (greetingInjected) {
    systemLines.push(`Start the generated message with exactly: "${persona.greeting}"`);
  }

  if (gate === 'DEGRADE') {
    systemLines.push(
      'Degraded mode: do not mention resting respiratory metrics or hidden physiological values.',
    );
  }

  const basePrompt = [systemLines.join('\n'), interpolatePrompt(template, contexts), template.suffix ?? '']
    .filter((item) => item.trim().length > 0)
    .join('\n\n');

  const filtered = filterPrompt(template, basePrompt);
  return { prompt: filtered.prompt, greetingInjected };
}

export function scheduleBleizContent(options: SchedulerOptions): ContentJob[] {
  const templates = options.templates ?? BLEIZ_TEMPLATES;
  const history = options.history ?? [];
  const now = options.now ?? new Date();
  const selected: ContentJob[] = [];
  const personaProfile = resolvePersonaProfile(options.contexts);

  const eligible = templates
    .map((template) => {
      const gate = publishDecision(template, options.contexts);
      const triggerOk = evaluateTrigger(
        template,
        options.contexts.sensor,
        options.contexts.dog,
        options.contexts.user,
        options.contexts.community,
      );

      return { template, gate, triggerOk };
    })
    .filter(({ template, gate, triggerOk }) => {
      if (!triggerOk) {
        return false;
      }

      const sinceCooldown =
        now.getTime() - template.cooldownHours * 60 * 60 * 1000;
      if (countRecentDeliveries(history, template.id, sinceCooldown) > 0) {
        return false;
      }

      const sinceWeek = now.getTime() - 7 * 24 * 60 * 60 * 1000;
      if (countRecentDeliveries(history, template.id, sinceWeek) >= template.weeklyBudget) {
        return false;
      }

      const todayCount = countRecentDeliveries(
        history,
        template.id,
        new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime(),
      );
      if (typeof template.maxPerDay === 'number' && todayCount >= template.maxPerDay) {
        return false;
      }

      return gate !== 'REJECT';
    })
    .sort((left, right) => {
      const leftScore =
        CATEGORY_PRIORITY[left.template.category] +
        left.template.priority +
        noveltyBonus(history, left.template, now) +
        (personaProfile.favoredCategories.includes(left.template.category) ? 25 : 0) +
        (left.gate === 'PUBLISH' ? 10 : -15);
      const rightScore =
        CATEGORY_PRIORITY[right.template.category] +
        right.template.priority +
        noveltyBonus(history, right.template, now) +
        (personaProfile.favoredCategories.includes(right.template.category) ? 25 : 0) +
        (right.gate === 'PUBLISH' ? 10 : -15);
      return rightScore - leftScore;
    });

  const dynamicHistory = [...history];
  for (const candidate of eligible) {
    const resolvedChannel = resolveChannel(
      candidate.template,
      candidate.gate,
      options.contexts.user,
      options.contexts.sensor,
      personaProfile,
    );
    if (!resolvedChannel) {
      continue;
    }

    if (
      countChannelUsage(dynamicHistory, now, resolvedChannel) >= DAILY_CHANNEL_BUDGET[resolvedChannel]
    ) {
      continue;
    }

    if (resolvedChannel === 'push' && typeof personaProfile.maxPushPerWeekOverride === 'number') {
      const sinceWeek = now.getTime() - 7 * 24 * 60 * 60 * 1000;
      const weeklyPushCount = dynamicHistory.filter(
        (item) => item.channel === 'push' && asTimestamp(item.sentAt) >= sinceWeek,
      ).length;
      if (weeklyPushCount >= personaProfile.maxPushPerWeekOverride) {
        continue;
      }
    }

    if (
      candidate.gate !== 'PUBLISH' &&
      (candidate.template.category === 'health_breed' ||
        candidate.template.category === 'health_seasonal') &&
      resolvedChannel === 'push'
    ) {
      continue;
    }

    const promptResult = buildPrompt(
      candidate.template,
      options.contexts,
      resolvedChannel,
      candidate.gate,
    );
    const filteredPrompt = filterPrompt(candidate.template, promptResult.prompt);
    const persona = getAiPersona(options.contexts.user.aiToneProfile, {
      dogName: options.contexts.dog.name,
      locale: options.contexts.user.locale,
      region: options.contexts.user.region,
      communityDefaultProfile: options.contexts.community?.aiToneProfileDefault,
    });

    selected.push({
      templateId: candidate.template.id,
      channel: resolvedChannel,
      tone: candidate.template.tone,
      prompt: filteredPrompt.prompt,
      metadata: {
        category: candidate.template.category,
        priority: candidate.template.priority,
        gate: candidate.gate,
        greetingInjected: promptResult.greetingInjected,
        personaDisplayName: persona.displayName,
        blockedTerms: filteredPrompt.blockedTerms,
      },
      gate: candidate.gate,
    });

    dynamicHistory.push({
      templateId: candidate.template.id,
      channel: resolvedChannel,
      sentAt: now,
    });
  }

  return selected;
}
