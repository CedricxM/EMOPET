import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = process.cwd();
const p0WorkflowPath = resolve(repoRoot, '.github', 'workflows', 'p0-db-baseline.yml');
const securityWorkflowPath = resolve(repoRoot, '.github', 'workflows', 'security-supply-chain.yml');

const p0Workflow = readFileSync(p0WorkflowPath, 'utf8');
const securityWorkflow = readFileSync(securityWorkflowPath, 'utf8');

function pullRequestPaths(source) {
  const lines = source.split(/\r?\n/);
  const pullRequest = lines.findIndex((line) => /^  pull_request:\s*$/.test(line));
  assert.notEqual(pullRequest, -1, 'p0-db-baseline.yml must define pull_request');

  const paths = lines.findIndex((line, index) => index > pullRequest && /^    paths:\s*$/.test(line));
  assert.notEqual(paths, -1, 'p0-db-baseline.yml pull_request must define paths');

  const entries = [];
  for (let index = paths + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^  \S/.test(line)) break;
    const match = line.match(/^      -\s+['"]?(.+?)['"]?\s*$/);
    if (match) entries.push(match[1]);
  }
  return entries;
}

function globToRegExp(glob) {
  let expression = '^';
  for (let index = 0; index < glob.length; index += 1) {
    const char = glob[index];
    if (char === '*' && glob[index + 1] === '*') {
      expression += '.*';
      index += 1;
      continue;
    }
    if (char === '*') {
      expression += '[^/]*';
      continue;
    }
    if (char === '?') {
      expression += '[^/]';
      continue;
    }
    expression += /[\\^$.*+?()[\]{}|]/.test(char) ? `\\${char}` : char;
  }
  expression += '$';
  return new RegExp(expression);
}

function isCovered(fileName, patterns = triggerPaths) {
  let included = false;
  for (const pattern of patterns) {
    const excluded = pattern.startsWith('!');
    const candidate = excluded ? pattern.slice(1) : pattern;
    if (globToRegExp(candidate).test(fileName)) included = !excluded;
  }
  return included;
}

const triggerPaths = pullRequestPaths(p0Workflow);
const protectedExamples = [
  'backend/api/security/security-detection-scheduler.ts',
  'backend/api/security/auth-rate-limit-store.ts',
  'backend/db/schema/index.ts',
  'backend/test/security-detection-scheduler.integration.test.mjs',
  'packages/shared/src/validators/index.ts',
  'config/security/device-pop-challenge-v1.json',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'turbo.json',
];

test('P0 DB workflow exposes a non-empty pull_request paths list', () => {
  assert.ok(triggerPaths.length > 0);
});

test('backend changes broadly trigger PostgreSQL validation', () => {
  assert.ok(triggerPaths.includes('backend/**'));
});

test('shared-package changes broadly trigger PostgreSQL validation', () => {
  assert.ok(triggerPaths.includes('packages/**'));
});

test('repository config changes broadly trigger PostgreSQL validation', () => {
  assert.ok(triggerPaths.includes('config/**'));
});

test('root dependency/workspace manifests trigger PostgreSQL validation', () => {
  for (const fileName of ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'turbo.json']) {
    assert.ok(isCovered(fileName), `${fileName} does not trigger p0-db-baseline.yml`);
  }
});

test('security detection scheduler changes trigger PostgreSQL validation', () => {
  assert.ok(isCovered('backend/api/security/security-detection-scheduler.ts'));
});

test('shared auth rate-limit store changes trigger PostgreSQL validation', () => {
  assert.ok(isCovered('backend/api/security/auth-rate-limit-store.ts'));
});

test('database schema and gated integration tests remain covered', () => {
  for (const fileName of [
    'backend/db/schema/index.ts',
    'backend/test/security-detection-scheduler.integration.test.mjs',
  ]) {
    assert.ok(isCovered(fileName), `${fileName} does not trigger p0-db-baseline.yml`);
  }
});

test('no negative path pattern excludes a protected PostgreSQL surface', () => {
  const exclusions = triggerPaths.filter((pattern) => pattern.startsWith('!'));
  const shadowed = [];
  for (const fileName of protectedExamples) {
    for (const pattern of exclusions) {
      if (globToRegExp(pattern.slice(1)).test(fileName)) shadowed.push(`${pattern} excludes ${fileName}`);
    }
  }
  assert.deepEqual(shadowed, []);
});

test('the trigger guard is itself enforced by the required security regression job', () => {
  assert.match(
    securityWorkflow,
    /node --test scripts\/control\/p0-db-trigger-coverage\.test\.mjs/,
  );
});
