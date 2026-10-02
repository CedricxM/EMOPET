import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.cwd();
const DEFAULT_PROPOSAL_PATH = 'state/history/pending-transition-proposals.json';
const DEFAULT_LEDGER_PATH = 'state/history/company-transitions.jsonl';

function readJson(path) {
  return JSON.parse(readFileSync(resolve(root, path), 'utf8'));
}

function readJsonLines(path) {
  return readFileSync(resolve(root, path), 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

function stableValue(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function transitionKind(proposalKind) {
  if (proposalKind === 'AUTHORITY_TRANSITION') return 'AUTHORITY_TRANSITION';
  if (proposalKind === 'EVIDENCE_TRANSITION') return 'EVIDENCE_TRANSITION';
  return 'STATE_TRANSITION';
}

function assertReviewRef(reviewRef) {
  if (!reviewRef || typeof reviewRef !== 'object') {
    throw new Error('Explicit review_ref is required');
  }

  if (!['path', 'issue', 'pr'].includes(reviewRef.kind)) {
    throw new Error('review_ref must be a path, issue or pull request reference');
  }

  if (typeof reviewRef.value !== 'string' || reviewRef.value.length === 0) {
    throw new Error('review_ref.value must be a non-empty string');
  }
}

export function prepareReviewedTransitionAppend(
  proposalQueue,
  ledgerEvents,
  proposalId,
  options,
) {
  if (options?.accept !== true) {
    throw new Error('Explicit accept=true is required before append preparation');
  }

  assertReviewRef(options.reviewRef);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.reviewedOn ?? '')) {
    throw new Error('reviewedOn must use YYYY-MM-DD');
  }

  const proposal = proposalQueue.proposals?.find(
    (entry) => entry.proposal_id === proposalId,
  );

  if (!proposal) {
    throw new Error(`Unknown transition proposal: ${proposalId}`);
  }

  if (proposal.review_status !== 'REVIEW_REQUIRED') {
    throw new Error(`${proposalId} is not awaiting review`);
  }

  if (proposal.append_ready !== false) {
    throw new Error(`${proposalId} must remain append_ready=false before preparation`);
  }

  const previousEvent = ledgerEvents.at(-1) ?? null;
  const before = stableValue(proposal.before_value);
  const after = stableValue(proposal.after_value);

  return {
    schema_version: '0.1.0',
    authority_mode: 'REVIEWED_APPEND_CANDIDATE_REQUIRES_HUMAN_PR_APPROVAL',
    proposal_id: proposal.proposal_id,
    review_status: 'REVIEW_RECORDED_ACCEPTED_FOR_PREPARATION',
    reviewed_on: options.reviewedOn,
    review_ref: options.reviewRef,
    candidate_ref: proposalQueue.candidate_ref,
    ledger_tail_event_id: previousEvent?.event_id ?? null,
    append_candidate: {
      kind: transitionKind(proposal.kind),
      subject: proposal.subject_id,
      from_state: before,
      to_state: after,
      summary:
        `Reviewed proposal ${proposal.proposal_id}: ${proposal.subject_id} ${proposal.field} transition prepared for append review.`,
      source_candidate_ref: proposalQueue.candidate_ref,
      authority_refs: proposal.authority_refs ?? [],
      evidence_refs: proposal.evidence_refs ?? [],
      decision_refs: proposal.decision_refs ?? [],
      previous_event_id: previousEvent?.event_id ?? null,
      corrects_event_id: null,
      confidentiality: 'PUBLIC',
    },
    finalization: {
      event_id: null,
      source_snapshot_ref: null,
      append_to_ledger: false,
      requires_human_pr_approval: true,
    },
  };
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function parseReviewRef() {
  const kind = argValue('--review-ref-kind');
  const value = argValue('--review-ref-value');
  return kind && value ? { kind, value } : null;
}

function main() {
  const proposalPath = argValue('--proposal-queue') ?? DEFAULT_PROPOSAL_PATH;
  const ledgerPath = argValue('--ledger') ?? DEFAULT_LEDGER_PATH;
  const proposalId = argValue('--proposal-id');
  const reviewedOn = argValue('--reviewed-on');
  const output = argValue('--output');
  const accept = process.argv.includes('--accept');

  if (!proposalId) throw new Error('--proposal-id is required');
  if (!reviewedOn) throw new Error('--reviewed-on is required');
  if (!output) throw new Error('--output is required');

  const outputPath = resolve(root, output);
  const ledgerAbsolute = resolve(root, ledgerPath);
  if (outputPath === ledgerAbsolute) {
    throw new Error('This command never writes the canonical append-only ledger');
  }

  const proposalQueue = readJson(proposalPath);
  const ledgerEvents = readJsonLines(ledgerPath);

  const prepared = prepareReviewedTransitionAppend(
    proposalQueue,
    ledgerEvents,
    proposalId,
    {
      accept,
      reviewedOn,
      reviewRef: parseReviewRef(),
    },
  );

  writeFileSync(outputPath, JSON.stringify(prepared, null, 2) + '\n', 'utf8');
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  main();
}
