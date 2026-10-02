import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.cwd();
const DEFAULT_LEDGER_PATH = 'state/history/company-transitions.jsonl';

function readJson(path) {
  return JSON.parse(readFileSync(resolve(root, path), 'utf8'));
}

function readLedger(path) {
  const raw = readFileSync(resolve(root, path), 'utf8');
  const events = raw
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
  return { raw, events };
}

function assertRef(ref, label, allowedKinds = ['path', 'issue', 'pr', 'commit', 'external']) {
  if (!ref || typeof ref !== 'object') {
    throw new Error(`${label} must be a reference object`);
  }
  if (!allowedKinds.includes(ref.kind)) {
    throw new Error(`${label} kind must be one of: ${allowedKinds.join(', ')}`);
  }
  if (typeof ref.value !== 'string' || ref.value.length === 0) {
    throw new Error(`${label}.value must be a non-empty string`);
  }
  if ((ref.kind === 'issue' || ref.kind === 'pr') && !/^#\d+$/.test(ref.value)) {
    throw new Error(`${label} ${ref.kind} must use #<number>`);
  }
  if (ref.kind === 'commit' && !/^[0-9a-f]{40}$/.test(ref.value)) {
    throw new Error(`${label} commit must be a full SHA`);
  }
}

function dedupeRefs(refs) {
  const seen = new Set();
  return refs.filter((ref) => {
    const key = `${ref.kind}:${ref.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function assertReviewedCandidate(candidate) {
  if (
    candidate?.authority_mode !==
    'REVIEWED_APPEND_CANDIDATE_REQUIRES_HUMAN_PR_APPROVAL'
  ) {
    throw new Error('Reviewed candidate authority_mode is invalid');
  }
  if (
    candidate?.review_status !==
    'REVIEW_RECORDED_ACCEPTED_FOR_PREPARATION'
  ) {
    throw new Error('Reviewed candidate is not explicitly accepted for preparation');
  }
  assertRef(candidate.review_ref, 'review_ref', ['path', 'issue', 'pr']);

  const finalization = candidate.finalization;
  if (
    !finalization ||
    finalization.event_id !== null ||
    finalization.source_snapshot_ref !== null ||
    finalization.append_to_ledger !== false ||
    finalization.requires_human_pr_approval !== true
  ) {
    throw new Error('Reviewed candidate finalization boundary has already been altered');
  }
}

function assertEventId(eventId, recordedOn, existingEvents) {
  if (!/^EMO-TRANSITION-\d{8}-\d{4}$/.test(eventId ?? '')) {
    throw new Error('eventId must use EMO-TRANSITION-YYYYMMDD-NNNN');
  }

  const dateCode = recordedOn.replaceAll('-', '');
  if (!eventId.startsWith(`EMO-TRANSITION-${dateCode}-`)) {
    throw new Error('eventId date must match recordedOn');
  }

  if (existingEvents.some((event) => event.event_id === eventId)) {
    throw new Error(`Duplicate transition event ID: ${eventId}`);
  }
}

export function finalizeReviewedTransitionAppend(
  reviewedCandidate,
  ledgerEvents,
  options,
) {
  if (options?.finalize !== true) {
    throw new Error('Explicit finalize=true is required');
  }

  if (options?.ci === true) {
    throw new Error('Finalization is forbidden in CI');
  }

  assertReviewedCandidate(reviewedCandidate);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.recordedOn ?? '')) {
    throw new Error('recordedOn must use YYYY-MM-DD');
  }

  if (options.recordedOn < reviewedCandidate.reviewed_on) {
    throw new Error('recordedOn cannot precede reviewed_on');
  }

  if (!/^main@[0-9a-f]{40}$/.test(options.sourceSnapshotRef ?? '')) {
    throw new Error('sourceSnapshotRef must use main@<40-hex-sha>');
  }

  const appendPrRef = { kind: 'pr', value: options.appendPrRef };
  assertRef(appendPrRef, 'append_pr_ref', ['pr']);

  const ledgerTail = ledgerEvents.at(-1) ?? null;
  const expectedTail = ledgerTail?.event_id ?? null;

  if (
    reviewedCandidate.ledger_tail_event_id !== expectedTail ||
    reviewedCandidate.append_candidate?.previous_event_id !== expectedTail
  ) {
    throw new Error('Reviewed candidate is stale against the current ledger tail');
  }

  assertEventId(options.eventId, options.recordedOn, ledgerEvents);

  const appendCandidate = reviewedCandidate.append_candidate;
  if (!appendCandidate || typeof appendCandidate !== 'object') {
    throw new Error('append_candidate is required');
  }

  for (const ref of [
    ...(appendCandidate.authority_refs ?? []),
    ...(appendCandidate.evidence_refs ?? []),
    ...(appendCandidate.decision_refs ?? []),
  ]) {
    assertRef(ref, 'append_candidate reference');
  }

  const decisionRefs = dedupeRefs([
    ...(appendCandidate.decision_refs ?? []),
    reviewedCandidate.review_ref,
    appendPrRef,
  ]);

  return {
    schema_version: '0.1.0',
    event_id: options.eventId,
    recorded_on: options.recordedOn,
    kind: appendCandidate.kind,
    subject: appendCandidate.subject,
    from_state: appendCandidate.from_state,
    to_state: appendCandidate.to_state,
    summary: appendCandidate.summary,
    source_snapshot_ref: options.sourceSnapshotRef,
    authority_refs: appendCandidate.authority_refs ?? [],
    evidence_refs: appendCandidate.evidence_refs ?? [],
    decision_refs: decisionRefs,
    previous_event_id: expectedTail,
    corrects_event_id: appendCandidate.corrects_event_id ?? null,
    confidentiality: 'PUBLIC',
  };
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function normalizeLedger(raw) {
  if (raw.length === 0) return '';
  return raw.endsWith('\n') ? raw : `${raw}\n`;
}

function main() {
  if (process.env.CI) {
    throw new Error('This command cannot finalize Company Time Machine history in CI');
  }

  const reviewedCandidatePath = argValue('--reviewed-candidate');
  const ledgerPath = argValue('--ledger') ?? DEFAULT_LEDGER_PATH;
  const eventId = argValue('--event-id');
  const recordedOn = argValue('--recorded-on');
  const sourceSnapshotRef = argValue('--source-snapshot-ref');
  const appendPrRef = argValue('--append-pr-ref');
  const finalize = process.argv.includes('--finalize');

  if (!reviewedCandidatePath) throw new Error('--reviewed-candidate is required');
  if (!eventId) throw new Error('--event-id is required');
  if (!recordedOn) throw new Error('--recorded-on is required');
  if (!sourceSnapshotRef) throw new Error('--source-snapshot-ref is required');
  if (!appendPrRef) throw new Error('--append-pr-ref is required');

  const reviewedCandidate = readJson(reviewedCandidatePath);
  const ledger = readLedger(ledgerPath);

  const event = finalizeReviewedTransitionAppend(
    reviewedCandidate,
    ledger.events,
    {
      finalize,
      ci: Boolean(process.env.CI),
      eventId,
      recordedOn,
      sourceSnapshotRef,
      appendPrRef,
    },
  );

  const nextLedger = `${normalizeLedger(ledger.raw)}${JSON.stringify(event)}\n`;
  writeFileSync(resolve(root, ledgerPath), nextLedger, 'utf8');
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  main();
}
