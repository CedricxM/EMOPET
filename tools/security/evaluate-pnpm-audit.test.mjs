import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const evaluator = fileURLToPath(new URL('./evaluate-pnpm-audit.mjs', import.meta.url));
const allowedPath = 'apps__mobile>react-native>@react-native/community-cli-plugin>metro>image-size';
const exceptionIds = ['GHSA-w3rx-r6r6-pgpr', 'GHSA-5p2g-fcmc-qvqq'];

function advisory(overrides = {}) {
  return {
    github_advisory_id: 'GHSA-test-test-test',
    module_name: 'fixture-package',
    severity: 'high',
    findings: [{ version: '1.0.0', paths: ['backend>fixture-package'] }],
    patched_versions: '>=1.0.1',
    ...overrides,
  };
}

function report(advisories = [], counts = {}) {
  const vulnerabilities = { info: 0, low: 0, moderate: 0, high: 0, critical: 0 };
  for (const entry of advisories) vulnerabilities[entry.severity] += 1;
  return {
    actions: [],
    advisories: Object.fromEntries(advisories.map((entry, index) => [String(index + 1), entry])),
    muted: [],
    metadata: {
      vulnerabilities: { ...vulnerabilities, ...counts },
      dependencies: 1,
      devDependencies: 0,
      optionalDependencies: 0,
      totalDependencies: 1,
    },
  };
}

function evaluate(value, { raw = false, now = '2026-09-19T12:00:00Z' } = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'emopet-audit-contract-'));
  try {
    const path = join(directory, 'pnpm-audit.json');
    writeFileSync(path, raw ? value : JSON.stringify(value));
    // Freeze only the subprocess clock so exception tests remain deterministic
    // after the policy expires; the production gate still uses the real clock.
    const clock = `const NativeDate = Date; globalThis.Date = class extends NativeDate {
      constructor(...args) { super(...(args.length ? args : [${JSON.stringify(now)}])); }
    };`;
    const result = spawnSync(process.execPath, [
      '--import', `data:text/javascript,${encodeURIComponent(clock)}`,
      evaluator, path,
    ], { encoding: 'utf8', timeout: 10_000 });
    assert.ifError(result.error);
    assert.equal(result.signal, null);
    return result;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function expectRejected(value, options) {
  const result = evaluate(value, options);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.doesNotMatch(result.stdout, /Dependency vulnerability gate: PASS/);
  return result;
}

test('a complete clean report passes', () => {
  const result = evaluate(report());
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Dependency vulnerability gate: PASS/);
});

test('high-filtered reports may retain omitted low/moderate metadata counts', () => {
  const result = evaluate(report([], { low: 3, moderate: 19 }));
  assert.equal(result.status, 0, result.stderr);
});

test('valid low/moderate advisory details do not change the HIGH/CRITICAL policy', () => {
  const result = evaluate(report([
    advisory({ severity: 'low' }), advisory({ severity: 'moderate' }),
  ]));
  assert.equal(result.status, 0, result.stderr);
});

for (const [name, value] of [
  ['empty object', {}],
  ['registry error envelope', { error: { code: 'ERR_PNPM_AUDIT_BAD_RESPONSE', message: 'Registry unavailable' } }],
  ['socket timeout envelope', { error: { code: 'ERR_SOCKET_TIMEOUT', message: 'Socket timeout' } }],
  ['null', null],
  ['array', []],
  ['scalar', 'not an audit report'],
  ['missing advisory inventory', { metadata: report().metadata }],
  ['array advisory inventory', { ...report(), advisories: [] }],
  ['missing metadata', { advisories: {} }],
  ['missing vulnerability counts', { ...report(), metadata: {} }],
  ['error envelope beside an otherwise clean report', { ...report(), error: { code: 'ERR_SOCKET_TIMEOUT' } }],
]) {
  test(`${name} cannot authorize PASS`, () => {
    assert.match(expectRejected(value).stderr, /Invalid pnpm audit report:/);
  });
}

for (const raw of ['', '{"advisories":', '<html>Registry unavailable</html>']) {
  test(`unreadable JSON ${JSON.stringify(raw)} fails closed`, () => {
    expectRejected(raw, { raw: true });
  });
}

for (const high of [undefined, '0', -1, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
  test(`invalid HIGH count ${String(high)} cannot authorize PASS`, () => {
    expectRejected(report([], { high }));
  });
}

for (const severity of ['high', 'critical']) {
  test(`${severity} metadata without advisory evidence is rejected`, () => {
    expectRejected(report([], { [severity]: 1 }));
  });

  test(`${severity} advisory cannot be hidden by a zero metadata count`, () => {
    expectRejected(report([advisory({ severity })], { [severity]: 0 }));
  });

  test(`a complete non-exempt ${severity} advisory remains blocking`, () => {
    const result = expectRejected(report([advisory({ severity })]));
    assert.match(result.stderr, /Blocking high\/critical advisories:/);
    assert.doesNotMatch(result.stderr, /Invalid pnpm audit report:/);
  });
}

for (const [name, entry] of [
  ['null entry', null],
  ['unknown severity', advisory({ severity: 'urgent' })],
  ['missing identity', advisory({ github_advisory_id: undefined })],
  ['missing findings', advisory({ findings: undefined })],
  ['empty paths', advisory({ findings: [{ paths: [] }] })],
]) {
  test(`malformed advisory (${name}) cannot disappear from the decision`, () => {
    expectRejected({ ...report(), advisories: { 1: entry } });
  });
}

function exceptions() {
  return exceptionIds.map((id) => advisory({
    github_advisory_id: id,
    module_name: 'image-size',
    patched_versions: '<0.0.0',
    findings: [{ version: '1.2.1', paths: [allowedPath] }],
  }));
}

test('the two existing path-bounded image-size exceptions still pass', () => {
  const result = evaluate(report(exceptions(), { low: 3, moderate: 19 }));
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Accepted, path-bounded, expiring exceptions:/);
  for (const id of exceptionIds) assert.match(result.stdout, new RegExp(id));
});

test('an allowed advisory does not mask another non-exempt advisory', () => {
  expectRejected(report([...exceptions(), advisory()]));
});

for (const [name, override] of [
  ['different module', { module_name: 'different-package' }],
  ['unlisted advisory', { github_advisory_id: 'GHSA-new1-new2-new3' }],
  ['additional path', { findings: [{ version: '1.2.1', paths: [allowedPath, 'backend>image-size'] }] }],
  ['incomplete additional finding', { findings: [{ paths: [allowedPath] }, {}] }],
]) {
  test(`an exception cannot cover ${name}`, () => {
    expectRejected(report([{ ...exceptions()[0], ...override }]));
  });
}

test('exceptions expire at the unchanged policy boundary', () => {
  const atBoundary = evaluate(report(exceptions()), { now: '2026-11-30T23:59:59Z' });
  assert.equal(atBoundary.status, 0, atBoundary.stderr);
  expectRejected(report(exceptions()), { now: '2026-11-30T23:59:59.001Z' });
});
