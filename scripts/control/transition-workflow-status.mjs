import { existsSync, readFileSync } from 'node:fs';
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

function assertProposalQueue(queue) {
  if (!queue || typeof queue !== 'object') {
    throw new Error('proposal queue is required');
  }
  if (!Array.isArray(queue.proposals)) {
    throw new Error('proposal queue proposals must be an array');
  }
  if (typeof queue.candidate_ref !== 'string' || queue.candidate_ref.length === 0) {
    throw new Error('proposal queue candidate_ref is required');
  }
}

function candidateStatus(proposalQueue, ledgerEvents, reviewedCandidate) {
  const tailEventId = ledgerEvents.at(-1)?.event_id ?? null;

  if (!reviewedCandidate) {
    if (proposalQueue.proposals.length === 0) {
      return {
        mechanical_state: 'NO_PENDING_PROPOSALS',
        next_action_code: 'NONE',
        next_action:
          'No transition review action is mechanically pending. This does not certify that Company OS state is complete or correct.',
      };
    }

    return {
      mechanical_state: 'PROPOSAL_REVIEW_REQUIRED',
      next_action_code: 'REVIEW_PROPOSAL',
      next_action:
        'A human must review a proposal before any reviewed append candidate can be prepared.',
    };
  }

  const proposal = proposalQueue.proposals.find(
    (entry) => entry.proposal_id === reviewedCandidate.proposal_id,
  );

  if (!proposal) {
    return {
      mechanical_state: 'REVIEWED_CANDIDATE_ORPHANED',
      next_action_code: 'REGENERATE_OR_REVIEW_CANDIDATE',
      next_action:
        'The reviewed candidate no longer maps to the current proposal queue. Regenerate/review before any finalization attempt.',
    };
  }

  const queueCandidateRef = proposalQueue.candidate_ref;
  const candidateRefMatches =
    reviewedCandidate.candidate_ref === queueCandidateRef &&
    reviewedCandidate.append_candidate?.source_candidate_ref === queueCandidateRef;

  if (!candidateRefMatches) {
    return {
      mechanical_state: 'REVIEWED_CANDIDATE_SOURCE_MISMATCH',
      next_action_code: 'REGENERATE_OR_REVIEW_CANDIDATE',
      next_action:
        'The reviewed candidate source no longer matches the proposal queue candidate. Re-review the current candidate state.',
    };
  }

  const tailMatches =
    reviewedCandidate.ledger_tail_event_id === tailEventId &&
    reviewedCandidate.append_candidate?.previous_event_id === tailEventId;

  if (!tailMatches) {
    return {
      mechanical_state: 'REVIEWED_CANDIDATE_STALE',
      next_action_code: 'REPREPARE_AFTER_LEDGER_CHANGE',
      next_action:
        'The ledger tail changed after review preparation. Re-prepare from the current ledger tail before finalization.',
    };
  }

  return {
    mechanical_state: 'REVIEWED_CANDIDATE_READY_FOR_MANUAL_FINALIZATION_INPUTS',
    next_action_code: 'SUPPLY_MANUAL_FINALIZATION_INPUTS',
    next_action:
      'Mechanical preconditions match. A human must still supply finalization inputs and substantive approval remains outside this tool.',
  };
}

export function inspectTransitionWorkflow(
  proposalQueue,
  ledgerEvents,
  reviewedCandidate = null,
) {
  assertProposalQueue(proposalQueue);
  if (!Array.isArray(ledgerEvents)) {
    throw new Error('ledgerEvents must be an array');
  }

  const status = candidateStatus(
    proposalQueue,
    ledgerEvents,
    reviewedCandidate,
  );

  const proposalPacketCommand =
    proposalQueue.proposals.length === 0
      ? null
      : `node scripts/control/transition-review-packet.mjs --proposal-queue ${DEFAULT_PROPOSAL_PATH}`;

  const operatorHandoff =
    status.next_action_code === 'REVIEW_PROPOSAL'
      ? {
          action: 'RENDER_REVIEW_PACKET',
          command: proposalPacketCommand,
          scope:
            proposalQueue.proposals.length === 1
              ? 'SINGLE_PENDING_PROPOSAL'
              : 'FULL_PENDING_QUEUE_NO_PRIORITY_RANKING',
          note:
            'This handoff opens the read-only review surface only. It does not select, prioritize, accept or approve a proposal.',
        }
      : null;

  return {
    schema_version: '0.2.0',
    authority_mode: 'MECHANICAL_WORKFLOW_STATUS_NOT_DECISION_AUTHORITY',
    ledger_tail_event_id: ledgerEvents.at(-1)?.event_id ?? null,
    proposal_count: proposalQueue.proposals.length,
    proposal_ids: proposalQueue.proposals.map((entry) => entry.proposal_id),
    proposal_candidate_ref: proposalQueue.candidate_ref,
    reviewed_candidate_present: reviewedCandidate !== null,
    reviewed_candidate_proposal_id: reviewedCandidate?.proposal_id ?? null,
    mechanical_state: status.mechanical_state,
    next_action_code: status.next_action_code,
    next_action: status.next_action,
    operator_handoff: operatorHandoff,
    mutates_ledger: false,
    human_review_required: true,
    substantive_decision_authority: false,
  };
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function main() {
  const proposalPath =
    argValue('--proposal-queue') ?? DEFAULT_PROPOSAL_PATH;
  const ledgerPath = argValue('--ledger') ?? DEFAULT_LEDGER_PATH;
  const reviewedCandidatePath = argValue('--reviewed-candidate');

  const proposalQueue = readJson(proposalPath);
  const ledgerEvents = readJsonLines(ledgerPath);

  let reviewedCandidate = null;
  if (reviewedCandidatePath) {
    const absolute = resolve(root, reviewedCandidatePath);
    if (!existsSync(absolute)) {
      throw new Error(`reviewed candidate does not exist: ${reviewedCandidatePath}`);
    }
    reviewedCandidate = readJson(reviewedCandidatePath);
  }

  const result = inspectTransitionWorkflow(
    proposalQueue,
    ledgerEvents,
    reviewedCandidate,
  );

  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  main();
}
