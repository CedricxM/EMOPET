const AUTHORITY = 'CONTROLLED_DRAFT_NOT_PRODUCTION_AUTHORITY' as const;

const RESOURCE_KEYS = [
  'knowledgeFragments',
  'localDiscoveries',
  'walkTraces',
  'communitySeeds',
  'memoryThreads',
] as const;

const QUEST_CATEGORIES = ['learning', 'local', 'community', 'world', 'memory'] as const;
const EVENT_KINDS = [
  'knowledge.card_read',
  'local.place_saved',
  'local.route_saved',
  'community.contribution_created',
  'world.group_joined',
  'memory.created',
] as const;
const REASON_CODES = [
  'knowledge_read',
  'local_place_saved',
  'local_route_saved',
  'community_contribution',
  'world_group_joined',
  'memory_created',
] as const;

export type WorldGamificationResource = (typeof RESOURCE_KEYS)[number];
export type WorldGamificationQuestCategory = (typeof QUEST_CATEGORIES)[number];
export type WorldGamificationEventKind = (typeof EVENT_KINDS)[number];
export type WorldGamificationReasonCode = (typeof REASON_CODES)[number];

export type WorldGamificationBalance = Record<WorldGamificationResource, number>;

export interface WorldGamificationQuest {
  id: string;
  title: string;
  category: WorldGamificationQuestCategory;
  eventKind: WorldGamificationEventKind;
  current: number;
  target: number;
  completed: boolean;
}

export interface WorldGamificationWhyEarnedItem {
  eventId: string;
  reasonCode: WorldGamificationReasonCode;
  grants: Partial<WorldGamificationBalance>;
  recordedAt: string;
}

export interface WorldGamificationCollectionItem {
  id: string;
  title: string;
  owned: boolean;
  affordable: boolean;
}

export interface WorldGamificationReadSnapshot {
  authority: typeof AUTHORITY;
  region: {
    code: string;
    identityName: string;
    themeId: string;
  };
  resources: WorldGamificationBalance;
  quests: WorldGamificationQuest[];
  whyEarned: {
    authority: typeof AUTHORITY;
    items: WorldGamificationWhyEarnedItem[];
    grossEarned: WorldGamificationBalance;
  };
  collectionItems: WorldGamificationCollectionItem[];
  ownedItemIds: string[];
}

export class WorldGamificationClientError extends Error {
  constructor(
    readonly code:
      | 'WORLD_GAMIFICATION_CLIENT_AUTH_REQUIRED'
      | 'WORLD_GAMIFICATION_CLIENT_INVALID_REGION'
      | 'WORLD_GAMIFICATION_CLIENT_UNAVAILABLE'
      | 'WORLD_GAMIFICATION_CLIENT_INVALID_RESPONSE',
  ) {
    super(code);
    this.name = 'WorldGamificationClientError';
  }
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function assertExactKeys(
  value: UnknownRecord,
  allowed: readonly string[],
): void {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedSet.has(key)) {
      throw new WorldGamificationClientError('WORLD_GAMIFICATION_CLIENT_INVALID_RESPONSE');
    }
  }
  for (const key of allowed) {
    if (!(key in value)) {
      throw new WorldGamificationClientError('WORLD_GAMIFICATION_CLIENT_INVALID_RESPONSE');
    }
  }
}

function boundedString(value: unknown, max: number): string {
  if (typeof value !== 'string') {
    throw new WorldGamificationClientError('WORLD_GAMIFICATION_CLIENT_INVALID_RESPONSE');
  }
  const clean = value.trim();
  if (!clean || clean.length > max) {
    throw new WorldGamificationClientError('WORLD_GAMIFICATION_CLIENT_INVALID_RESPONSE');
  }
  return clean;
}

function nonNegativeInteger(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) {
    throw new WorldGamificationClientError('WORLD_GAMIFICATION_CLIENT_INVALID_RESPONSE');
  }
  return Number(value);
}

function positiveInteger(value: unknown): number {
  const parsed = nonNegativeInteger(value);
  if (parsed < 1) {
    throw new WorldGamificationClientError('WORLD_GAMIFICATION_CLIENT_INVALID_RESPONSE');
  }
  return parsed;
}

function parseBalance(value: unknown): WorldGamificationBalance {
  if (!isRecord(value)) {
    throw new WorldGamificationClientError('WORLD_GAMIFICATION_CLIENT_INVALID_RESPONSE');
  }
  assertExactKeys(value, RESOURCE_KEYS);
  return Object.fromEntries(
    RESOURCE_KEYS.map((key) => [key, nonNegativeInteger(value[key])]),
  ) as WorldGamificationBalance;
}

function parseGrant(value: unknown): Partial<WorldGamificationBalance> {
  if (!isRecord(value)) {
    throw new WorldGamificationClientError('WORLD_GAMIFICATION_CLIENT_INVALID_RESPONSE');
  }
  const keys = Object.keys(value);
  if (keys.length === 0) {
    throw new WorldGamificationClientError('WORLD_GAMIFICATION_CLIENT_INVALID_RESPONSE');
  }
  const allowed = new Set<string>(RESOURCE_KEYS);
  const grant: Partial<WorldGamificationBalance> = {};
  for (const key of keys) {
    if (!allowed.has(key)) {
      throw new WorldGamificationClientError('WORLD_GAMIFICATION_CLIENT_INVALID_RESPONSE');
    }
    grant[key as WorldGamificationResource] = positiveInteger(value[key]);
  }
  return grant;
}

function parseRegionCode(value: unknown): string {
  const code = boundedString(value, 16).toUpperCase();
  if (code !== 'GLOBAL' && !/^[A-Z]{2}-[A-Z0-9]{1,3}$/.test(code)) {
    throw new WorldGamificationClientError('WORLD_GAMIFICATION_CLIENT_INVALID_RESPONSE');
  }
  return code;
}

function parseQuest(value: unknown): WorldGamificationQuest {
  if (!isRecord(value)) {
    throw new WorldGamificationClientError('WORLD_GAMIFICATION_CLIENT_INVALID_RESPONSE');
  }
  assertExactKeys(value, ['id', 'title', 'category', 'eventKind', 'current', 'target', 'completed']);
  const category = boundedString(value.category, 32);
  const eventKind = boundedString(value.eventKind, 100);
  if (!QUEST_CATEGORIES.includes(category as WorldGamificationQuestCategory)) {
    throw new WorldGamificationClientError('WORLD_GAMIFICATION_CLIENT_INVALID_RESPONSE');
  }
  if (!EVENT_KINDS.includes(eventKind as WorldGamificationEventKind)) {
    throw new WorldGamificationClientError('WORLD_GAMIFICATION_CLIENT_INVALID_RESPONSE');
  }
  const target = positiveInteger(value.target);
  const current = nonNegativeInteger(value.current);
  if (current > target || typeof value.completed !== 'boolean') {
    throw new WorldGamificationClientError('WORLD_GAMIFICATION_CLIENT_INVALID_RESPONSE');
  }
  return {
    id: boundedString(value.id, 160),
    title: boundedString(value.title, 200),
    category: category as WorldGamificationQuestCategory,
    eventKind: eventKind as WorldGamificationEventKind,
    current,
    target,
    completed: value.completed,
  };
}

function parseWhyEarnedItem(value: unknown): WorldGamificationWhyEarnedItem {
  if (!isRecord(value)) {
    throw new WorldGamificationClientError('WORLD_GAMIFICATION_CLIENT_INVALID_RESPONSE');
  }
  assertExactKeys(value, ['eventId', 'reasonCode', 'grants', 'recordedAt']);
  const reasonCode = boundedString(value.reasonCode, 80);
  if (!REASON_CODES.includes(reasonCode as WorldGamificationReasonCode)) {
    throw new WorldGamificationClientError('WORLD_GAMIFICATION_CLIENT_INVALID_RESPONSE');
  }
  const recordedAt = boundedString(value.recordedAt, 64);
  if (!Number.isFinite(Date.parse(recordedAt))) {
    throw new WorldGamificationClientError('WORLD_GAMIFICATION_CLIENT_INVALID_RESPONSE');
  }
  return {
    eventId: boundedString(value.eventId, 160),
    reasonCode: reasonCode as WorldGamificationReasonCode,
    grants: parseGrant(value.grants),
    recordedAt,
  };
}

function parseCollectionItem(value: unknown): WorldGamificationCollectionItem {
  if (!isRecord(value)) {
    throw new WorldGamificationClientError('WORLD_GAMIFICATION_CLIENT_INVALID_RESPONSE');
  }
  assertExactKeys(value, ['id', 'title', 'owned', 'affordable']);
  if (typeof value.owned !== 'boolean' || typeof value.affordable !== 'boolean') {
    throw new WorldGamificationClientError('WORLD_GAMIFICATION_CLIENT_INVALID_RESPONSE');
  }
  return {
    id: boundedString(value.id, 160),
    title: boundedString(value.title, 200),
    owned: value.owned,
    affordable: value.affordable,
  };
}

export function parseWorldGamificationReadSnapshot(
  value: unknown,
): WorldGamificationReadSnapshot {
  if (!isRecord(value)) {
    throw new WorldGamificationClientError('WORLD_GAMIFICATION_CLIENT_INVALID_RESPONSE');
  }
  assertExactKeys(value, [
    'authority',
    'region',
    'resources',
    'quests',
    'whyEarned',
    'collectionItems',
    'ownedItemIds',
  ]);
  if (value.authority !== AUTHORITY) {
    throw new WorldGamificationClientError('WORLD_GAMIFICATION_CLIENT_INVALID_RESPONSE');
  }
  if (!isRecord(value.region)) {
    throw new WorldGamificationClientError('WORLD_GAMIFICATION_CLIENT_INVALID_RESPONSE');
  }
  assertExactKeys(value.region, ['code', 'identityName', 'themeId']);

  if (!Array.isArray(value.quests) || value.quests.length > 50) {
    throw new WorldGamificationClientError('WORLD_GAMIFICATION_CLIENT_INVALID_RESPONSE');
  }
  if (!isRecord(value.whyEarned)) {
    throw new WorldGamificationClientError('WORLD_GAMIFICATION_CLIENT_INVALID_RESPONSE');
  }
  assertExactKeys(value.whyEarned, ['authority', 'items', 'grossEarned']);
  if (value.whyEarned.authority !== AUTHORITY) {
    throw new WorldGamificationClientError('WORLD_GAMIFICATION_CLIENT_INVALID_RESPONSE');
  }
  if (!Array.isArray(value.whyEarned.items) || value.whyEarned.items.length > 100) {
    throw new WorldGamificationClientError('WORLD_GAMIFICATION_CLIENT_INVALID_RESPONSE');
  }
  if (!Array.isArray(value.collectionItems) || value.collectionItems.length > 100) {
    throw new WorldGamificationClientError('WORLD_GAMIFICATION_CLIENT_INVALID_RESPONSE');
  }
  if (!Array.isArray(value.ownedItemIds) || value.ownedItemIds.length > 500) {
    throw new WorldGamificationClientError('WORLD_GAMIFICATION_CLIENT_INVALID_RESPONSE');
  }

  const ownedItemIds = value.ownedItemIds.map((item) => boundedString(item, 160));
  if (new Set(ownedItemIds).size !== ownedItemIds.length) {
    throw new WorldGamificationClientError('WORLD_GAMIFICATION_CLIENT_INVALID_RESPONSE');
  }

  return {
    authority: AUTHORITY,
    region: {
      code: parseRegionCode(value.region.code),
      identityName: boundedString(value.region.identityName, 160),
      themeId: boundedString(value.region.themeId, 160),
    },
    resources: parseBalance(value.resources),
    quests: value.quests.map(parseQuest),
    whyEarned: {
      authority: AUTHORITY,
      items: value.whyEarned.items.map(parseWhyEarnedItem),
      grossEarned: parseBalance(value.whyEarned.grossEarned),
    },
    collectionItems: value.collectionItems.map(parseCollectionItem),
    ownedItemIds,
  };
}

function normalizeRequestedRegion(regionCode?: string | null): string | null {
  if (!regionCode) return null;
  const normalized = regionCode.trim().toUpperCase();
  if (
    normalized !== 'GLOBAL'
    && !/^[A-Z]{2}-[A-Z0-9]{1,3}$/.test(normalized)
  ) {
    throw new WorldGamificationClientError('WORLD_GAMIFICATION_CLIENT_INVALID_REGION');
  }
  return normalized;
}

export async function fetchWorldGamificationReadSnapshot(input: {
  accessToken: string;
  regionCode?: string | null;
  apiBaseUrl?: string;
  fetchImpl?: typeof fetch;
}): Promise<WorldGamificationReadSnapshot> {
  const accessToken = input.accessToken.trim();
  if (accessToken.length < 16 || /[\r\n]/.test(accessToken)) {
    throw new WorldGamificationClientError('WORLD_GAMIFICATION_CLIENT_AUTH_REQUIRED');
  }

  const regionCode = normalizeRequestedRegion(input.regionCode);
  const base = (input.apiBaseUrl ?? process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '');
  const query = regionCode ? `?region=${encodeURIComponent(regionCode)}` : '';
  const url = `${base}/api/world-gamification${query}`;
  const fetchImpl = input.fetchImpl ?? fetch;

  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
      redirect: 'error',
    });
  } catch {
    throw new WorldGamificationClientError('WORLD_GAMIFICATION_CLIENT_UNAVAILABLE');
  }

  if (response.status === 401 || response.status === 403) {
    throw new WorldGamificationClientError('WORLD_GAMIFICATION_CLIENT_AUTH_REQUIRED');
  }
  if (!response.ok) {
    throw new WorldGamificationClientError('WORLD_GAMIFICATION_CLIENT_UNAVAILABLE');
  }

  try {
    return parseWorldGamificationReadSnapshot(await response.json());
  } catch (error) {
    if (error instanceof WorldGamificationClientError) throw error;
    throw new WorldGamificationClientError('WORLD_GAMIFICATION_CLIENT_INVALID_RESPONSE');
  }
}
