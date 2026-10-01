import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function loadLedgerModule() {
  const source = await readFile(
    new URL('../api/services/world-progression-ledger.ts', import.meta.url),
    'utf8',
  );
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  const url = `data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`;
  return import(url);
}

const OWNER_ID = '11111111-1111-4111-8111-111111111111';

function allowAllSources() {
  return {
    async isAuthorizedSource() {
      return true;
    },
  };
}

test('ledger records an authorised owner action and derives rewards server-side', async () => {
  const mod = await loadLedgerModule();
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';

  try {
    const store = new mod.InMemoryWorldProgressionLedgerStore();
    const service = new mod.WorldProgressionLedgerService(
      store,
      allowAllSources(),
      () => new Date('2026-10-01T14:00:00.000Z'),
      () => 'entry-1',
    );

    const result = await service.record({
      ownerId: OWNER_ID,
      idempotencyKey: 'place:lorient:001',
      kind: 'local.place_saved',
      sourceRef: 'place:lorient-harbor',
      grants: { localDiscoveries: 999999 },
    });

    assert.equal(result.status, 'recorded');
    assert.deepEqual(result.entry.grants, { localDiscoveries: 2 });
    assert.equal(result.balance.localDiscoveries, 2);
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});

test('same idempotency key and same logical event is a no-op', async () => {
  const mod = await loadLedgerModule();
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';

  try {
    const store = new mod.InMemoryWorldProgressionLedgerStore();
    let id = 0;
    const service = new mod.WorldProgressionLedgerService(
      store,
      allowAllSources(),
      () => new Date('2026-10-01T14:00:00.000Z'),
      () => `entry-${++id}`,
    );
    const input = {
      ownerId: OWNER_ID,
      idempotencyKey: 'knowledge:card:001',
      kind: 'knowledge.card_read',
      sourceRef: 'knowledge:k-signaux',
    };

    const first = await service.record(input);
    const second = await service.record(input);

    assert.equal(first.status, 'recorded');
    assert.equal(second.status, 'duplicate');
    assert.equal(second.entry.id, first.entry.id);
    assert.equal(second.balance.knowledgeFragments, 1);
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});

test('recorded replay remains idempotent if source authority later becomes unavailable', async () => {
  const mod = await loadLedgerModule();
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';

  try {
    const store = new mod.InMemoryWorldProgressionLedgerStore();
    let authorityAvailable = true;
    let authorityCalls = 0;
    const service = new mod.WorldProgressionLedgerService(store, {
      async isAuthorizedSource() {
        authorityCalls += 1;
        if (!authorityAvailable) throw new Error('source authority offline');
        return true;
      },
    });

    const input = {
      ownerId: OWNER_ID,
      idempotencyKey: 'knowledge:replay:001',
      kind: 'knowledge.card_read',
      sourceRef: 'knowledge:canonical-card',
    };

    const first = await service.record(input);
    authorityAvailable = false;
    const replay = await service.record(input);

    assert.equal(first.status, 'recorded');
    assert.equal(replay.status, 'duplicate');
    assert.equal(replay.entry.id, first.entry.id);
    assert.equal(replay.balance.knowledgeFragments, 1);
    assert.equal(authorityCalls, 1, 'existing replay must not depend on live source authority');
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});

test('idempotency key reuse for a different event fails closed', async () => {
  const mod = await loadLedgerModule();
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';

  try {
    const store = new mod.InMemoryWorldProgressionLedgerStore();
    const service = new mod.WorldProgressionLedgerService(store, allowAllSources());

    await service.record({
      ownerId: OWNER_ID,
      idempotencyKey: 'community:event:001',
      kind: 'community.contribution_created',
      sourceRef: 'community:post:one',
    });

    await assert.rejects(
      () => service.record({
        ownerId: OWNER_ID,
        idempotencyKey: 'community:event:001',
        kind: 'community.contribution_created',
        sourceRef: 'community:post:two',
      }),
      (error) => {
        assert.equal(error.code, 'WORLD_PROGRESSION_IDEMPOTENCY_CONFLICT');
        return true;
      },
    );
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});

test('dog, sensor and ELI-derived events cannot produce progression', async () => {
  const mod = await loadLedgerModule();
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';

  try {
    const store = new mod.InMemoryWorldProgressionLedgerStore();
    const service = new mod.WorldProgressionLedgerService(store, allowAllSources());

    for (const kind of ['eli.score_changed', 'sensor.window_ready', 'dog.activity.completed']) {
      await assert.rejects(
        () => service.record({
          ownerId: OWNER_ID,
          idempotencyKey: `blocked:${kind.replaceAll('.', ':')}`,
          kind,
          sourceRef: 'forbidden-source',
        }),
        (error) => {
          assert.equal(error.code, 'WORLD_PROGRESSION_EVENT_FORBIDDEN');
          return true;
        },
      );
    }
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});

test('unknown non-forbidden events receive no reward', async () => {
  const mod = await loadLedgerModule();
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';

  try {
    const store = new mod.InMemoryWorldProgressionLedgerStore();
    const service = new mod.WorldProgressionLedgerService(store, allowAllSources());

    await assert.rejects(
      () => service.record({
        ownerId: OWNER_ID,
        idempotencyKey: 'unknown:event:001',
        kind: 'world.magic_points',
        sourceRef: 'unknown',
      }),
      (error) => {
        assert.equal(error.code, 'WORLD_PROGRESSION_EVENT_NOT_AUTHORIZED');
        return true;
      },
    );
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});

test('syntactically valid source refs still require server authority', async () => {
  const mod = await loadLedgerModule();
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';

  try {
    const store = new mod.InMemoryWorldProgressionLedgerStore();
    const seen = [];
    const service = new mod.WorldProgressionLedgerService(store, {
      async isAuthorizedSource(claim) {
        seen.push(claim);
        return false;
      },
    });

    await assert.rejects(
      () => service.record({
        ownerId: OWNER_ID,
        idempotencyKey: 'knowledge:source:001',
        kind: 'knowledge.card_read',
        sourceRef: 'knowledge:invented-but-valid',
      }),
      (error) => {
        assert.equal(error.code, 'WORLD_PROGRESSION_SOURCE_NOT_AUTHORIZED');
        return true;
      },
    );

    assert.deepEqual(seen, [{
      ownerId: OWNER_ID,
      kind: 'knowledge.card_read',
      sourceRef: 'knowledge:invented-but-valid',
    }]);
    assert.equal((await store.getBalance(OWNER_ID)).knowledgeFragments, 0);
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});

test('source-authority failures fail closed before ledger insertion', async () => {
  const mod = await loadLedgerModule();
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';

  try {
    const store = new mod.InMemoryWorldProgressionLedgerStore();
    const service = new mod.WorldProgressionLedgerService(store, {
      async isAuthorizedSource() {
        throw new Error('source store unavailable');
      },
    });

    await assert.rejects(
      () => service.record({
        ownerId: OWNER_ID,
        idempotencyKey: 'knowledge:source:002',
        kind: 'knowledge.card_read',
        sourceRef: 'knowledge:canonical',
      }),
      (error) => {
        assert.equal(error.code, 'WORLD_PROGRESSION_SOURCE_AUTHORITY_UNAVAILABLE');
        return true;
      },
    );

    assert.equal((await store.getBalance(OWNER_ID)).knowledgeFragments, 0);
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});

test('in-memory store cannot become production authority', async () => {
  const mod = await loadLedgerModule();
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';

  try {
    assert.throws(
      () => new mod.InMemoryWorldProgressionLedgerStore(),
      /not production authority/,
    );
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});


test('source references are opaque identifiers, not arbitrary user text', async () => {
  const mod = await loadLedgerModule();
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';

  try {
    const store = new mod.InMemoryWorldProgressionLedgerStore();
    const service = new mod.WorldProgressionLedgerService(store, allowAllSources());

    await assert.rejects(
      () => service.record({
        ownerId: OWNER_ID,
        idempotencyKey: 'source-ref:001',
        kind: 'memory.created',
        sourceRef: 'this is free text and must not enter the ledger',
      }),
      (error) => {
        assert.equal(error.code, 'WORLD_PROGRESSION_INVALID_SOURCE_REF');
        return true;
      },
    );
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});
