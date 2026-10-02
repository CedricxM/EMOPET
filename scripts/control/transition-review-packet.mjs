import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.cwd();
const DEFAULT_PROPOSAL_PATH = 'state/history/pending-transition-proposals.json';

function readJson(path) {
  return JSON.parse(readFileSync(resolve(root, path), 'utf8'));
}

function assertQueue(queue) {
  if (!queue || typeof queue !== 'object') {
    throw new Error('proposal queue is required');
  }
  if (queue.authority_mode !== 'DIFF_PROPOSALS_REQUIRE_EXPLICIT_REVIEW') {
    throw new Error('proposal queue authority_mode is invalid');
  }
  if (!Array.isArray(queue.proposals)) {
    throw new Error('proposal queue proposals must be an array');
  }

  for (const proposal of queue.proposals) {
    if (proposal.review_status !== 'REVIEW_REQUIRED') {
      throw new Error(`${proposal.proposal_id ?? 'proposal'} must remain REVIEW_REQUIRED`);
    }
    if (proposal.append_ready !== false) {
      throw new Error(`${proposal.proposal_id ?? 'proposal'} cannot be append-ready in a review packet`);
    }
  }
}

function valueBlock(value) {
  return ['```json', JSON.stringify(value, null, 2), '```'].join('\n');
}

function refText(ref) {
  if (!ref) return '—';
  if (ref.kind === 'path') return `\`${ref.value}\``;
  if (ref.kind === 'issue') return `issue \`${ref.value}\``;
  if (ref.kind === 'pr') return `PR \`${ref.value}\``;
  if (ref.kind === 'commit') return `commit \`${ref.value}\``;
  return `external \`${ref.value}\``;
}

function refs(refList = []) {
  return refList.length ? refList.map(refText).join(', ') : '—';
}

function esc(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', '<br>');
}

export function renderTransitionReviewPacket(queue, options = {}) {
  assertQueue(queue);

  let proposals = queue.proposals;
  if (options.proposalId) {
    const proposal = proposals.find(
      (entry) => entry.proposal_id === options.proposalId,
    );
    if (!proposal) {
      throw new Error(`Unknown proposal ID: ${options.proposalId}`);
    }
    proposals = [proposal];
  }

  const lines = [
    '# EMOPET — Transition Review Packet',
    '',
    '> **Status:** `REVIEW REQUIRED / NOT APPROVAL / NOT DECISION AUTHORITY / NOT LEDGER AUTHORITY`  ',
    `> **Base:** \`${queue.base_ref}\`  `,
    `> **Candidate:** \`${queue.candidate_ref}\`  `,
    `> **Generated on:** ${queue.generated_on}`,
    '',
    'This packet renders review-only transition proposals for human inspection. It never accepts a proposal, prepares a reviewed candidate, finalizes an event, appends history, or creates substantive authority.',
    '',
  ];

  if (proposals.length === 0) {
    lines.push(
      '## No pending proposals',
      '',
      'No transition proposal is mechanically pending in this queue. This does **not** certify that Company OS state is complete, correct, fresh, validated, legally cleared or decision-ready.',
      '',
      'The controlled state and domain authority still win.',
      '',
    );
    return lines.join('\n');
  }

  lines.push(
    '## Review queue',
    '',
    '| Proposal | Kind | Subject | Field | Source |',
    '|---|---|---|---|---|',
    ...proposals.map(
      (proposal) =>
        `| \`${proposal.proposal_id}\` | \`${proposal.kind}\` | \`${proposal.subject_id}\` | \`${proposal.field}\` | \`${esc(proposal.source_path)}\` |`,
    ),
    '',
    'Source order is not a priority ranking.',
    '',
  );

  for (const proposal of proposals) {
    lines.push(
      `## ${proposal.proposal_id}`,
      '',
      `**Review state:** \`${proposal.review_status}\`  `,
      `**Append ready:** \`${proposal.append_ready}\`  `,
      `**Kind:** \`${proposal.kind}\`  `,
      `**Subject:** \`${proposal.subject_id}\`  `,
      `**Field:** \`${proposal.field}\`  `,
      `**Source:** \`${proposal.source_path}\``,
      '',
      '### Before',
      '',
      valueBlock(proposal.before_value),
      '',
      '### After',
      '',
      valueBlock(proposal.after_value),
      '',
      '### Controlling refs',
      '',
      `- Authority: ${refs(proposal.authority_refs)}`,
      `- Evidence: ${refs(proposal.evidence_refs)}`,
      `- Decision: ${refs(proposal.decision_refs)}`,
      '',
      `Note: ${proposal.note}`,
      '',
      '### Human review checklist',
      '',
      '- Does the proposed diff accurately describe the controlled state change?',
      '- Does the cited source path contain the intended subject and field?',
      '- Are authority/evidence/decision refs sufficient for the claim being reviewed?',
      '- Is any required evidence still missing, stale, synthetic, private or outside the claimed scope?',
      '- Does accepting this proposal risk turning implementation, discussion, planning or supplier work into a stronger claim than the controlling authority allows?',
      '- Is the content public-safe for this repository?',
      '',
      'If the proposal is substantively accepted by a real human reviewer, use the reviewed append preparation path with a real dated review reference. Do not treat this packet as that review reference.',
      '',
    );
  }

  lines.push(
    '## Boundary',
    '',
    'This packet is an inspection surface only. It cannot approve science, hardware, legal rights, funding, procurement, release, product truth or any other substantive Company OS state.',
    '',
  );

  return lines.join('\n');
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function main() {
  const proposalPath =
    argValue('--proposal-queue') ?? DEFAULT_PROPOSAL_PATH;
  const proposalId = argValue('--proposal-id');

  const queue = readJson(proposalPath);
  process.stdout.write(
    renderTransitionReviewPacket(queue, { proposalId }) + '\n',
  );
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  main();
}
