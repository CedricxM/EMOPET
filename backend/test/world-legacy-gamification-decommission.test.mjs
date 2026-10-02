import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const plan = JSON.parse(
  await readFile(
    new URL('../../config/world/world-legacy-gamification-decommission-v1.json', import.meta.url),
    'utf8',
  ),
);
const replayAuthority = JSON.parse(
  await readFile(
    new URL('../../config/world/world-legacy-replay-authority-v1.json', import.meta.url),
    'utf8',
  ),
);
const authority = JSON.parse(
  await readFile(
    new URL('../../config/world/world-progression-authority-v1.json', import.meta.url),
    'utf8',
  ),
);
const gamificationSource = await readFile(
  new URL('../../apps/web/lib/gamification.ts', import.meta.url),
  'utf8',
);
const communitySource = await readFile(
  new URL('../../apps/web/lib/community.ts', import.meta.url),
  'utf8',
);

test('legacy decommission plan remains non-authoritative', () => {
  assert.equal(plan.status, 'CONTROLLED_MIGRATION_PLAN_NOT_RUNTIME_AUTHORITY');
  assert.equal(plan.productionAuthority, false);
});

test('every observed legacy browser key remains grounded in current source', () => {
  const allSource = gamificationSource + '\n' + communitySource;

  for (const surface of plan.legacySurfaces) {
    assert.equal(surface.storage, 'localStorage');
    for (const key of surface.keys) {
      assert.equal(
        allSource.includes(key),
        true,
        `legacy key ${key} disappeared; review the decommission plan rather than silently declaring migration complete`,
      );
    }
  }

  assert.match(gamificationSource, /localStorage\.getItem/);
  assert.match(gamificationSource, /localStorage\.setItem/);
});

test('only already-authorised G1 event kinds may be replay candidates', () => {
  const allowed = new Set(Object.keys(authority.rewards));

  for (const surface of plan.legacySurfaces) {
    if (surface.migrationClass === 'CANONICAL_REPLAY_CANDIDATE') {
      assert.equal(
        allowed.has(surface.targetEventKind),
        true,
        `${surface.id} targets unauthorised event ${surface.targetEventKind}`,
      );
    } else {
      assert.equal(surface.targetEventKind, null);
    }
  }
});

test('journal walk records cannot be silently reinterpreted as saved-route rewards', () => {
  const journal = plan.legacySurfaces.find((surface) => surface.id === 'journal_entries');
  assert.ok(journal);
  assert.equal(journal.migrationClass, 'CONTENT_ONLY_NO_G1_REWARD');
  assert.equal(journal.targetEventKind, null);
  assert.match(journal.reason, /not equivalent to an explicit saved route/i);
});

test('community event counter cannot be coerced into another reward kind', () => {
  const events = plan.legacySurfaces.find((surface) => surface.id === 'community_events');
  assert.ok(events);
  assert.equal(events.migrationClass, 'CONTENT_ONLY_NO_G1_REWARD');
  assert.equal(events.targetEventKind, null);
  assert.match(events.reason, /do not coerce/i);
});

test('mock and aggregate counters never mint progression directly', () => {
  assert.equal(plan.mockHistoryPolicy.baseCountersMayMintProgression, false);

  const forbidden = new Set(
    plan.nonMigratableLegacyCounters.map((item) => item.field),
  );
  for (const field of [
    'baselineFrozen',
    'validDataDays',
    'walks',
    'photos',
    'eventsParticipated',
    'questionsAnswered',
    'mapPointsAdded',
    'circlesJoined',
    'eventsOrganized',
  ]) {
    assert.equal(forbidden.has(field), true, `missing non-migratable counter ${field}`);
  }

  assert.match(gamificationSource, /const BASE_COUNTERS/);
  assert.match(gamificationSource, /validDataDays/);
  assert.match(gamificationSource, /baselineFrozen/);
});

test('dog/Care/ELI-derived legacy state cannot be promoted through migration', () => {
  const text = JSON.stringify(plan).toLowerCase();

  assert.match(text, /dog\/sensor data-day metric; forbidden reward source/);
  assert.match(text, /mint zero progression/);
  assert.equal(
    plan.cutoverRules.some((rule) =>
      /bulk-convert legacy numeric counters/i.test(rule)
    ),
    true,
  );
});

test('cutover requires one server authority and no dual-write period', () => {
  const rules = plan.cutoverRules.join(' ').toLowerCase();
  const criteria = plan.completionCriteria.join(' ').toLowerCase();

  assert.match(rules, /server source-authority/);
  assert.match(rules, /idempotent ledger/);
  assert.match(rules, /stop reading legacy gamification keys/);
  assert.match(criteria, /no dual-write or dual-authority/);
  assert.match(criteria, /lifecycle\/erasure treatment/);
});

test('decommission replay candidates exactly match the active controlled replay authority', () => {
  assert.equal(plan.runtimeReplayAuthority, 'config/world/world-legacy-replay-authority-v1.json');
  assert.equal(replayAuthority.status, 'CONTROLLED_DRAFT_NOT_RUNTIME_AUTHORITY');
  assert.equal(replayAuthority.productionAuthority, false);

  const candidates = new Map(
    plan.legacySurfaces
      .filter((surface) => surface.migrationClass === 'CANONICAL_REPLAY_CANDIDATE')
      .map((surface) => [surface.id, surface.targetEventKind]),
  );

  assert.deepEqual(
    [...candidates.keys()].sort(),
    Object.keys(replayAuthority.allowedReplaySurfaces).sort(),
  );

  for (const [surface, rule] of Object.entries(replayAuthority.allowedReplaySurfaces)) {
    assert.equal(
      candidates.get(surface),
      rule.eventKind,
      `decommission target for ${surface} drifted from runtime replay authority`,
    );
  }

  const explicitlyNotReplayable = new Set(replayAuthority.explicitlyNotReplayable);
  for (const surface of plan.legacySurfaces) {
    if (surface.migrationClass !== 'CANONICAL_REPLAY_CANDIDATE') {
      assert.equal(
        explicitlyNotReplayable.has(surface.id),
        true,
        `${surface.id} is content-only in the decommission plan but not denied by replay authority`,
      );
    }
  }
});

