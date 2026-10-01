import { randomUUID } from 'node:crypto';

/**
 * G1 World progression core.
 *
 * Controlled draft only: this module defines the server-owned reward contract and
 * idempotent ledger semantics, but it is not wired to an HTTP route or durable
 * database store yet.
 *
 * Invariant: the OWNER may be gamified; the dog, Care/ELI signals and inferred
 * health/wellbeing/performance may not produce World progression.
 */

export type WorldProgressionResource =
  | 'knowledgeFragments'
  | 'localDiscoveries'
  | 'walkTraces'
  | 'communitySeeds'
  | 'memoryThreads';

export type WorldProgressionEventKind =
  | 'knowledge.card_read'
  | 'local.place_saved'
  | 'local.route_saved'
  | 'community.contribution_created'
  | 'world.group_joined'
  | 'memory.created';

export type WorldProgressionGrant = Readonly<Partial<Record<WorldProgressionResource, number>>>;

export const SAFE_WORLD_REWARDS: Readonly<Record<WorldProgressionEventKind, WorldProgressionGrant>> = Object.freeze({
  'knowledge.card_read': Object.freeze({ knowledgeFragments: 1 }),
  'local.place_saved': Object.freeze({ localDiscoveries: 2 }),
  'local.route_saved': Object.freeze({ walkTraces: 2, localDiscoveries: 1 }),
  'community.contribution_created': Object.freeze({ communitySeeds: 2 }),
  'world.group_joined': Object.freeze({ communitySeeds: 1 }),
  'memory.created': Object.freeze({ memoryThreads: 2 }),
});

export const WORLD_PROGRESSION_FORBIDDEN_PREFIXES = Object.freeze([
  'eli.',
  'sensor.',
  'care.eli.',
  'dog.activity.',
  'dog.sleep.',
  'dog.rest.',
  'dog.wellbeing.',
  'dog.health.',
  'dog.emotion.',
  'relationship.score.',
  'steps.',
] as const);

export interface WorldProgressionEventInput {
  ownerId: string;
  idempotencyKey: string;
  kind: string;
  sourceRef: string;
}

export interface WorldProgressionLedgerEntry {
  id: string;
  ownerId: string;
  idempotencyKey: string;
  kind: WorldProgressionEventKind;
  sourceRef: string;
  grants: WorldProgressionGrant;
  recordedAt: Date;
}

export type WorldProgressionBalance = Record<WorldProgressionResource, number>;

export interface WorldProgressionAppendResult {
  inserted: boolean;
  entry: WorldProgressionLedgerEntry;
}

export interface WorldProgressionLedgerStore {
  /**
   * A durable implementation MUST enforce a unique constraint equivalent to
   * (owner_id, idempotency_key) and return the existing entry on duplicate.
   */
  appendIfAbsent(entry: WorldProgressionLedgerEntry): Promise<WorldProgressionAppendResult>;
  getBalance(ownerId: string): Promise<WorldProgressionBalance>;
}

export type WorldProgressionRecordResult = {
  status: 'recorded' | 'duplicate';
  entry: WorldProgressionLedgerEntry;
  balance: WorldProgressionBalance;
};

export class WorldProgressionAuthorityError extends Error {
  constructor(
    readonly code:
      | 'WORLD_PROGRESSION_EVENT_FORBIDDEN'
      | 'WORLD_PROGRESSION_EVENT_NOT_AUTHORIZED'
      | 'WORLD_PROGRESSION_INVALID_OWNER'
      | 'WORLD_PROGRESSION_INVALID_IDEMPOTENCY_KEY'
      | 'WORLD_PROGRESSION_INVALID_SOURCE_REF'
      | 'WORLD_PROGRESSION_IDEMPOTENCY_CONFLICT',
    message: string,
  ) {
    super(message);
    this.name = 'WorldProgressionAuthorityError';
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_RE = /^[A-Za-z0-9:_-]{8,128}$/;

export function isForbiddenWorldProgressionEventKind(kind: string): boolean {
  return WORLD_PROGRESSION_FORBIDDEN_PREFIXES.some((prefix) => kind.startsWith(prefix));
}

export function getAuthorizedWorldProgressionGrant(kind: string): {
  kind: WorldProgressionEventKind;
  grants: WorldProgressionGrant;
} | null {
  if (!Object.prototype.hasOwnProperty.call(SAFE_WORLD_REWARDS, kind)) return null;
  const authorizedKind = kind as WorldProgressionEventKind;
  return { kind: authorizedKind, grants: SAFE_WORLD_REWARDS[authorizedKind] };
}

export class WorldProgressionLedgerService {
  constructor(
    private readonly store: WorldProgressionLedgerStore,
    private readonly now: () => Date = () => new Date(),
    private readonly newId: () => string = () => randomUUID(),
  ) {}

  async record(input: WorldProgressionEventInput): Promise<WorldProgressionRecordResult> {
    validateInput(input);

    if (isForbiddenWorldProgressionEventKind(input.kind)) {
      throw new WorldProgressionAuthorityError(
        'WORLD_PROGRESSION_EVENT_FORBIDDEN',
        'Dog/Care/ELI-derived events cannot produce World progression.',
      );
    }

    const authorized = getAuthorizedWorldProgressionGrant(input.kind);
    if (!authorized) {
      throw new WorldProgressionAuthorityError(
        'WORLD_PROGRESSION_EVENT_NOT_AUTHORIZED',
        'World progression event is not in the server-owned reward catalogue.',
      );
    }

    const candidate: WorldProgressionLedgerEntry = {
      id: this.newId(),
      ownerId: input.ownerId,
      idempotencyKey: input.idempotencyKey,
      kind: authorized.kind,
      sourceRef: input.sourceRef.trim(),
      grants: authorized.grants,
      recordedAt: this.now(),
    };

    const append = await this.store.appendIfAbsent(candidate);
    if (!sameLogicalEvent(append.entry, candidate)) {
      throw new WorldProgressionAuthorityError(
        'WORLD_PROGRESSION_IDEMPOTENCY_CONFLICT',
        'The idempotency key is already bound to a different World progression event.',
      );
    }

    return {
      status: append.inserted ? 'recorded' : 'duplicate',
      entry: append.entry,
      balance: await this.store.getBalance(input.ownerId),
    };
  }
}

/**
 * Test/dev helper only. Runtime persistence must use a durable store.
 * The production guard prevents accidental promotion of this store.
 */
export class InMemoryWorldProgressionLedgerStore implements WorldProgressionLedgerStore {
  private readonly entries = new Map<string, WorldProgressionLedgerEntry>();
  private readonly balances = new Map<string, WorldProgressionBalance>();

  constructor() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('InMemoryWorldProgressionLedgerStore is not production authority.');
    }
  }

  async appendIfAbsent(entry: WorldProgressionLedgerEntry): Promise<WorldProgressionAppendResult> {
    const key = ledgerKey(entry.ownerId, entry.idempotencyKey);
    const existing = this.entries.get(key);
    if (existing) return { inserted: false, entry: existing };

    this.entries.set(key, entry);
    const current = this.balances.get(entry.ownerId) ?? emptyBalance();
    this.balances.set(entry.ownerId, addGrant(current, entry.grants));
    return { inserted: true, entry };
  }

  async getBalance(ownerId: string): Promise<WorldProgressionBalance> {
    return { ...(this.balances.get(ownerId) ?? emptyBalance()) };
  }
}

function validateInput(input: WorldProgressionEventInput): void {
  if (!UUID_RE.test(input.ownerId)) {
    throw new WorldProgressionAuthorityError(
      'WORLD_PROGRESSION_INVALID_OWNER',
      'World progression owner must be a canonical UUID.',
    );
  }

  if (!IDEMPOTENCY_RE.test(input.idempotencyKey)) {
    throw new WorldProgressionAuthorityError(
      'WORLD_PROGRESSION_INVALID_IDEMPOTENCY_KEY',
      'World progression idempotency key must be 8-128 bounded token characters.',
    );
  }

  const sourceRef = input.sourceRef.trim();
  if (sourceRef.length < 1 || sourceRef.length > 160) {
    throw new WorldProgressionAuthorityError(
      'WORLD_PROGRESSION_INVALID_SOURCE_REF',
      'World progression source reference must be 1-160 characters.',
    );
  }
}

function sameLogicalEvent(a: WorldProgressionLedgerEntry, b: WorldProgressionLedgerEntry): boolean {
  return (
    a.ownerId === b.ownerId
    && a.idempotencyKey === b.idempotencyKey
    && a.kind === b.kind
    && a.sourceRef === b.sourceRef
  );
}

function ledgerKey(ownerId: string, idempotencyKey: string): string {
  return `${ownerId}\u0000${idempotencyKey}`;
}

function emptyBalance(): WorldProgressionBalance {
  return {
    knowledgeFragments: 0,
    localDiscoveries: 0,
    walkTraces: 0,
    communitySeeds: 0,
    memoryThreads: 0,
  };
}

function addGrant(balance: WorldProgressionBalance, grant: WorldProgressionGrant): WorldProgressionBalance {
  const next = { ...balance };
  for (const [resource, amount] of Object.entries(grant) as Array<[WorldProgressionResource, number]>) {
    next[resource] += amount;
  }
  return next;
}
