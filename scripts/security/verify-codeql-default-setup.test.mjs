import test from 'node:test';
import assert from 'node:assert/strict';
import { requireCodeqlAnalysis, selectCodeqlRun } from './verify-codeql-default-setup.mjs';

const sha = 'a'.repeat(40);
const run = {
  id: 10, path: 'dynamic/github-code-scanning/codeql', event: 'dynamic',
  head_sha: sha, status: 'completed', conclusion: 'success',
};
const jobs = ['actions', 'c-cpp', 'javascript-typescript', 'python'].map((language) => ({
  name: `Analyze (${language})`, status: 'completed', conclusion: 'success',
  steps: [{ name: 'Perform CodeQL Analysis', status: 'completed', conclusion: 'success' }],
}));

test('accepts complete default setup evidence for the exact commit', () => {
  assert.equal(selectCodeqlRun([run], sha), run);
  assert.doesNotThrow(() => requireCodeqlAnalysis(run, jobs, sha));
});

test('other commits and similarly named custom workflows are not CodeQL evidence', () => {
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

test('a previous success cannot hide the newest failed or pending run', () => {
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

test('missing languages, skipped analysis and incomplete jobs fail closed', () => {
  for (const changed of [
    [], jobs.slice(1),
    [{ ...jobs[0], conclusion: 'skipped' }, ...jobs.slice(1)],
    [{ ...jobs[0], status: 'in_progress' }, ...jobs.slice(1)],
    [{ ...jobs[0], steps: [] }, ...jobs.slice(1)],
    [{ ...jobs[0], steps: [{ name: 'Perform CodeQL Analysis', status: 'completed', conclusion: 'skipped' }] }, ...jobs.slice(1)],
    [...jobs, { name: 'Analyze (new-language)', status: 'completed', conclusion: 'failure' }],
  ]) {
    assert.throws(() => requireCodeqlAnalysis(run, changed, sha));
  }
});
