import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

// Workspace packages run their tests through `pnpm test` (turbo) with directory
// globs, so new files there are picked up automatically. Root scripts/ and
// tools/ tests have no such runner: each one must be named in a workflow.
const ROOT_TEST_DIRS = ['scripts', 'tools'];
// Matches a root-relative path, optionally `./`-prefixed, but not the tail of
// a longer path such as apps/web/scripts/x.test.mjs.
const ROOT_TEST_PATH = /(?<![\w./-])(?:\.\/)?((?:scripts|tools)\/[\w./-]+\.test\.mjs)(?![\w.-])/g;

const indentOf = (line) => line.length - line.trimStart().length;
const isBlankOrComment = (line) => line.trim() === '' || line.trimStart().startsWith('#');

// A guard only protects main if it runs on every pull request, so a workflow
// counts only when it has a `pull_request` trigger with no `paths` or
// `paths-ignore` filter. Branch and activity-type filters are not evaluated.
function runsOnEveryPullRequest(workflow) {
  const lines = workflow.split(/\r?\n/);
  const start = lines.findIndex((line) => /^["']?on["']?:/.test(line));
  if (start === -1) return false;
  const inline = lines[start].replace(/^["']?on["']?:/, '').replace(/\s+#.*$/, '').trim();
  if (inline) return /(^|[\s[,])pull_request($|[\s\],])/.test(inline);

  const triggers = [];
  for (const line of lines.slice(start + 1)) {
    if (isBlankOrComment(line)) continue;
    if (indentOf(line) === 0) break;
    triggers.push(line);
  }
  const at = triggers.findIndex((line) => /^\s+pull_request:/.test(line));
  if (at === -1) return false;
  const filters = [triggers[at].replace(/^\s+pull_request:/, '')];
  for (const line of triggers.slice(at + 1)) {
    if (indentOf(line) <= indentOf(triggers[at])) break;
    filters.push(line);
  }
  return !filters.some((line) => /(^|[\s{,])paths(-ignore)?\s*:/.test(line));
}

// Returns the shell text of every `run:` step. A literal (`|`) block keeps its
// lines, a folded (`>`) block becomes one line, and a block ends at the first
// non-blank line indented no deeper than its `run:` key. Anything outside a
// `run:` value (`paths:` filters, step names, `env:`, YAML comments) is ignored.
function runBlocks(workflow) {
  const lines = workflow.split(/\r?\n/);
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    const match = /^(\s*(?:-\s+)?)run:(.*)$/.exec(lines[i]);
    if (!match) continue;
    const value = match[2].trim();
    const header = /^([|>])[-+0-9]*(\s+#.*)?$/.exec(value);
    if (!header) {
      blocks.push(value.replace(/\s+#.*$/, ''));
      continue;
    }
    const body = [];
    while (
      i + 1 < lines.length &&
      (lines[i + 1].trim() === '' || indentOf(lines[i + 1]) > match[1].length)
    ) {
      body.push(lines[++i].trim());
    }
    blocks.push(body.join(header[1] === '>' ? ' ' : '\n'));
  }
  return blocks;
}

function shellCommands(text) {
  return text
    .replace(/\\\r?\n/g, ' ')
    .split(/\r?\n|&&|\|\||;/)
    .map((command) => command.replace(/(^|\s)#.*$/, '').trim())
    .filter(Boolean);
}

// Collects every root scripts/ or tools/ test that an every-PR workflow runs
// with `node --test`, either directly in a `run:` step or through a root
// package.json script it calls as `pnpm <name>` / `pnpm run <name>`. `if:`
// conditions and `continue-on-error` are not evaluated.
function executedRootTests(workflows, scripts) {
  const executed = new Set();
  const expanded = new Set();
  const visit = (command) => {
    const pnpm = /^pnpm\s+(?:run\s+)?([\w:.-]+)(\s|$)/.exec(command);
    if (pnpm && Object.hasOwn(scripts, pnpm[1]) && !expanded.has(pnpm[1])) {
      expanded.add(pnpm[1]);
      shellCommands(scripts[pnpm[1]]).forEach(visit);
    }
    if (!/^node\s(.*\s)?--test(\s|$)/.test(command)) return;
    for (const [, path] of command.matchAll(ROOT_TEST_PATH)) executed.add(path);
  };
  for (const workflow of workflows.filter(runsOnEveryPullRequest)) {
    runBlocks(workflow).flatMap(shellCommands).forEach(visit);
  }
  return executed;
}

test('every root scripts/ and tools/ test runs in a workflow triggered by every pull request', async () => {
  const workflowDir = new URL('../../.github/workflows/', import.meta.url);
  const workflows = await Promise.all(
    (await readdir(workflowDir))
      .filter((file) => /\.ya?ml$/.test(file))
      .map((file) => readFile(new URL(file, workflowDir), 'utf8')),
  );
  const { scripts } = JSON.parse(
    await readFile(new URL('../../package.json', import.meta.url), 'utf8'),
  );
  const rootTests = [];
  for (const dir of ROOT_TEST_DIRS) {
    const files = await readdir(new URL(`../../${dir}/`, import.meta.url), { recursive: true });
    for (const file of files) {
      const path = `${dir}/${file.replaceAll('\\', '/')}`;
      if (path.endsWith('.test.mjs') && !path.includes('/node_modules/')) rootTests.push(path);
    }
  }

  assert.ok(rootTests.includes('scripts/control/control-test-ci-coverage.test.mjs'));
  assert.ok(rootTests.some((path) => path.startsWith('tools/')));
  const executed = executedRootTests(workflows, scripts);
  assert.deepEqual(
    rootTests.filter((path) => !executed.has(path)).sort(),
    [],
    'run each listed file with `node --test` in a workflow that runs on every pull request, ' +
      'e.g. .github/workflows/security-supply-chain.yml',
  );
});

test('Windows portability keeps the cached backend build closure', async () => {
  const workflow = await readFile(
    new URL('../../.github/workflows/windows-portability.yml', import.meta.url),
    'utf8',
  );
  const commands = runBlocks(workflow).flatMap(shellCommands);

  assert.ok(
    commands.includes('pnpm turbo run build --filter=@emopet/api...'),
    'Windows backend build closure must stay on Turbo so deterministic outputs can be replayed',
  );
  assert.ok(
    !commands.some((command) =>
      /pnpm\s+--filter\s+['"]?@emopet\/api\^\.\.\.['"]?\s+build/.test(command) ||
      /pnpm\s+--filter\s+['"]?@emopet\/api['"]?\s+build/.test(command)
    ),
    'do not restore the sequential direct backend rebuilds in windows-portability.yml',
  );
});

test('only an every-PR `node --test` run step, direct or via a root pnpm script, counts', () => {
  const scripts = {
    'guard:a': 'node --test scripts/control/a.test.mjs',
    'guard:all': 'pnpm guard:a',
    loop: 'pnpm loop',
  };
  const steps = (body) => `jobs:\n  guard:\n    steps:\n${body}`;
  const job = (body) => `on:\n  pull_request:\n${steps(body)}`;
  const run = steps('      - run: node --test scripts/control/a.test.mjs\n');
  const covered = (workflow) => [...executedRootTests([workflow], scripts)];
  const a = ['scripts/control/a.test.mjs'];

  const counts = {
    'inline trigger list': `on: [push, pull_request]\n${run}`,
    'inline trigger': `on: pull_request\n${run}`,
    'branch-filtered pull_request': `on:\n  pull_request:\n    branches: [main]\n${run}`,
    'paths filter on push only': `on:\n  pull_request:\n  push:\n    paths: ['docs/**']\n${run}`,
    'comment inside triggers': `on:\n# every PR\n  pull_request:\n  workflow_dispatch:\n${run}`,
    'single-line run': job('      - run: node --test scripts/control/a.test.mjs\n'),
    'literal block': job(
      '      - name: guard\n        run: |\n          cc --version\n          node --test scripts/control/a.test.mjs\n',
    ),
    'CRLF literal block': job(
      '      - name: guard\n        run: |\n          node --test scripts/control/a.test.mjs\n',
    ).replaceAll('\n', '\r\n'),
    'folded block': job('      - run: >\n          node --test\n          scripts/control/a.test.mjs\n'),
    'line continuation': job(
      '      - run: |\n          node --test \\\n            scripts/control/a.test.mjs\n',
    ),
    'after another command': job('      - run: pnpm build && node --test scripts/control/a.test.mjs\n'),
    'root pnpm script': job('      - run: pnpm guard:a\n'),
    'nested pnpm run script': job('      - run: pnpm run guard:all\n'),
    './-prefixed path': job('      - run: node --test ./scripts/control/a.test.mjs\n'),
  };
  for (const [name, workflow] of Object.entries(counts)) {
    assert.deepEqual(covered(workflow), a, name);
  }
  assert.deepEqual(
    covered(job('      - run: node --test tools/security/t.test.mjs "scripts/docs/x/d.test.mjs"\n')),
    ['tools/security/t.test.mjs', 'scripts/docs/x/d.test.mjs'],
    'tools/ and nested scripts/ paths',
  );

  const ignored = {
    'path-filtered pull_request': `on:\n  pull_request:\n    paths:\n      - 'scripts/**'\n${run}`,
    'paths-ignore on pull_request': `on:\n  pull_request:\n    paths-ignore: ['docs/**']\n${run}`,
    'inline paths filter': `on:\n  pull_request: { paths: ['scripts/**'] }\n${run}`,
    'push only': `on:\n  push:\n    branches: [main]\n${run}`,
    'pull_request_target only': `on: [pull_request_target]\n${run}`,
    'no triggers': run,
    'listed only in a paths filter':
      "on:\n  pull_request:\n  push:\n    paths:\n      - 'scripts/control/a.test.mjs'\n" +
      steps('      - run: echo ok\n'),
    'step name only': job('      - name: node --test scripts/control/a.test.mjs\n        run: echo ok\n'),
    'YAML comment': job('      # - run: node --test scripts/control/a.test.mjs\n      - run: echo ok\n'),
    'shell comment line': job(
      '      - run: |\n          # node --test scripts/control/a.test.mjs\n          echo ok\n',
    ),
    'trailing comment': job('      - run: echo ok # node --test scripts/control/a.test.mjs\n'),
    'env key after the block': job(
      '      - run: |\n          echo ok\n        env:\n          GUARD: node --test scripts/control/a.test.mjs\n',
    ),
    'not run by node --test': job('      - run: cat scripts/control/a.test.mjs\n'),
    'echoed command': job('      - run: echo node --test scripts/control/a.test.mjs\n'),
    'longer file name': job('      - run: node --test scripts/control/a.test.mjs.bak\n'),
    'workspace-local scripts/ path': job('      - run: node --test apps/web/scripts/control/a.test.mjs\n'),
    'workspace-local tools/ path': job('      - run: node --test packages/x/tools/control/a.test.mjs\n'),
    'workspace script, not root': job('      - run: pnpm --filter @emopet/web guard:a\n'),
    'unknown pnpm script': job('      - run: pnpm guard:missing\n'),
    'self-referencing pnpm script': job('      - run: pnpm loop\n'),
  };
  for (const [name, workflow] of Object.entries(ignored)) {
    assert.deepEqual(covered(workflow), [], name);
  }
});
