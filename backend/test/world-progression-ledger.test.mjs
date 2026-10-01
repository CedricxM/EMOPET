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

test('ledger records an authorised owner action and derives rewards server-side', async () => {
  const mod = await loadLedgerModule();
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';

  try {
    const store = new mod.InMemoryWorldProgressionLedgerStore();
    const service = new mod.WorldProgressionLedgerService(
      store,
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

test('idempotency key reuse for a different event fails closed', async () => {
  const mod = await loadLedgerModule();
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';

  try {
    const store = new mod.InMemoryWorldProgressionLedgerStore();
    const service = new mod.WorldProgressionLedgerService(store);

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
    const service = new mod.WorldProgressionLedgerService(store);

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
    const service = new mod.WorldProgressionLedgerService(store);

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
