import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const readiness = JSON.parse(
  await readFile(
    new URL('../../config/world/world-progression-source-readiness-v1.json', import.meta.url),
    'utf8',
  ),
);
const routing = JSON.parse(
  await readFile(
    new URL('../../config/world/world-progression-source-authority-v1.json', import.meta.url),
    'utf8',
  ),
);

const [gamificationSource, localSectionSource, journalRouteSource, communityVerifierSource] =
  await Promise.all([
    readFile(new URL('../../apps/web/lib/gamification.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../apps/web/app/quartier/LocalSection.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../apps/web/app/api/journal/route.ts', import.meta.url), 'utf8'),
    readFile(
      new URL('../api/services/world-community-progression-source.ts', import.meta.url),
      'utf8',
    ),
  ]);

async function specializedVerifierFiles() {
  const servicesDir = new URL('../api/services/', import.meta.url);
  const names = (await readdir(servicesDir)).filter((name) => name.endsWith('.ts'));
  const found = [];

  for (const name of names) {
    if (name === 'world-progression-source-authority.ts') continue;
    const source = await readFile(new URL(name, servicesDir), 'utf8');
    if (source.includes('WorldProgressionSourceVerifier')) {
      found.push(`backend/api/services/${name}`);
    }
  }

  return found.sort();
}

test('Gate 3 readiness covers exactly every declared progression source route', () => {
  assert.equal(readiness.status, 'CONTROLLED_GATE3_READINESS_NOT_RUNTIME_AUTHORITY');
  assert.equal(readiness.productionAuthority, false);
  assert.equal(readiness.defaultDecision, 'DENY');

  assert.deepEqual(
    Object.keys(readiness.events).sort(),
    Object.keys(routing.routes).sort(),
  );

  for (const [eventKind, entry] of Object.entries(readiness.events)) {
    assert.equal(entry.authorityDomain, routing.routes[eventKind].authorityDomain);
  }
});

test('only Community contribution is READY on the current repository authority', () => {
  const ready = Object.entries(readiness.events)
    .filter(([, entry]) => entry.readiness === 'READY_CANONICAL_VERIFIER_IMPLEMENTED')
    .map(([eventKind]) => eventKind);

  assert.deepEqual(ready, ['community.contribution_created']);

  const community = readiness.events['community.contribution_created'];
  assert.equal(
    community.implementationPath,
    'backend/api/services/world-community-progression-source.ts',
  );
  assert.equal(
    community.implementationSymbol,
    'drizzleCommunityContributionSourceVerifier',
  );
});

test('specialized verifier implementations cannot appear without readiness review', async () => {
  const readyPaths = Object.values(readiness.events)
    .filter((entry) => entry.readiness === 'READY_CANONICAL_VERIFIER_IMPLEMENTED')
    .map((entry) => entry.implementationPath)
    .sort();

  assert.deepEqual(await specializedVerifierFiles(), readyPaths);
});

test('blocked routes expose no implementation path and remain fail closed', () => {
  for (const [eventKind, entry] of Object.entries(readiness.events)) {
    if (entry.readiness === 'READY_CANONICAL_VERIFIER_IMPLEMENTED') continue;

    assert.equal(entry.implementationPath, null, `${eventKind} unexpectedly exposes an implementation path`);
    assert.equal(entry.implementationSymbol, null, `${eventKind} unexpectedly exposes an implementation symbol`);
    assert.ok(entry.requiredNextAuthority, `${eventKind} must name the missing authority`);
  }
});

test('Knowledge and Local saved-place actions are still browser-local evidence only', () => {
  assert.match(gamificationSource, /breiz-gamification-read/);
  assert.match(gamificationSource, /localStorage\.(getItem|setItem)/);

  assert.match(localSectionSource, /breiz-map-user-spots/);
  assert.match(localSectionSource, /localStorage\.(getItem|setItem)/);

  assert.equal(
    readiness.events['knowledge.card_read'].readiness,
    'BLOCKED_OWNER_ACTION_ONLY_BROWSER_LOCALSTORAGE',
  );
  assert.equal(
    readiness.events['local.place_saved'].readiness,
    'BLOCKED_OWNER_SAVED_PLACE_ONLY_BROWSER_LOCALSTORAGE',
  );
});

test('Memories cannot authorize progression while Product V1 persistence is unwired', () => {
  assert.match(
    journalRouteSource,
    /Product V1 Journal\/Memory persistence is not wired yet/,
  );
  assert.equal(
    readiness.events['memory.created'].readiness,
    'BLOCKED_PRODUCT_V1_MEMORY_PERSISTENCE_NOT_WIRED',
  );
});

test('Community verifier checks durable canonical authorship and stays read-only', () => {
  assert.match(communityVerifierSource, /WorldProgressionSourceVerifier/);
  assert.match(communityVerifierSource, /eq\(posts\.authorId, ownerId\)/);
  assert.match(communityVerifierSource, /eq\(communityEvents\.createdBy, ownerId\)/);
  assert.doesNotMatch(communityVerifierSource, /\.insert\(|\.update\(|\.delete\(/);
});
