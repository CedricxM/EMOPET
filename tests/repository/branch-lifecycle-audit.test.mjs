import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  BRANCH_LIFECYCLE_STATUS,
  auditInventory,
  classifyBranch,
  fetchAllPages,
  normalizePull,
  parseArgs,
} from '../../scripts/repository/branch-lifecycle-audit.mjs';

const repository = 'CedricxM/EMOPET';

function branch(name, sha, protectedBranch = false) {
  return { name, sha, protected: protectedBranch };
}

function pull({
  number = 1,
  state = 'closed',
  merged = false,
  headRef = 'feature/test',
  headSha = 'abc',
  baseRef = 'main',
  headRepoFullName = repository,
} = {}) {
  return {
    number,
    state,
    merged,
    mergedAt: merged ? '2026-10-02T00:00:00Z' : null,
    closedAt: state === 'closed' ? '2026-10-02T00:00:00Z' : null,
    headRef,
    headSha,
    headRepoFullName,
    baseRef,
    htmlUrl: `https://github.com/${repository}/pull/${number}`,
    title: 'fixture',
  };
}

test('default branch is never a cleanup candidate', () => {
  const result = classifyBranch({
    repository,
    defaultBranch: 'main',
    branch: branch('main', 'm1'),
    pulls: [],
  });
  assert.equal(result.status, BRANCH_LIFECYCLE_STATUS.KEEP_DEFAULT_BRANCH);
});

test('open PR head is kept even when historical merged evidence exists', () => {
  const result = classifyBranch({
    repository,
    defaultBranch: 'main',
    branch: branch('feature/live', 'new-sha'),
    pulls: [
      pull({
        number: 10,
        merged: true,
        headRef: 'feature/live',
        headSha: 'new-sha',
      }),
      pull({
        number: 11,
        state: 'open',
        headRef: 'feature/live',
        headSha: 'new-sha',
      }),
    ],
  });
  assert.equal(result.status, BRANCH_LIFECYCLE_STATUS.KEEP_OPEN_PR_HEAD);
});

test('protected branch is kept', () => {
  const result = classifyBranch({
    repository,
    defaultBranch: 'main',
    branch: branch('release/held', 'sha-1', true),
    pulls: [],
  });
  assert.equal(result.status, BRANCH_LIFECYCLE_STATUS.KEEP_PROTECTED);
});

test('exact merged-to-main head is the only automatic safe candidate', () => {
  const result = classifyBranch({
    repository,
    defaultBranch: 'main',
    branch: branch('feature/merged', 'sha-1'),
    pulls: [
      pull({
        number: 20,
        merged: true,
        headRef: 'feature/merged',
        headSha: 'sha-1',
        baseRef: 'main',
      }),
    ],
  });
  assert.equal(
    result.status,
    BRANCH_LIFECYCLE_STATUS.SAFE_MERGED_MAIN_HEAD_CANDIDATE,
  );
});

test('ref reuse or movement fails closed even if old merged evidence exists', () => {
  const result = classifyBranch({
    repository,
    defaultBranch: 'main',
    branch: branch('feature/reused', 'sha-new'),
    pulls: [
      pull({
        number: 30,
        merged: true,
        headRef: 'feature/reused',
        headSha: 'sha-old',
      }),
    ],
  });
  assert.equal(result.status, BRANCH_LIFECYCLE_STATUS.HOLD_REF_MOVED);
});

test('merge into a non-default branch is not deletion evidence', () => {
  const result = classifyBranch({
    repository,
    defaultBranch: 'main',
    branch: branch('stack/child', 'sha-1'),
    pulls: [
      pull({
        number: 40,
        merged: true,
        headRef: 'stack/child',
        headSha: 'sha-1',
        baseRef: 'stack/parent',
      }),
    ],
  });
  assert.equal(result.status, BRANCH_LIFECYCLE_STATUS.HOLD_NON_MAIN_MERGE);
});

test('closed unmerged branch stays on hold', () => {
  const result = classifyBranch({
    repository,
    defaultBranch: 'main',
    branch: branch('feature/closed', 'sha-1'),
    pulls: [
      pull({
        number: 50,
        state: 'closed',
        merged: false,
        headRef: 'feature/closed',
        headSha: 'sha-1',
      }),
    ],
  });
  assert.equal(result.status, BRANCH_LIFECYCLE_STATUS.HOLD_CLOSED_UNMERGED);
});

test('branch with no exact PR evidence stays unproven', () => {
  const result = classifyBranch({
    repository,
    defaultBranch: 'main',
    branch: branch('legacy/orphan', 'sha-1'),
    pulls: [],
  });
  assert.equal(result.status, BRANCH_LIFECYCLE_STATUS.HOLD_UNPROVEN);
});

test('fork PR with the same ref name does not authorize local branch cleanup', () => {
  const result = classifyBranch({
    repository,
    defaultBranch: 'main',
    branch: branch('feature/name', 'sha-1'),
    pulls: [
      pull({
        number: 60,
        merged: true,
        headRef: 'feature/name',
        headSha: 'sha-1',
        headRepoFullName: 'someone/fork',
      }),
    ],
  });
  assert.equal(result.status, BRANCH_LIFECYCLE_STATUS.HOLD_UNPROVEN);
});

test('audit report separates exact merged-head candidates from all holds', () => {
  const report = auditInventory({
    repository,
    defaultBranch: 'main',
    generatedAt: '2026-10-02T18:00:00.000Z',
    branches: [
      branch('main', 'm1'),
      branch('feature/merged', 'sha-1'),
      branch('feature/orphan', 'sha-2'),
    ],
    pulls: [
      pull({
        number: 70,
        merged: true,
        headRef: 'feature/merged',
        headSha: 'sha-1',
      }),
    ],
  });

  assert.equal(report.authority, 'READ_ONLY_AUDIT_NOT_DELETION_AUTHORITY');
  assert.equal(report.branchCount, 3);
  assert.equal(report.safeMergedHeadCandidates.length, 1);
  assert.equal(report.safeMergedHeadCandidates[0].branch, 'feature/merged');
  assert.equal(report.holds.length, 2);
});

test('normalizePull preserves repository, SHA, merge and base evidence', () => {
  const normalized = normalizePull({
    number: 80,
    state: 'closed',
    merged_at: '2026-10-02T00:00:00Z',
    closed_at: '2026-10-02T00:00:00Z',
    head: {
      ref: 'feature/x',
      sha: 'sha-x',
      repo: { full_name: repository },
    },
    base: { ref: 'main' },
    html_url: 'https://example.test/pr/80',
    title: 'x',
  });

  assert.equal(normalized.merged, true);
  assert.equal(normalized.headRepoFullName, repository);
  assert.equal(normalized.headSha, 'sha-x');
  assert.equal(normalized.baseRef, 'main');
});

test('pagination consumes all pages and stops on the first short page', async () => {
  const seen = [];
  const fetchImpl = async (url) => {
    seen.push(url);
    const page = Number(new URL(url).searchParams.get('page'));
    const rows =
      page === 1
        ? Array.from({ length: 100 }, (_, index) => ({ index }))
        : [{ index: 100 }];
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => rows,
    };
  };

  const rows = await fetchAllPages(
    'https://api.github.com/repos/CedricxM/EMOPET/branches',
    'token',
    fetchImpl,
  );

  assert.equal(rows.length, 101);
  assert.equal(seen.length, 2);
});

test('CLI parser is explicit and rejects unknown arguments', () => {
  assert.deepEqual(
    parseArgs([
      '--repository',
      repository,
      '--fixture',
      'fixture.json',
      '--output',
      'report.json',
    ]),
    {
      repository,
      fixture: 'fixture.json',
      output: 'report.json',
    },
  );

  assert.throws(() => parseArgs(['--delete']), /unknown argument/);
});

test('audit implementation contains no branch deletion request', async () => {
  const source = await readFile(
    new URL('../../scripts/repository/branch-lifecycle-audit.mjs', import.meta.url),
    'utf8',
  );

  assert.doesNotMatch(source, /method\s*:\s*['"]DELETE['"]/i);
  assert.doesNotMatch(source, /git\/refs\/heads\/.*DELETE/i);
  assert.match(source, /READ_ONLY_AUDIT_NOT_DELETION_AUTHORITY/);
});
