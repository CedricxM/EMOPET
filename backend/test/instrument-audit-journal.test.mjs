import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const journalModule = await import('../dist/api/services/instrument-audit-journal.js');
const store = await import('../dist/api/services/instrument-content-store.js');
const engine = await import('../dist/api/services/instrument-administration.js');
const { AUDIT_EVENT_TYPES } = await import('@emopet/shared');

const {
  AuditJournal,
  AuditJournalError,
  auditEvent,
  assertEventAllowed,
  computeEventHash,
  fidelityReport,
  itemAnsweredEvent,
  itemPresentedEvent,
  segmentationTable,
  verifyChain,
} = journalModule;

const MIGRATION = resolve(
  process.cwd(),
  'db',
  'migrations',
  '0025_instrument_administration.sql',
);
const BUNDLE = resolve(process.cwd(), '..', 'config', 'instruments', 'demo-instrument-v0.json');

const T0 = Date.UTC(2026, 8, 28, 9, 0, 0);

test('the event vocabulary matches the database constraint exactly', async () => {
  const sql = await readFile(MIGRATION, 'utf8');
  const block = sql.match(/event_type VARCHAR\(40\) NOT NULL\s*CHECK \(event_type IN \(([\s\S]*?)\)\)/);
  assert.ok(block, 'could not locate chk_event_type in the migration');

  const inSql = [...block[1].matchAll(/'([a-z_]+)'/g)].map((match) => match[1]).sort();
  const inCode = [...AUDIT_EVENT_TYPES].sort();

  // Drift here would let the code build an event PostgreSQL refuses, or refuse one
  // PostgreSQL accepts. Either way the two layers would stop being the same rule.
  assert.deepEqual(inCode, inSql);
  assert.equal(new Set(inCode).size, inCode.length, 'no duplicates');
});

test('the journal enforces the same invariants as the database', () => {
  assert.throws(
    () => assertEventAllowed(auditEvent('item_rephrased', T0)),
    /chk_event_type/,
  );

  // An item presentation with a model in the loop is refused before it can be
  // built, not only when PostgreSQL sees it.
  assert.throws(
    () => assertEventAllowed(auditEvent('item_presented', T0, {
      itemKey: 'DEMO_ITEM_01', renderDigest: 'abc', llmInvolved: true,
    })),
    /chk_event_item_presentation/,
  );
  assert.throws(
    () => assertEventAllowed(auditEvent('item_presented', T0, { itemKey: 'DEMO_ITEM_01' })),
    /chk_event_item_presentation/,
  );
  assert.throws(
    () => assertEventAllowed(auditEvent('item_presented', T0, { renderDigest: 'abc' })),
    /chk_event_item_presentation/,
  );
  assert.throws(
    () => assertEventAllowed(auditEvent('section_title_presented', T0, {
      renderDigest: 'abc', llmInvolved: true,
    })),
    /chk_event_section_title/,
  );

  // Framing is the one place a model is allowed.
  assert.doesNotThrow(() => assertEventAllowed(auditEvent('frame_presented', T0, {
    frameTemplateId: 'FRAME_OPEN_03', frameDigest: 'def', llmInvolved: true,
  })));
});

test('the journal shape cannot carry wording or generated prose', () => {
  const journal = new AuditJournal();
  const event = journal.append(auditEvent('frame_presented', T0, {
    frameTemplateId: 'FRAME_OPEN_03', frameDigest: 'def', llmInvolved: true,
  }));

  // Every string field is a key, a digest, a template id or a code. There is no
  // field a caller could put a sentence in, which is what keeps a complete audit
  // trail compatible with never persisting AI conversational content.
  for (const forbidden of ['text', 'prose', 'message', 'content', 'body', 'title', 'label']) {
    assert.equal(
      Object.prototype.hasOwnProperty.call(event, forbidden),
      false,
      `audit entries must have no '${forbidden}' field`,
    );
  }
  assert.deepEqual(
    Object.keys(event).sort(),
    [
      'clientLatencyMs', 'covariates', 'detailCode', 'eventHash', 'eventType',
      'frameDigest', 'frameTemplateId', 'itemKey', 'llmInvolved', 'occurredAt',
      'prevEventHash', 'renderDigest', 'sectionKey', 'sequenceIndex', 'sessionIndex',
    ],
  );
});

test('the journal is append-only in time', () => {
  const journal = new AuditJournal();
  journal.append(auditEvent('assessment_opened', T0));
  journal.append(auditEvent('session_planned', T0 + 1000));

  assert.throws(
    () => journal.append(auditEvent('session_opened', T0 + 500)),
    /append-only in time/,
  );
  assert.throws(() => journal.append(auditEvent('session_opened', T0 + 500)), AuditJournalError);

  // Entries are handed out as a copy: the journal cannot be edited from outside.
  const entries = journal.entries();
  entries.pop();
  assert.equal(journal.length, 2);
});

test('an intact chain verifies, and each entry links to the previous one', () => {
  const journal = new AuditJournal();
  journal.append(auditEvent('assessment_opened', T0));
  journal.append(auditEvent('session_planned', T0 + 1000, { sessionIndex: 1 }));
  journal.append(itemPresentedEvent(T0 + 2000, 1, 'DEMO_ITEM_01', 'digest-01', 'DEMO_SECTION_A'));

  const entries = journal.entries();
  assert.equal(verifyChain(entries).status, 'VALID');
  assert.equal(verifyChain(entries).eventCount, 3);

  assert.equal(entries[0].prevEventHash, null);
  assert.equal(entries[1].prevEventHash, entries[0].eventHash);
  assert.equal(entries[2].prevEventHash, entries[1].eventHash);
  for (const entry of entries) assert.match(entry.eventHash, /^[0-9a-f]{64}$/);

  assert.equal(verifyChain([]).status, 'VALID');
});

test('verification names where and how a chain is broken', () => {
  function build() {
    const journal = new AuditJournal();
    journal.append(auditEvent('assessment_opened', T0));
    journal.append(auditEvent('session_opened', T0 + 1000, { sessionIndex: 1 }));
    journal.append(itemPresentedEvent(T0 + 2000, 1, 'DEMO_ITEM_01', 'digest-01', 'DEMO_SECTION_A'));
    journal.append(itemPresentedEvent(T0 + 3000, 1, 'DEMO_ITEM_02', 'digest-02', 'DEMO_SECTION_A'));
    return journal.entries();
  }

  // An entry rewritten in place.
  const altered = build();
  altered[2] = { ...altered[2], renderDigest: 'tampered' };
  const alteredResult = verifyChain(altered);
  assert.equal(alteredResult.status, 'BROKEN');
  assert.equal(alteredResult.reason, 'content_altered');
  assert.equal(alteredResult.firstBrokenIndex, 2);
  assert.equal(alteredResult.sequenceIndex, 2);

  // An entry removed: the sequence numbering exposes it.
  const removed = build().filter((_, index) => index !== 1);
  const removedResult = verifyChain(removed);
  assert.equal(removedResult.status, 'BROKEN');
  assert.equal(removedResult.reason, 'sequence_gap');
  assert.equal(removedResult.firstBrokenIndex, 1);

  // Two entries swapped.
  const swapped = build();
  [swapped[2], swapped[3]] = [swapped[3], swapped[2]];
  assert.equal(verifyChain(swapped).status, 'BROKEN');

  // A first entry that claims a predecessor.
  const forgedGenesis = build();
  forgedGenesis[0] = { ...forgedGenesis[0], prevEventHash: 'f'.repeat(64) };
  const genesisResult = verifyChain(forgedGenesis);
  assert.equal(genesisResult.reason, 'bad_genesis');
  assert.equal(genesisResult.firstBrokenIndex, 0);

  // A link repointed at the wrong predecessor.
  const relinked = build();
  relinked[3] = { ...relinked[3], prevEventHash: relinked[1].eventHash };
  const relinkedResult = verifyChain(relinked);
  assert.equal(relinkedResult.status, 'BROKEN');
  assert.equal(relinkedResult.firstBrokenIndex, 3);
});

test('tampering with a covariate breaks the chain', () => {
  const journal = new AuditJournal();
  journal.append(auditEvent('assessment_opened', T0));
  journal.append(
    auditEvent('item_answered', T0 + 1000, {
      sessionIndex: 1,
      itemKey: 'DEMO_ITEM_01',
      clientLatencyMs: 4200,
      detailCode: 'answered',
      covariates: {
        positionInSession: 3,
        itemsSinceResume: 3,
        hoursSincePreviousItem: 0.004,
        crossedSectionBoundary: false,
        isFirstItemAfterPause: false,
      },
    }),
  );

  const entries = journal.entries();
  assert.equal(verifyChain(entries).status, 'VALID');

  // The covariates are inside the hash on purpose. Hashing only the event type
  // and timestamps would let someone rewrite positionInSession afterwards while
  // the chain still verified, which would make the covariates worthless as
  // evidence of the segmentation each item experienced.
  for (const mutation of [
    { positionInSession: 1 },
    { itemsSinceResume: 0 },
    { hoursSincePreviousItem: 9.9 },
    { crossedSectionBoundary: true },
    { isFirstItemAfterPause: true },
  ]) {
    const tampered = [...entries];
    tampered[1] = { ...entries[1], covariates: { ...entries[1].covariates, ...mutation } };
    const result = verifyChain(tampered);
    assert.equal(result.status, 'BROKEN', JSON.stringify(mutation));
    assert.equal(result.reason, 'content_altered');
  }
});

test('the hash covers every semantic field', () => {
  const base = auditEvent('item_answered', T0, {
    sessionIndex: 1,
    itemKey: 'DEMO_ITEM_01',
    sectionKey: 'DEMO_SECTION_A',
    renderDigest: 'rd',
    frameTemplateId: 'FRAME_OPEN_03',
    frameDigest: 'fd',
    clientLatencyMs: 1234,
    detailCode: 'answered',
  });
  const reference = computeEventHash(base, 0, null);

  const variants = [
    { eventType: 'item_revised' },
    { occurredAt: T0 + 1 },
    { sessionIndex: 2 },
    { itemKey: 'DEMO_ITEM_02' },
    { sectionKey: 'DEMO_SECTION_B' },
    { renderDigest: 'rd2' },
    { frameTemplateId: 'FRAME_OPEN_04' },
    { frameDigest: 'fd2' },
    { llmInvolved: true },
    { clientLatencyMs: 1235 },
    { detailCode: 'skipped' },
  ];
  for (const variant of variants) {
    assert.notEqual(
      computeEventHash({ ...base, ...variant }, 0, null),
      reference,
      `changing ${Object.keys(variant)[0]} must change the hash`,
    );
  }

  // Position in the chain is part of the hash too, so an entry cannot be moved.
  assert.notEqual(computeEventHash(base, 1, null), reference);
  assert.notEqual(computeEventHash(base, 0, 'a'.repeat(64)), reference);
});

test('a full administration produces a verifiable trail and a segmentation table', async () => {
  const structure = store.validateBundle(JSON.parse(await readFile(BUNDLE, 'utf8')));
  const plan = engine.buildPlan(structure);
  const contentStore = new store.DemoContentStore();
  const journal = new AuditJournal();

  const policy = {
    policyKey: 'SEQUENTIAL_OWNER_PACED',
    administrationMode: 'progressive',
    orderStrategy: 'canonical',
    targetSessionMinutes: 3,
    minItemsPerSession: 5,
    maxItemsPerSession: 15,
    adaptiveSizing: true,
    adaptiveSignals: ['median_session_duration', 'completion_rate', 'pause_frequency'],
    allowChaining: true,
    maxSessions: null,
    maxWindowHours: 336,
    maxSessionGapHours: 72,
    minInterItemMs: 800,
    allowResume: true,
    allowRevision: false,
    allowMidSessionPause: true,
    maxRemindersPerMissedSession: 2,
    deadlineWarningHoursBefore: 48,
    deadlineWarningCountsAsReminder: true,
    fatigueResponseMode: 'silent_flag',
    maxScientificUseStatus: 'research_only',
  };

  let state = engine.createAdministration(policy, plan, T0);
  let clock = T0;
  journal.append(auditEvent('assessment_opened', clock));

  while (state.cursor <= plan.expectedItemCount) {
    state = engine.planNextSession(state, {}, clock);
    const session = state.sessions[state.sessions.length - 1];
    journal.append(auditEvent('session_planned', clock, { sessionIndex: session.sessionIndex }));
    journal.append(auditEvent('session_size_decided', clock, {
      sessionIndex: session.sessionIndex,
      detailCode: session.sizingDecision,
    }));

    // Framing: the one place a model may speak, and it never touches an item.
    journal.append(auditEvent('frame_presented', clock, {
      sessionIndex: session.sessionIndex,
      frameTemplateId: 'FRAME_OPEN_03',
      frameDigest: 'frame-digest',
      llmInvolved: true,
    }));

    state = engine.openSession(state, clock);
    journal.append(auditEvent('session_opened', clock, { sessionIndex: session.sessionIndex }));

    while (state.cursor <= session.endPosition) {
      const reference = engine.nextItemReference(state);
      const sealed = await contentStore.readItem(structure.versionRef, reference.itemKey);
      journal.append(itemPresentedEvent(
        clock,
        session.sessionIndex,
        reference.itemKey,
        sealed.renderDigest,
        reference.sectionKey,
      ));
      clock += 18_000;
      state = engine.recordAnswer(state, {
        itemKey: reference.itemKey,
        status: 'answered',
        value: reference.canonicalPosition % 5,
        latencyMs: 4100,
        now: clock,
      });
      journal.append(itemAnsweredEvent(
        session.sessionIndex,
        state.responses[state.responses.length - 1],
      ));
    }

    state = engine.closeSession(state, clock);
    journal.append(auditEvent('session_closed', clock, { sessionIndex: session.sessionIndex }));
    clock += 26 * 3_600_000;
  }

  journal.append(auditEvent('assessment_completed', clock));
  const entries = journal.entries();

  const report = fidelityReport(entries);
  assert.equal(report.chain.status, 'VALID');
  assert.equal(report.itemsPresented, 24);
  assert.equal(report.itemsAnswered, 24);
  // Every single presentation proves its fidelity and attests no model.
  assert.equal(report.itemPresentationsProven, 24);
  // A model appears only in framing, never around an item.
  assert.deepEqual(report.llmInvolvedEventTypes, ['frame_presented']);
  assert.equal(report.llmInvolvedEvents, state.sessions.length);

  const table = segmentationTable(entries);
  assert.equal(table.length, 24);
  assert.equal(table[0].positionInSession, 1);
  assert.equal(table[0].hoursSincePreviousItem, null);
  // Sessions are 8 items here, because only section boundaries carry usable
  // authority, so position 9 opens a new session and crosses a section boundary.
  assert.equal(table[8].positionInSession, 1);
  assert.equal(table[8].crossedSectionBoundary, true);
  assert.ok(table[8].hoursSincePreviousItem > 24);

  // The variability the analysis will model is present and non-degenerate.
  assert.ok(new Set(table.map((row) => row.positionInSession)).size > 1);
  assert.equal(table.filter((row) => row.crossedSectionBoundary).length, 2);
});

test('a tampered trail from a real administration is caught at the right row', async () => {
  const journal = new AuditJournal();
  journal.append(auditEvent('assessment_opened', T0));
  for (let index = 1; index <= 8; index += 1) {
    journal.append(itemPresentedEvent(
      T0 + index * 1000,
      1,
      `DEMO_ITEM_0${index}`,
      `digest-0${index}`,
      'DEMO_SECTION_A',
    ));
  }

  const entries = journal.entries();
  assert.equal(verifyChain(entries).status, 'VALID');

  // Change one character of one digest, five rows in.
  const tampered = [...entries];
  tampered[5] = { ...entries[5], renderDigest: 'digest-0X' };
  const result = verifyChain(tampered);

  assert.equal(result.status, 'BROKEN');
  assert.equal(result.firstBrokenIndex, 5);
  assert.equal(result.reason, 'content_altered');
  assert.match(result.detail, /does not match stored/);
});
