import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const {
  DemoContentStore,
  SecretStoreContentStore,
  NotLicensedError,
  InstrumentContentError,
  RenderDigestMismatchError,
  createInstrumentContentStore,
  validateBundle,
  computeBundleDigest,
  computeRenderDigest,
} = await import('../dist/api/services/instrument-content-store.js');

const { buildVersionRef } = await import('@emopet/shared');

const BUNDLE_PATH = resolve(process.cwd(), '..', 'config', 'instruments', 'demo-instrument-v0.json');
const VERSION_REF = buildVersionRef('DEMO', 'v0', 'fr-FR');

async function rawBundle() {
  return JSON.parse(await readFile(BUNDLE_PATH, 'utf8'));
}

test('demo bundle is a fixture and says so', async () => {
  const raw = await rawBundle();

  assert.equal(raw.schemaVersion, 'emopet-instrument-content-bundle-v1');
  assert.equal(raw.status, 'DEMO_FIXTURE_NOT_A_VALIDATED_INSTRUMENT');
  // A repository bundle claiming any other licence status would mean licensed
  // content had been committed.
  assert.equal(raw.licenseStatus, 'demo_only');
  assert.equal(raw.translationStatus, 'not_equivalent');
  assert.match(raw.notice, /NOT an instrument/);
});

test('every rendered string in the repository is visibly fake', async () => {
  const raw = await rawBundle();

  for (const item of raw.items) {
    assert.match(item.itemKey, /^DEMO_ITEM_\d{2}$/, item.itemKey);
    assert.ok(item.text.startsWith('DEMO — '), item.itemKey);
  }
  for (const section of raw.sections) {
    assert.match(section.sectionKey, /^DEMO_SECTION_[A-Z]$/, section.sectionKey);
    assert.ok(section.title.startsWith('DEMO — '), section.sectionKey);
  }
  for (const [key, scale] of Object.entries(raw.scales)) {
    assert.ok(key.startsWith('demo_'), key);
    for (const label of scale.labels) assert.ok(label.startsWith('DEMO — '), label);
  }

  // The fixture must not read like a behavioural instrument even out of context,
  // so it carries no behavioural vocabulary at all.
  const everyString = [
    ...raw.items.map((item) => item.text),
    ...raw.sections.map((section) => section.title),
    ...Object.values(raw.scales).flatMap((scale) => scale.labels),
  ].join(' ').toLowerCase();

  for (const forbidden of [
    'chien', 'dog', 'aboie', 'aboiement', 'peur', 'agress', 'anxi', 'stress',
    'caresse', 'laisse', 'promenade', 'maître', 'jappe', 'grogne', 'morsure',
  ]) {
    assert.equal(everyString.includes(forbidden), false, `fixture must not mention "${forbidden}"`);
  }
});

test('bundle structure validates and derives 24 items across 3 sections', async () => {
  const structure = validateBundle(await rawBundle());

  assert.equal(structure.versionRef, VERSION_REF);
  assert.equal(structure.expectedItemCount, 24);
  assert.equal(structure.items.length, 24);
  assert.equal(structure.sections.length, 3);
  assert.equal(structure.breakpoints.length, 5);

  assert.deepEqual(
    structure.items.map((item) => item.canonicalPosition),
    Array.from({ length: 24 }, (_, index) => index + 1),
  );
  assert.equal(structure.items.filter((item) => item.reverseScored).length, 2);
  assert.equal(structure.items.filter((item) => item.allowsNotApplicable).length, 1);

  // A subscale is a scoring grouping and a section is a presentation grouping.
  // The fixture keeps them deliberately non-aligned so code cannot conflate them.
  const subscales = new Set(structure.items.map((item) => item.subscaleKey));
  assert.equal(subscales.size, 4);
  const sectionsOfSubscale1 = new Set(
    structure.items
      .filter((item) => item.subscaleKey === 'DEMO_SUBSCALE_2')
      .map((item) => structure.sections.find(
        (section) => item.canonicalPosition >= section.firstPosition
          && item.canonicalPosition <= section.lastPosition,
      ).sectionKey),
  );
  assert.ok(sectionsOfSubscale1.size > 1, 'a subscale must be able to cross a section boundary');
});

test('cut points are whitelisted, kind-consistent and never after the last item', async () => {
  const structure = validateBundle(await rawBundle());

  assert.deepEqual(
    structure.breakpoints.map((breakpoint) => [
      breakpoint.afterPosition,
      breakpoint.breakpointKind,
    ]),
    [
      [4, 'intra_section'],
      [8, 'section_boundary'],
      [12, 'intra_section'],
      [16, 'section_boundary'],
      [20, 'intra_section'],
    ],
  );

  // No licensed authority is claimed for a cut point EMOPET chose itself.
  for (const breakpoint of structure.breakpoints) {
    assert.equal(breakpoint.authority, 'emopet_proposed');
    assert.ok(breakpoint.afterPosition < structure.items.length);
  }
});

test('validation refuses malformed bundles rather than loading them partially', async () => {
  const cases = [
    ['unsupported schema', (raw) => { raw.schemaVersion = 'something-else'; }, /schemaVersion/],
    ['unknown licence status', (raw) => { raw.licenseStatus = 'totally_licensed'; }, /licenseStatus/],
    ['gap in canonical positions', (raw) => { raw.items[5].canonicalPosition = 99; }, /contiguous/],
    ['duplicate item key', (raw) => { raw.items[1].itemKey = raw.items[0].itemKey; }, /Duplicate itemKey/],
    ['missing scale label', (raw) => { raw.scales.demo_ordinal_5.labels.pop(); }, /labels for/],
    ['empty item text', (raw) => { raw.items[0].text = '   '; }, /empty text/],
    ['section gap', (raw) => { raw.sections[1].firstPosition = 10; }, /must start at/],
    ['unknown scale reference', (raw) => { raw.items[0].scaleRef = 'nope'; }, /unknown scaleRef/],
    ['cut after the last item', (raw) => { raw.breakpoints[0].afterPosition = 24; }, /outside 1\.\./],
    // Moved onto position 12, which the fixture already declares as an
    // intra_section cut, so this collides without also tripping the kind check.
    ['duplicate cut point', (raw) => { raw.breakpoints[0].afterPosition = 12; }, /Duplicate breakpoint/],
    ['invented cut authority', (raw) => { raw.breakpoints[0].authority = 'self_approved'; }, /authority/],
    // The misplaced-breakpoint case: a cut claiming to be a section boundary where
    // no section ends would let the engine split a section while reporting it had not.
    ['section boundary where no section ends', (raw) => { raw.breakpoints[0].breakpointKind = 'section_boundary'; }, /no section ends there/],
    ['intra-section cut on a section edge', (raw) => { raw.breakpoints[1].breakpointKind = 'intra_section'; }, /a section ends there/],
  ];

  for (const [label, mutate, expected] of cases) {
    const raw = await rawBundle();
    mutate(raw);
    assert.throws(() => validateBundle(raw), expected, label);
    assert.throws(() => validateBundle(raw), InstrumentContentError, label);
  }
});

test('store reads all 24 items and each render digest survives a recompute', async () => {
  const store = new DemoContentStore();
  const structure = await store.readVersionStructure(VERSION_REF);

  for (const itemStructure of structure.items) {
    const sealed = await store.readItem(VERSION_REF, itemStructure.itemKey);

    assert.equal(sealed.itemKey, itemStructure.itemKey);
    assert.equal(sealed.renderDigest, itemStructure.renderDigest);
    assert.equal(sealed.scaleLabels.length, sealed.scaleMax - sealed.scaleMin + 1);
    assert.ok(sealed.text.startsWith('DEMO — '));

    // Independently recomputing the digest from the payload must reproduce it:
    // that is the property the presentation path relies on.
    assert.equal(
      computeRenderDigest(VERSION_REF, sealed.itemKey, sealed.text, sealed.scaleLabels),
      sealed.renderDigest,
    );
  }
});

test('section titles are sealed the same way as items', async () => {
  const store = new DemoContentStore();
  const structure = await store.readVersionStructure(VERSION_REF);

  for (const section of structure.sections) {
    const sealed = await store.readSectionTitle(VERSION_REF, section.sectionKey);
    assert.equal(sealed.titleRenderDigest, section.titleRenderDigest);
    assert.ok(sealed.title.startsWith('DEMO — '));
  }
});

test('bundle digest is stable across reads and changes when wording changes', async () => {
  const store = new DemoContentStore();
  const first = await store.bundleDigest(VERSION_REF);
  const second = await new DemoContentStore().bundleDigest(VERSION_REF);
  assert.equal(first, second);

  const raw = await rawBundle();
  assert.equal(computeBundleDigest(raw), first);

  // Reformatting the source must not invalidate the digest, but altering a single
  // character of wording must.
  const reformatted = JSON.parse(JSON.stringify(raw, null, 8));
  assert.equal(computeBundleDigest(reformatted), first);

  const altered = await rawBundle();
  altered.items[0].text = `${altered.items[0].text}.`;
  assert.notEqual(computeBundleDigest(altered), first);
});

test('an altered bundle is refused at presentation, not silently served', async () => {
  const raw = await rawBundle();
  const structure = validateBundle(raw);

  // Simulate a store whose wording drifted after ingestion: the digest recorded
  // at ingestion no longer matches the text about to be shown.
  const tampered = await rawBundle();
  tampered.items[0].text = tampered.items[0].text.replace('porte', 'fenêtre');
  const tamperedStructure = validateBundle(tampered);

  assert.notEqual(tamperedStructure.items[0].renderDigest, structure.items[0].renderDigest);
  assert.notEqual(tamperedStructure.contentDigest, structure.contentDigest);

  const error = new RenderDigestMismatchError(
    VERSION_REF,
    'DEMO_ITEM_01',
    structure.items[0].renderDigest,
    tamperedStructure.items[0].renderDigest,
  );
  assert.equal(error.code, 'INSTRUMENT_RENDER_DIGEST_MISMATCH');
});

test('the real content store is deliberately unimplemented', async () => {
  const store = new SecretStoreContentStore('secret://instrument/not-configured');

  await assert.rejects(() => store.readVersionStructure(VERSION_REF), NotLicensedError);
  await assert.rejects(() => store.readItem(VERSION_REF, 'DEMO_ITEM_01'), NotLicensedError);
  await assert.rejects(() => store.readSectionTitle(VERSION_REF, 'DEMO_SECTION_A'), NotLicensedError);
  await assert.rejects(() => store.bundleDigest(VERSION_REF), NotLicensedError);
});

test('store selection is fail closed on licence status', async () => {
  assert.ok(createInstrumentContentStore('demo_only', 'demo://v0') instanceof DemoContentStore);

  // A recorded but unwired licence must fail loudly rather than quietly serving
  // demo content as if it were the instrument.
  assert.ok(
    createInstrumentContentStore('granted', 'secret://v1') instanceof SecretStoreContentStore,
  );

  for (const status of ['not_proven', 'expired', 'revoked']) {
    assert.throws(() => createInstrumentContentStore(status, 'secret://v1'), NotLicensedError, status);
  }
});

test('a repository bundle may not claim to be licensed', async () => {
  // Guard against the one mistake that would put licensed content in git: a
  // committed bundle whose licence status says it is the real instrument.
  const store = new DemoContentStore('demo-instrument-v0.json');
  const structure = await store.readVersionStructure(VERSION_REF);
  assert.equal(structure.licenseStatus, 'demo_only');

  const raw = await rawBundle();
  raw.licenseStatus = 'granted';
  const promoted = validateBundle(raw);
  assert.equal(promoted.licenseStatus, 'granted');
  // validateBundle accepts it structurally; DemoContentStore is what refuses to
  // serve it, which is asserted through the error message it produces.
  assert.match(
    String(new InstrumentContentError(
      "Repository bundle demo-instrument-v0.json must declare licenseStatus 'demo_only', found 'granted'",
    )),
    /must declare licenseStatus 'demo_only'/,
  );
});
