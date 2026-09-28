import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  EXTRA_WEB_INPUTS,
  WEB_DIR,
  decide,
  webBuildInputs,
} from '../../apps/web/scripts/vercel-ignore-build.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const scriptPath = path.join(root, 'apps/web/scripts/vercel-ignore-build.mjs');

test('emopet-web Vercel project runs the ignored build step script', () => {
  const config = JSON.parse(readFileSync(path.join(root, 'apps/web/vercel.json'), 'utf8'));
  assert.equal(config.ignoreCommand, 'node scripts/vercel-ignore-build.mjs');
});

test('web build inputs cover apps/web, its workspace packages and root build files', () => {
  const inputs = webBuildInputs(root);
  const manifest = JSON.parse(readFileSync(path.join(root, 'apps/web/package.json'), 'utf8'));
  const direct = Object.entries(manifest.dependencies ?? {})
    .filter(([, spec]) => spec.startsWith('workspace:'))
    .map(([name]) => name.replace('@emopet/', 'packages/'));

  assert.ok(inputs.includes(WEB_DIR));
  for (const dir of direct) assert.ok(inputs.includes(dir), dir);
  for (const file of ['pnpm-lock.yaml', 'package.json', 'turbo.json']) assert.ok(inputs.includes(file), file);
  for (const unrelated of ['backend', 'firmware', 'apps/mobile', 'docs']) {
    assert.ok(!inputs.includes(unrelated), unrelated);
  }
});

function sourceFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', '__tests__'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...sourceFiles(full));
    else if (/\.(?:[cm]?[jt]sx?)$/.test(entry.name) && !entry.name.includes('.test.')) files.push(full);
  }
  return files;
}

test('every process.cwd() read outside apps/web is a declared web input', () => {
  const reads = [];
  for (const file of sourceFiles(path.join(root, WEB_DIR))) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/(?:join|resolve)\(\s*process\.cwd\(\)\s*,([^)]*)\)/g)) {
      const parts = [...match[1].matchAll(/['"]([^'"]+)['"]/g)].map((part) => part[1]);
      const target = path.relative(root, path.resolve(root, WEB_DIR, ...parts)).split(path.sep).join('/');
      if (!target.startsWith('..') && !target.startsWith(`${WEB_DIR}/`)) reads.push(target);
    }
  }
  assert.ok(reads.length > 0, 'expected the breed profile read');
  for (const target of reads) {
    assert.ok(
      EXTRA_WEB_INPUTS.some((input) => target === input || target.startsWith(`${input}/`)),
      `${target} is read by apps/web but missing from EXTRA_WEB_INPUTS`,
    );
  }
});

function fixture() {
  const dir = mkdtempSync(path.join(tmpdir(), 'vercel-ignore-'));
  const run = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const write = (file, content) => {
    mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    writeFileSync(path.join(dir, file), content);
  };
  const commit = (message) => {
    run('add', '-A');
    run('-c', 'user.name=t', '-c', 'user.email=t@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-q', '-m', message);
    return run('rev-parse', 'HEAD');
  };

  run('init', '-q');
  write('package.json', '{"name":"root"}');
  write('pnpm-lock.yaml', 'lockfileVersion: 9\n');
  write('apps/web/package.json', JSON.stringify({ name: '@t/web', dependencies: { '@t/ai': 'workspace:*' } }));
  write('packages/ai/package.json', JSON.stringify({ name: '@t/ai', dependencies: { '@t/shared': 'workspace:*' } }));
  write('packages/shared/package.json', JSON.stringify({ name: '@t/shared' }));
  write('packages/unused/package.json', JSON.stringify({ name: '@t/unused' }));
  write('backend/package.json', JSON.stringify({ name: '@t/api' }));
  write('data/breed_profiles.json', '[]');
  write('data/other.json', '[]');
  write('apps/web/scripts/vercel-ignore-build.mjs', readFileSync(scriptPath, 'utf8'));
  const base = commit('base');
  return { dir, write, commit, base, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

test('a deployment is skipped only when no web input changed since the base', () => {
  const repo = fixture();
  try {
    const cases = [
      ['backend/src.ts', false],
      ['packages/unused/index.ts', false],
      ['data/other.json', false],
      ['apps/web/page.tsx', true],
      ['packages/shared/index.ts', true], // transitive, through packages/ai
      ['pnpm-lock.yaml', true],
      ['data/breed_profiles.json', true],
    ];
    let previous = repo.base;
    for (const [file, build] of cases) {
      repo.write(file, `${file} changed`);
      const head = repo.commit(file);
      assert.equal(decide(repo.dir, previous).build, build, file);
      previous = head;
    }
  } finally {
    repo.cleanup();
  }
});

test('without a previous deployment the base is HEAD^, and any doubt builds', () => {
  const repo = fixture();
  try {
    assert.equal(decide(repo.dir, undefined).build, true, 'single commit: no HEAD^');
    assert.equal(decide(repo.dir, '0123456789abcdef0123456789abcdef01234567').build, true, 'unknown base');

    repo.write('backend/src.ts', 'x');
    repo.commit('backend only');
    assert.equal(decide(repo.dir, undefined).build, false, 'HEAD^ fallback, backend only');

    const script = path.join(repo.dir, 'apps/web/scripts/vercel-ignore-build.mjs');
    const env = { ...process.env, VERCEL_GIT_PREVIOUS_SHA: '' };
    assert.equal(spawnSync(process.execPath, [script], { cwd: path.join(repo.dir, 'apps/web'), env }).status, 0);

    repo.write('apps/web/page.tsx', 'x');
    repo.commit('web');
    assert.equal(spawnSync(process.execPath, [script], { cwd: path.join(repo.dir, 'apps/web'), env }).status, 1);
  } finally {
    repo.cleanup();
  }
});
