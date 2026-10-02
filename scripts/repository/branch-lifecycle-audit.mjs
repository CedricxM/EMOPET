#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const API_ROOT = 'https://api.github.com';
const PER_PAGE = 100;

export const BRANCH_LIFECYCLE_STATUS = Object.freeze({
  KEEP_DEFAULT_BRANCH: 'KEEP_DEFAULT_BRANCH',
  KEEP_OPEN_PR_HEAD: 'KEEP_OPEN_PR_HEAD',
  KEEP_PROTECTED: 'KEEP_PROTECTED',
  SAFE_MERGED_MAIN_HEAD_CANDIDATE: 'SAFE_MERGED_MAIN_HEAD_CANDIDATE',
  HOLD_REF_MOVED: 'HOLD_REF_MOVED',
  HOLD_NON_MAIN_MERGE: 'HOLD_NON_MAIN_MERGE',
  HOLD_CLOSED_UNMERGED: 'HOLD_CLOSED_UNMERGED',
  HOLD_UNPROVEN: 'HOLD_UNPROVEN',
});

export function normalizePull(raw) {
  return {
    number: raw.number,
    state: raw.state,
    merged: Boolean(raw.merged_at),
    mergedAt: raw.merged_at ?? null,
    closedAt: raw.closed_at ?? null,
    headRef: raw.head?.ref ?? null,
    headSha: raw.head?.sha ?? null,
    headRepoFullName: raw.head?.repo?.full_name ?? null,
    baseRef: raw.base?.ref ?? null,
    htmlUrl: raw.html_url ?? null,
    title: raw.title ?? null,
  };
}

export function classifyBranch({
  repository,
  defaultBranch,
  branch,
  pulls,
}) {
  if (!branch?.name || !branch?.sha) {
    throw new Error('branch requires name and sha');
  }

  const sameRepositoryPulls = pulls.filter(
    (pull) =>
      pull.headRef === branch.name
      && pull.headRepoFullName === repository,
  );

  const evidence = sameRepositoryPulls.map((pull) => ({
    number: pull.number,
    state: pull.state,
    merged: pull.merged,
    headSha: pull.headSha,
    baseRef: pull.baseRef,
    htmlUrl: pull.htmlUrl,
  }));

  if (branch.name === defaultBranch) {
    return result(branch, BRANCH_LIFECYCLE_STATUS.KEEP_DEFAULT_BRANCH, evidence,
      'canonical default branch is never a cleanup candidate');
  }

  if (sameRepositoryPulls.some((pull) => pull.state === 'open')) {
    return result(branch, BRANCH_LIFECYCLE_STATUS.KEEP_OPEN_PR_HEAD, evidence,
      'an open pull request currently uses this branch head ref');
  }

  if (branch.protected) {
    return result(branch, BRANCH_LIFECYCLE_STATUS.KEEP_PROTECTED, evidence,
      'protected branches require separate repository-governance review');
  }

  if (
    sameRepositoryPulls.some(
      (pull) => pull.headSha && pull.headSha !== branch.sha,
    )
  ) {
    return result(branch, BRANCH_LIFECYCLE_STATUS.HOLD_REF_MOVED, evidence,
      'the branch name has PR evidence at a different SHA; reuse or movement is ambiguous');
  }

  const exact = sameRepositoryPulls.filter(
    (pull) => pull.headSha === branch.sha,
  );

  if (
    exact.some(
      (pull) => pull.merged && pull.baseRef === defaultBranch,
    )
  ) {
    return result(
      branch,
      BRANCH_LIFECYCLE_STATUS.SAFE_MERGED_MAIN_HEAD_CANDIDATE,
      evidence,
      'current branch SHA exactly matches a PR merged into the canonical default branch',
    );
  }

  if (exact.some((pull) => pull.merged)) {
    return result(branch, BRANCH_LIFECYCLE_STATUS.HOLD_NON_MAIN_MERGE, evidence,
      'branch matches a merged PR, but that merge did not target the canonical default branch');
  }

  if (exact.some((pull) => pull.state === 'closed' && !pull.merged)) {
    return result(branch, BRANCH_LIFECYCLE_STATUS.HOLD_CLOSED_UNMERGED, evidence,
      'closed-but-unmerged branch heads require explicit provenance or supersession disposition');
  }

  return result(branch, BRANCH_LIFECYCLE_STATUS.HOLD_UNPROVEN, evidence,
    'no exact merged-to-default-branch evidence proves this ref disposable');
}

export function auditInventory({
  repository,
  defaultBranch = 'main',
  branches,
  pulls,
  generatedAt = new Date().toISOString(),
}) {
  if (!repository) throw new Error('repository is required');
  if (!Array.isArray(branches)) throw new Error('branches must be an array');
  if (!Array.isArray(pulls)) throw new Error('pulls must be an array');

  const results = branches
    .map((branch) =>
      classifyBranch({
        repository,
        defaultBranch,
        branch,
        pulls,
      }),
    )
    .sort((a, b) => a.branch.localeCompare(b.branch));

  const counts = {};
  for (const item of results) {
    counts[item.status] = (counts[item.status] ?? 0) + 1;
  }

  return {
    schemaVersion: 1,
    authority: 'READ_ONLY_AUDIT_NOT_DELETION_AUTHORITY',
    repository,
    defaultBranch,
    generatedAt,
    branchCount: branches.length,
    pullEvidenceCount: pulls.length,
    counts,
    safeMergedHeadCandidates: results.filter(
      (item) =>
        item.status
        === BRANCH_LIFECYCLE_STATUS.SAFE_MERGED_MAIN_HEAD_CANDIDATE,
    ),
    holds: results.filter(
      (item) =>
        item.status
        !== BRANCH_LIFECYCLE_STATUS.SAFE_MERGED_MAIN_HEAD_CANDIDATE,
    ),
    results,
  };
}

function result(branch, status, evidence, reason) {
  return {
    branch: branch.name,
    sha: branch.sha,
    protected: Boolean(branch.protected),
    status,
    reason,
    evidence,
  };
}

export async function fetchInventory({
  repository,
  token,
  fetchImpl = globalThis.fetch,
}) {
  if (!repository) throw new Error('repository is required');
  if (!token) throw new Error('GITHUB_TOKEN is required for live audit');
  if (typeof fetchImpl !== 'function') throw new Error('fetch implementation is required');

  const repo = await fetchJson(
    `${API_ROOT}/repos/${repository}`,
    token,
    fetchImpl,
  );

  const branchRows = await fetchAllPages(
    `${API_ROOT}/repos/${repository}/branches`,
    token,
    fetchImpl,
  );
  const pullRows = await fetchAllPages(
    `${API_ROOT}/repos/${repository}/pulls?state=all&sort=updated&direction=desc`,
    token,
    fetchImpl,
  );

  return {
    repository,
    defaultBranch: repo.default_branch,
    branches: branchRows.map((branch) => ({
      name: branch.name,
      sha: branch.commit?.sha ?? null,
      protected: Boolean(branch.protected),
    })),
    pulls: pullRows.map(normalizePull),
  };
}

export async function fetchAllPages(url, token, fetchImpl = globalThis.fetch) {
  const separator = url.includes('?') ? '&' : '?';
  const all = [];

  for (let page = 1; ; page += 1) {
    const rows = await fetchJson(
      `${url}${separator}per_page=${PER_PAGE}&page=${page}`,
      token,
      fetchImpl,
    );
    if (!Array.isArray(rows)) {
      throw new Error('paginated GitHub response must be an array');
    }
    all.push(...rows);
    if (rows.length < PER_PAGE) break;
  }

  return all;
}

async function fetchJson(url, token, fetchImpl) {
  const response = await fetchImpl(url, {
    method: 'GET',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'emopet-branch-lifecycle-audit',
    },
  });

  if (!response.ok) {
    throw new Error(
      `GitHub API request failed: ${response.status} ${response.statusText}`,
    );
  }
  return response.json();
}

export function parseArgs(argv) {
  const args = {
    repository: process.env.GITHUB_REPOSITORY ?? null,
    fixture: null,
    output: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--repository') args.repository = argv[++index] ?? null;
    else if (arg === '--fixture') args.fixture = argv[++index] ?? null;
    else if (arg === '--output') args.output = argv[++index] ?? null;
    else throw new Error(`unknown argument: ${arg}`);
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let inventory;

  if (args.fixture) {
    inventory = JSON.parse(await readFile(args.fixture, 'utf8'));
  } else {
    inventory = await fetchInventory({
      repository: args.repository,
      token: process.env.GITHUB_TOKEN,
    });
  }

  const report = auditInventory(inventory);
  const serialized = `${JSON.stringify(report, null, 2)}\n`;

  if (args.output) await writeFile(args.output, serialized, 'utf8');
  else process.stdout.write(serialized);
}

if (
  process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
