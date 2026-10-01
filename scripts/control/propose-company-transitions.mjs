import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.cwd();

export const CONTROLLED_STATE_PATHS = [
  'state/company-state.json',
  'state/corporate/corporate-state.json',
  'state/freshness/freshness-state.json',
  'state/milestones/MS-S1-PHYSICS.json',
  'state/experiments/EXP-MAT-INCREMENTAL-001.json',
  'state/experiments/EXP-TAG-PHYSICAL-001.json',
  'state/finance/finance-state.json',
  'state/finance/fundraising/PRESEED-CONDITIONAL-2027.json',
  'state/metrics/metrics.json',
  'state/risks/risk-register.json',
  'state/unknowns/critical-unknowns.json',
];

const TRACKED_FIELDS = [
  'status',
  'current_decision',
  'freshness_status',
  'decision_use',
  'value',
  'stage',
  'classification',
];

const REF_FIELDS = [
  ['authority_refs', 'AUTHORITY_TRANSITION'],
  ['evidence_refs', 'EVIDENCE_TRANSITION'],
  ['decision_refs', 'DECISION_TRANSITION'],
  ['refs', 'AUTHORITY_TRANSITION'],
];

function readJson(path) {
  return JSON.parse(readFileSync(resolve(root, path), 'utf8'));
}

function stable(value) {
  return JSON.stringify(value ?? null);
}

function normalizeRefs(object, names) {
  const result = [];
  for (const name of names) {
    for (const ref of object?.[name] ?? []) result.push(ref);
  }
  return result;
}

function collectObjects(value, sourcePath, out = new Map()) {
  if (Array.isArray(value)) {
    for (const entry of value) collectObjects(entry, sourcePath, out);
    return out;
  }

  if (!value || typeof value !== 'object') return out;

  if (typeof value.id === 'string' && value.id.length > 0) {
    const existing = out.get(value.id);
    if (existing) {
      throw new Error(
        `Duplicate controlled Company OS id ${value.id}: ${existing.source_path} and ${sourcePath}`,
      );
    }
    out.set(value.id, { source_path: sourcePath, object: value });
  }

  for (const nested of Object.values(value)) {
    collectObjects(nested, sourcePath, out);
  }

  return out;
}

export function bundleToObjectMap(bundle) {
  const map = new Map();
  for (const [path, data] of Object.entries(bundle)) {
    collectObjects(data, path, map);
  }
  return map;
}

function makeProposal(index, generatedOn, kind, subjectId, field, beforeValue, afterValue, sourcePath, afterObject) {
  return {
    proposal_id: `EMO-PROPOSAL-${generatedOn.replaceAll('-', '')}-${String(index).padStart(4, '0')}`,
    review_status: 'REVIEW_REQUIRED',
    kind,
    subject_id: subjectId,
    field,
    before_value: beforeValue ?? null,
    after_value: afterValue ?? null,
    source_path: sourcePath,
    authority_refs: normalizeRefs(afterObject, ['authority_refs', 'refs']),
    evidence_refs: normalizeRefs(afterObject, ['evidence_refs']),
    decision_refs: normalizeRefs(afterObject, ['decision_refs']),
    append_ready: false,
    note: 'Generated from a controlled-state diff. Explicit review is required before any append-only ledger event is created.',
  };
}

export function proposeCompanyTransitions(beforeBundle, afterBundle, options) {
  const before = bundleToObjectMap(beforeBundle);
  const after = bundleToObjectMap(afterBundle);
  const raw = [];

  const ids = [...new Set([...before.keys(), ...after.keys()])].sort();

  for (const id of ids) {
    const previous = before.get(id);
    const current = after.get(id);

    if (!previous && current) {
      raw.push({
        kind: 'OBJECT_ADDED',
        subject_id: id,
        field: 'object',
        before_value: null,
        after_value: current.object,
        source_path: current.source_path,
        after_object: current.object,
      });
      continue;
    }

    if (previous && !current) {
      raw.push({
        kind: 'OBJECT_REMOVED',
        subject_id: id,
        field: 'object',
        before_value: previous.object,
        after_value: null,
        source_path: previous.source_path,
        after_object: {},
      });
      continue;
    }

    for (const field of TRACKED_FIELDS) {
      if (stable(previous.object[field]) === stable(current.object[field])) continue;
      raw.push({
        kind: field === 'current_decision' ? 'DECISION_TRANSITION' : 'STATE_TRANSITION',
        subject_id: id,
        field,
        before_value: previous.object[field] ?? null,
        after_value: current.object[field] ?? null,
        source_path: current.source_path,
        after_object: current.object,
      });
    }

    for (const [field, kind] of REF_FIELDS) {
      if (stable(previous.object[field]) === stable(current.object[field])) continue;
      raw.push({
        kind,
        subject_id: id,
        field,
        before_value: previous.object[field] ?? [],
        after_value: current.object[field] ?? [],
        source_path: current.source_path,
        after_object: current.object,
      });
    }
  }

  raw.sort((a, b) =>
    [a.subject_id, a.field, a.kind].join('\u0000').localeCompare(
      [b.subject_id, b.field, b.kind].join('\u0000'),
    ),
  );

  return {
    schema_version: '0.1.0',
    authority_mode: 'DIFF_PROPOSALS_REQUIRE_EXPLICIT_REVIEW',
    base_ref: options.baseRef,
    candidate_ref: options.candidateRef,
    generated_on: options.generatedOn,
    proposals: raw.map((item, index) =>
      makeProposal(
        index + 1,
        options.generatedOn,
        item.kind,
        item.subject_id,
        item.field,
        item.before_value,
        item.after_value,
        item.source_path,
        item.after_object,
      ),
    ),
  };
}

export function loadLocalBundle() {
  return Object.fromEntries(
    CONTROLLED_STATE_PATHS.map((path) => [path, readJson(path)]),
  );
}

async function fetchJsonAtRef(repository, path, ref, token) {
  const url = `https://api.github.com/repos/${repository}/contents/${path}?ref=${ref}`;
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(url, { headers });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}@${ref}: HTTP ${response.status}`);
  }

  const payload = await response.json();
  const content = Buffer.from(payload.content.replaceAll('\n', ''), 'base64').toString('utf8');
  return JSON.parse(content);
}

async function loadGithubBundle(repository, ref, token) {
  const entries = await Promise.all(
    CONTROLLED_STATE_PATHS.map(async (path) => [
      path,
      await fetchJsonAtRef(repository, path, ref, token),
    ]),
  );
  return Object.fromEntries(entries.filter(([, value]) => value !== null));
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

async function main() {
  const output = argValue('--output');
  const githubPr = process.argv.includes('--github-pr');
  const local = loadLocalBundle();

  let before = local;
  let baseRef = null;
  let candidateRef = null;

  const company = local['state/company-state.json'];
  const generatedOn = company?.snapshot?.date ?? '1970-01-01';

  if (githubPr) {
    const eventPath = process.env.GITHUB_EVENT_PATH;
    const repository = process.env.GITHUB_REPOSITORY;

    if (eventPath && repository && existsSync(eventPath)) {
      const event = JSON.parse(readFileSync(eventPath, 'utf8'));
      const baseSha = event.pull_request?.base?.sha;
      const headSha = event.pull_request?.head?.sha;

      if (baseSha && headSha) {
        before = await loadGithubBundle(
          repository,
          baseSha,
          process.env.GITHUB_TOKEN,
        );
        baseRef = `main@${baseSha}`;
        candidateRef = `head@${headSha}`;
      }
    }
  }

  if (!baseRef || !candidateRef) {
    const snapshotSha = company?.snapshot?.base_sha;
    if (!snapshotSha) throw new Error('Company snapshot base SHA is required');
    baseRef = `main@${snapshotSha}`;
    candidateRef = `main@${snapshotSha}`;
  }

  const queue = proposeCompanyTransitions(before, local, {
    baseRef,
    candidateRef,
    generatedOn,
  });

  const rendered = JSON.stringify(queue, null, 2) + '\n';
  if (output) {
    writeFileSync(resolve(root, output), rendered, 'utf8');
  } else {
    process.stdout.write(rendered);
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  await main();
}
