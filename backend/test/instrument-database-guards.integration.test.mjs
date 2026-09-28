import test, { after } from 'node:test';
import assert from 'node:assert/strict';

/**
 * The instrument guardrails that live in PostgreSQL rather than in code.
 *
 * Two product promises are enforced at the database boundary, and this is where
 * that claim is checked against a real server rather than against the migration
 * text:
 *
 *   - at most two reminders per session, so no later change to the notification
 *     layer can make Breiz insistent;
 *   - an item or section-title presentation always carries a render digest and
 *     always attests that no model was in the loop.
 *
 * The specification listed these as two files; they are one, because they share
 * the same fixtures and a reader comparing them side by side is better served.
 *
 * Enable with INSTRUMENT_ADMINISTRATION_DB_INTEGRATION=1 and a DATABASE_URL
 * pointing at a disposable database carrying the generated schema.
 */

const enabled = process.env.INSTRUMENT_ADMINISTRATION_DB_INTEGRATION === '1';
let sql = null;

if (enabled) {
  const { default: postgres } = await import('postgres');
  sql = postgres(process.env.DATABASE_URL, { max: 1 });
}

after(async () => {
  if (sql) await sql.end({ timeout: 5 });
});

const skip = enabled ? false : 'INSTRUMENT_ADMINISTRATION_DB_INTEGRATION is not set';

const USER = '44444444-4444-4444-4444-4444444440a1';
const DOG = '33333333-3333-3333-3333-3333333330a1';
const ASSESSMENT = '55555555-5555-5555-5555-5555555550a1';
const INSTRUMENT = '11111111-1111-1111-1111-1111111110a1';
const VERSION = '22222222-2222-2222-2222-2222222220a1';

async function withFixtures(body) {
  // Everything happens inside a transaction that is always rolled back, so the
  // disposable database is left exactly as it was found.
  await sql.begin(async (tx) => {
    await tx`
      INSERT INTO users (id, email, password_hash, name)
      VALUES (${USER}, 'instrument-guard@example.test', 'x', 'Guard Fixture')
    `;
    await tx`
      INSERT INTO dogs (id, owner_id, name, breed, birth_date, sex, weight, fur_class)
      VALUES (${DOG}, ${USER}, 'Fixture', 'Epagneul breton', '2020-01-01', 'male', 18.0, 'short')
    `;
    await tx`
      INSERT INTO behavioral_assessments (id, dog_id, instrument_code)
      VALUES (${ASSESSMENT}, ${DOG}, 'DEMO')
    `;
    await tx`
      INSERT INTO instruments (id, code, owner_organisation)
      VALUES (${INSTRUMENT}, 'DEMO_GUARD', 'Demo Org')
    `;
    await tx`
      INSERT INTO instrument_versions (
        id, instrument_id, version, locale, content_store_ref, content_digest,
        license_status, expected_item_count
      ) VALUES (
        ${VERSION}, ${INSTRUMENT}, 'v0', 'fr-FR', 'demo://v0', 'deadbeef', 'demo_only', 24
      )
    `;

    await body(tx);
    throw new RollbackSignal();
  }).catch((error) => {
    if (!(error instanceof RollbackSignal)) throw error;
  });
}

class RollbackSignal extends Error {}

/**
 * Run a statement expected to be refused, and return the constraint that refused it.
 *
 * Wrapped in a savepoint on purpose: PostgreSQL aborts the whole transaction on the
 * first error, so without one only the first expected refusal in a test would
 * report its real constraint and the rest would report "transaction is aborted".
 */
async function refusedBy(tx, run) {
  try {
    await tx.savepoint((sp) => run(sp));
    return null;
  } catch (error) {
    const match = /constraint "([^"]+)"/.exec(error.message);
    return match ? match[1] : `unnamed: ${error.message.split('\n')[0]}`;
  }
}

test('the reminder cap is enforced by the database, not only by the engine', { skip }, async () => {
  await withFixtures(async (tx) => {
    await tx`
      INSERT INTO administration_sessions (
        assessment_id, session_index, planned_item_keys, planned_item_count,
        breakpoint_set_version, reminder_count
      ) VALUES (
        ${ASSESSMENT}, 1, ${sql.json(['DEMO_ITEM_01'])}, 8, 1, 2
      )
    `;

    const refusal = await refusedBy(tx, (q) => q`
      INSERT INTO administration_sessions (
        assessment_id, session_index, planned_item_keys, planned_item_count,
        breakpoint_set_version, reminder_count
      ) VALUES (
        ${ASSESSMENT}, 2, ${sql.json(['DEMO_ITEM_09'])}, 8, 1, 3
      )
    `);

    assert.equal(refusal, 'chk_session_reminder_cap');
  });
});

test('a session cannot record an invented sizing decision', { skip }, async () => {
  await withFixtures(async (tx) => {
    const refusal = await refusedBy(tx, (q) => q`
      INSERT INTO administration_sessions (
        assessment_id, session_index, planned_item_keys, planned_item_count,
        breakpoint_set_version, sizing_decision
      ) VALUES (
        ${ASSESSMENT}, 1, ${sql.json([])}, 8, 1, 'sensor_driven'
      )
    `);

    assert.equal(refusal, 'chk_session_sizing');
  });
});

test('an item presentation involving a model cannot be recorded at all', { skip }, async () => {
  await withFixtures(async (tx) => {
    // The conforming case is accepted.
    await tx`
      INSERT INTO instrument_administration_events (
        assessment_id, sequence_index, event_type, event_hash,
        item_key, render_digest, llm_involved
      ) VALUES (
        ${ASSESSMENT}, 0, 'item_presented', 'hash-0', 'DEMO_ITEM_01', 'digest-01', false
      )
    `;

    const withModel = await refusedBy(tx, (q) => q`
      INSERT INTO instrument_administration_events (
        assessment_id, sequence_index, event_type, event_hash,
        item_key, render_digest, llm_involved
      ) VALUES (
        ${ASSESSMENT}, 1, 'item_presented', 'hash-1', 'DEMO_ITEM_02', 'digest-02', true
      )
    `);
    assert.equal(withModel, 'chk_event_item_presentation');

    const withoutDigest = await refusedBy(tx, (q) => q`
      INSERT INTO instrument_administration_events (
        assessment_id, sequence_index, event_type, event_hash, item_key, llm_involved
      ) VALUES (
        ${ASSESSMENT}, 2, 'item_presented', 'hash-2', 'DEMO_ITEM_03', false
      )
    `);
    assert.equal(withoutDigest, 'chk_event_item_presentation');

    const withoutKey = await refusedBy(tx, (q) => q`
      INSERT INTO instrument_administration_events (
        assessment_id, sequence_index, event_type, event_hash, render_digest, llm_involved
      ) VALUES (
        ${ASSESSMENT}, 3, 'item_presented', 'hash-3', 'digest-04', false
      )
    `);
    assert.equal(withoutKey, 'chk_event_item_presentation');
  });
});

test('an official section title obeys the same rule as an item', { skip }, async () => {
  await withFixtures(async (tx) => {
    const refusal = await refusedBy(tx, (q) => q`
      INSERT INTO instrument_administration_events (
        assessment_id, sequence_index, event_type, event_hash, render_digest, llm_involved
      ) VALUES (
        ${ASSESSMENT}, 0, 'section_title_presented', 'hash-0', 'title-digest', true
      )
    `);
    assert.equal(refusal, 'chk_event_section_title');
  });
});

test('framing is the one place a model may appear', { skip }, async () => {
  await withFixtures(async (tx) => {
    // Accepted: the model speaks in the framing and never around an item.
    await tx`
      INSERT INTO instrument_administration_events (
        assessment_id, sequence_index, event_type, event_hash,
        frame_template_id, frame_digest, llm_involved
      ) VALUES (
        ${ASSESSMENT}, 0, 'frame_presented', 'hash-0', 'FRAME_OPEN_03', 'frame-digest', true
      )
    `;

    const rows = await tx`
      SELECT llm_involved FROM instrument_administration_events
      WHERE assessment_id = ${ASSESSMENT} AND event_type = 'frame_presented'
    `;
    assert.equal(rows.length, 1);
    assert.equal(rows[0].llm_involved, true);
  });
});

test('an unknown event type is refused', { skip }, async () => {
  await withFixtures(async (tx) => {
    const refusal = await refusedBy(tx, (q) => q`
      INSERT INTO instrument_administration_events (
        assessment_id, sequence_index, event_type, event_hash
      ) VALUES (
        ${ASSESSMENT}, 0, 'item_rephrased', 'hash-0'
      )
    `);
    // Either the named constraint or the column check refuses it; both are the
    // same rule, and the point is that the row does not land.
    assert.match(String(refusal), /chk_event_type|instrument_administration_events/);
  });
});

test('the sequence index is unique per administration', { skip }, async () => {
  await withFixtures(async (tx) => {
    await tx`
      INSERT INTO instrument_administration_events (
        assessment_id, sequence_index, event_type, event_hash
      ) VALUES (${ASSESSMENT}, 0, 'assessment_opened', 'hash-0')
    `;

    const refusal = await refusedBy(tx, (q) => q`
      INSERT INTO instrument_administration_events (
        assessment_id, sequence_index, event_type, event_hash
      ) VALUES (${ASSESSMENT}, 0, 'session_planned', 'hash-0-bis')
    `);

    // An append-only journal whose sequence could repeat would not support any
    // claim about the order items were presented in.
    assert.equal(refusal, 'uq_event_assessment_sequence');
  });
});

test('a licence status the system does not know is refused', { skip }, async () => {
  await withFixtures(async (tx) => {
    const refusal = await refusedBy(tx, (q) => q`
      INSERT INTO instrument_versions (
        instrument_id, version, locale, content_store_ref, content_digest,
        license_status, expected_item_count
      ) VALUES (
        ${INSTRUMENT}, 'v1', 'fr-FR', 'demo://v1', 'cafe', 'totally_licensed', 24
      )
    `);
    assert.match(String(refusal), /chk_instrument_version_license|instrument_versions/);
  });
});

test('a cut point cannot claim an authority nobody granted', { skip }, async () => {
  await withFixtures(async (tx) => {
    const refusal = await refusedBy(tx, (q) => q`
      INSERT INTO instrument_breakpoints (
        version_id, after_position, breakpoint_kind, authority
      ) VALUES (${VERSION}, 8, 'section_boundary', 'self_approved')
    `);
    assert.match(String(refusal), /authority|instrument_breakpoints/);
  });
});
