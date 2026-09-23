/**
 * ELI result-contract authority guard — static, read-only. ELI-ARCH-G2, #118.
 *
 * Exactly one exported `InferenceResult` may exist in the workspace, and it
 * belongs to `@emopet/shared`. The engine's post-inference hooks consume their
 * own intermediate shape, `PostInferenceCandidate`.
 *
 * Why this is a guard and not a convention: the boundary has already been lost
 * once. PR #120 established it; the frozen #224 reconstruction silently put a
 * second `export interface InferenceResult` back into the engine, and nothing
 * failed — it was found by a forensic read on 2026-09-16 (#118). #294 restored
 * it on `main`, with a test that pins confidence thresholds only. That test
 * would have stayed green through the #224 regression, because the regression
 * changed a name, not a threshold.
 *
 * This checks names and signatures. It says nothing about whether any ELI
 * output is scientifically valid, and it activates no runtime. G4–G8 stay open.
 *
 * No network. No writes.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url).pathname;
const SHARED_OWNER = 'packages/shared/src/types/inference.ts';
const ENGINE_HOOKS = 'packages/eli-engine/src/hooks/index.ts';

/** Comments name the contract on purpose; only code may define it. */
export function codeOnly(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/**
 * Every way a module can make `InferenceResult` an exported name:
 * a declaration, or an aliasing re-export (`export { X as InferenceResult }`).
 * A plain `export * from` passes the shared name through without redefining it,
 * so it is not an authority and is not counted.
 */
export function exportedInferenceResults(source) {
  const code = codeOnly(source);
  const declarations = code.match(/\bexport\s+(?:declare\s+)?(?:interface|type|class)\s+InferenceResult\b/g) ?? [];
  const aliases = code.match(/\bas\s+InferenceResult\b/g) ?? [];
  return declarations.length + aliases.length;
}

function trackedSources() {
  return execFileSync('git', ['ls-files', '--', 'apps', 'packages', 'backend'], { cwd: ROOT })
    .toString()
    .split('\n')
    .filter((p) => /\.(m?ts|tsx|m?js|jsx)$/.test(p))
    .filter((p) => !/(^|\/)(dist|build|\.next)\//.test(p));
}

test('exactly one exported InferenceResult exists, and @emopet/shared owns it', () => {
  const owners = [];
  for (const path of trackedSources()) {
    const n = exportedInferenceResults(readFileSync(ROOT + path, 'utf8'));
    if (n > 0) owners.push({ path, n });
  }
  assert.deepEqual(
    owners,
    [{ path: SHARED_OWNER, n: 1 }],
    'a second InferenceResult authority exists — this is the #224 regression (#118). ' +
      'Engine-local shapes take their own name; the cross-surface contract lives in @emopet/shared.',
  );
});

test('engine post-inference hooks consume PostInferenceCandidate, not a shadow InferenceResult', () => {
  const code = codeOnly(readFileSync(ROOT + ENGINE_HOOKS, 'utf8'));
  assert.match(code, /export\s+interface\s+PostInferenceCandidate\s*\{/);
  assert.match(code, /execute:\s*\(\s*result:\s*PostInferenceCandidate\s*,/);
  assert.match(code, /export\s+function\s+runPostInferenceHooks\(\s*result:\s*PostInferenceCandidate\s*,/);
  assert.doesNotMatch(code, /\bInferenceResult\b/, 'the engine hooks must not name InferenceResult at all');
});

// ── The guard must be able to fail. Each case is a shape it has to catch. ──

test('the #224 shape is detected: a second declared InferenceResult', () => {
  const regressed = `export interface InferenceResult {\n  confidence: number;\n  eli_score: number;\n}\n`;
  assert.equal(exportedInferenceResults(regressed), 1);
});

test('an aliasing re-export is an authority and is detected', () => {
  assert.equal(exportedInferenceResults(`export type { PostInferenceCandidate as InferenceResult } from './hooks';`), 1);
  assert.equal(exportedInferenceResults(`export { Foo as InferenceResult };`), 1);
});

test('mentions in comments and pass-through re-exports are not authorities', () => {
  assert.equal(exportedInferenceResults(`/** not named \`InferenceResult\` on purpose */\nexport interface X {}`), 0);
  assert.equal(exportedInferenceResults(`// export interface InferenceResult {}\n`), 0);
  assert.equal(exportedInferenceResults(`export * from './inference.js';`), 0);
  assert.equal(exportedInferenceResults(`import type { InferenceResult } from '@emopet/shared';`), 0);
});
