import test from 'node:test';
import assert from 'node:assert/strict';
import {
  codeqlJobEvidenceState,
  isDocumentationOnlyPullRequestFiles,
  normalizePullRequestNumber,
  requireCodeqlAlertInventory,
  requireCodeqlAnalysis,
  requireCodeqlCheckRunEvidence,
  requireCodeqlRunSuccess,
  selectCodeqlRun,
} from './verify-codeql-default-setup.mjs';

const sha = 'a'.repeat(40);
const run = {
  id: 10, path: 'dynamic/github-code-scanning/codeql', event: 'dynamic',
  head_sha: sha, status: 'completed', conclusion: 'success',
};
const jobs = ['actions', 'c-cpp', 'csharp', 'javascript-typescript', 'python'].map((language) => ({
  name: `Analyze (${language})`, status: 'completed', conclusion: 'success',
  steps: [{ name: 'Perform CodeQL Analysis', status: 'completed', conclusion: 'success' }],
}));

test('accepts complete default setup evidence for the exact commit', () => {
  assert.equal(selectCodeqlRun([run], sha), run);
  assert.equal(codeqlJobEvidenceState(jobs), 'ready');
  assert.doesNotThrow(() => requireCodeqlAnalysis(run, jobs, sha));
});

test('completed successful jobs remain valid run evidence when GitHub truncates step details', () => {
  const truncated = jobs.map((job, index) => index % 2 === 0 ? { ...job, steps: [] } : job);
  assert.equal(codeqlJobEvidenceState(truncated), 'failed');
  assert.doesNotThrow(() => requireCodeqlRunSuccess(run, truncated, sha));
  assert.throws(() => requireCodeqlAnalysis(run, truncated, sha), /Missing successful analysis\/upload step/);
});

test('exact-head check-run fallback requires every configured language and GitHub Advanced Security aggregate', () => {
  const checks = [
    ...jobs.map((job) => ({
      name: job.name,
      status: 'completed',
      conclusion: 'success',
      app: { name: 'GitHub Actions' },
    })),
    {
      name: 'CodeQL',
      status: 'completed',
      conclusion: 'success',
      app: { name: 'GitHub Advanced Security' },
    },
  ];

  assert.doesNotThrow(() => requireCodeqlCheckRunEvidence(checks));
  assert.throws(
    () => requireCodeqlCheckRunEvidence(checks.filter((check) => check.name !== 'Analyze (csharp)')),
    /Analyze \(csharp\)/,
  );
  assert.throws(
    () => requireCodeqlCheckRunEvidence(checks.map((check) =>
      check.name === 'Analyze (actions)' ? { ...check, conclusion: 'failure' } : check
    )),
    /Analyze \(actions\)/,
  );
  assert.throws(
    () => requireCodeqlCheckRunEvidence(checks.map((check) =>
      check.name === 'CodeQL' ? { ...check, app: { name: 'GitHub Actions' } } : check
    )),
    /GitHub Advanced Security/,
  );
});

test('other commits and similarly named custom workflows are not CodeQL analysis evidence', () => {
  const impostors = [
    { ...run, head_sha: 'b'.repeat(40) },
    { ...run, path: '.github/workflows/codeql.yml' },
    { ...run, event: 'pull_request' },
  ];
  assert.equal(selectCodeqlRun(impostors, sha), undefined);
  for (const candidate of [undefined, ...impostors]) {
    assert.throws(() => requireCodeqlAnalysis(candidate, jobs, sha));
  }
});

test('a previous analysis success cannot hide the newest failed or pending run', () => {
  for (const latest of [
    { ...run, id: 11, conclusion: 'failure' },
    { ...run, id: 11, status: 'in_progress', conclusion: null },
    { ...run, id: 11, conclusion: 'cancelled' },
    { ...run, id: 11, conclusion: 'skipped' },
  ]) {
    const selected = selectCodeqlRun([run, latest], sha);
    assert.equal(selected, latest);
    assert.throws(() => requireCodeqlAnalysis(selected, jobs, sha));
  }
});

test('jobs endpoint eventual consistency is pending, not a false security failure', () => {
  assert.equal(codeqlJobEvidenceState([]), 'pending');
  assert.equal(codeqlJobEvidenceState(jobs.slice(1)), 'pending');
  assert.equal(
    codeqlJobEvidenceState([{ ...jobs[0], status: 'in_progress', conclusion: null }, ...jobs.slice(1)]),
    'pending',
  );
});

test('completed failed/skipped analysis evidence fails closed', () => {
  for (const changed of [
    [{ ...jobs[0], conclusion: 'failure' }, ...jobs.slice(1)],
    [{ ...jobs[0], conclusion: 'skipped' }, ...jobs.slice(1)],
    [{ ...jobs[0], steps: [] }, ...jobs.slice(1)],
    [{ ...jobs[0], steps: [{ name: 'Perform CodeQL Analysis', status: 'completed', conclusion: 'skipped' }] }, ...jobs.slice(1)],
    [...jobs, { name: 'Analyze (new-language)', status: 'completed', conclusion: 'failure' }],
  ]) {
    assert.equal(codeqlJobEvidenceState(changed), 'failed');
    assert.throws(() => requireCodeqlAnalysis(run, changed, sha));
  }
});

test('requireCodeqlAnalysis still rejects pending or incomplete job evidence', () => {
  for (const changed of [
    [], jobs.slice(1),
    [{ ...jobs[0], status: 'in_progress', conclusion: null }, ...jobs.slice(1)],
  ]) {
    assert.throws(() => requireCodeqlAnalysis(run, changed, sha));
  }
});

test('pull-request number parsing is strict and optional', () => {
  assert.equal(normalizePullRequestNumber('224'), 224);
  assert.equal(normalizePullRequestNumber(''), null);
  assert.equal(normalizePullRequestNumber(undefined), null);
  for (const invalid of ['0', '-1', '1.2', 'abc']) {
    assert.throws(() => normalizePullRequestNumber(invalid));
  }
});

test('native open-alert inventory passes only when empty', () => {
  assert.deepEqual(requireCodeqlAlertInventory([]), []);
  const alert = {
    number: 17,
    state: 'open',
    tool: { name: 'CodeQL' },
    rule: { id: 'js/example' },
  };
  assert.throws(() => requireCodeqlAlertInventory([alert]), /1 open alert/);
  assert.throws(() => requireCodeqlAlertInventory({}), /must be an array/);
  assert.throws(
    () => requireCodeqlAlertInventory([{ ...alert, state: 'dismissed' }]),
    /Unexpected entry/,
  );
  assert.throws(
    () => requireCodeqlAlertInventory([{ ...alert, tool: { name: 'Other' } }]),
    /Unexpected entry/,
  );
});


test('documentation-only scope is accepted only for a narrow documentation path set', () => {
  assert.equal(
    isDocumentationOnlyPullRequestFiles([
      { filename: 'docs/partnerships/BRETAGNE.md', status: 'added' },
      { filename: 'README.md', status: 'modified' },
    ]),
    true,
  );

  assert.equal(
    isDocumentationOnlyPullRequestFiles([
      {
        filename: 'docs/partnerships/RENAMED.md',
        previous_filename: 'docs/partnerships/OLD.md',
        status: 'renamed',
      },
    ]),
    true,
  );
});

test('documentation-only scope fails closed for code, operational data or code-to-doc renames', () => {
  for (const files of [
    [],
    [{ filename: 'apps/web/lib/security.ts', status: 'modified' }],
    [{ filename: 'docs/control/runtime-policy.json', status: 'modified' }],
    [{ filename: '.github/workflows/security-supply-chain.yml', status: 'modified' }],
    [{
      filename: 'docs/archive/old-code.md',
      previous_filename: 'apps/web/lib/old-code.ts',
      status: 'renamed',
    }],
    [{ filename: '', status: 'modified' }],
  ]) {
    assert.equal(isDocumentationOnlyPullRequestFiles(files), false);
  }
});
