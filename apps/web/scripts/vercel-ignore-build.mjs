/**
 * Vercel "Ignored Build Step" for the emopet-web project (apps/web/vercel.json).
 *
 * Vercel skips the deployment when this exits 0 and builds when it exits 1.
 * The free plan allows 100 deployments a day and every pull request used to
 * build the web app, even backend- or firmware-only ones.
 *
 * A deployment is skipped only when git proves that nothing the web build or
 * runtime reads has changed since the base commit:
 *   - apps/web itself;
 *   - every workspace package apps/web depends on, transitively;
 *   - the root build inputs and out-of-tree runtime reads in EXTRA_WEB_INPUTS.
 * Base: VERCEL_GIT_PREVIOUS_SHA (last successful deployment of this branch),
 * else HEAD^ for a branch's first deployment. Any doubt builds: no base, a base
 * outside the shallow clone, or a git error.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const WEB_DIR = 'apps/web';

// Keep in sync with what apps/web reads outside its own tree and its workspace
// packages. scripts/control/vercel-ignore-build.test.mjs checks the
// process.cwd()-relative reads.
export const EXTRA_WEB_INPUTS = [
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'turbo.json',
  'tsconfig.base.json',
  'data/breed_profiles.json', // apps/web/lib/server/breeds.ts
];

const WORKSPACE_PARENTS = ['packages', 'apps', 'tools'];
const WORKSPACE_DIRS = ['backend'];

function readManifest(root, dir) {
  const file = path.join(root, dir, 'package.json');
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
}

function workspaceDirsByName(root) {
  const dirs = [...WORKSPACE_DIRS];
  for (const parent of WORKSPACE_PARENTS) {
    if (!existsSync(path.join(root, parent))) continue;
    for (const entry of readdirSync(path.join(root, parent), { withFileTypes: true })) {
      if (entry.isDirectory()) dirs.push(`${parent}/${entry.name}`);
    }
  }
  const byName = new Map();
  for (const dir of dirs) {
    const manifest = readManifest(root, dir);
    if (manifest?.name) byName.set(manifest.name, dir);
  }
  return byName;
}

function workspaceDependencies(manifest) {
  return Object.entries({
    ...manifest.dependencies,
    ...manifest.devDependencies,
    ...manifest.peerDependencies,
    ...manifest.optionalDependencies,
  })
    .filter(([, spec]) => String(spec).startsWith('workspace:'))
    .map(([name]) => name);
}

/** Repository paths whose change requires a web deployment. */
export function webBuildInputs(root) {
  const byName = workspaceDirsByName(root);
  const seen = new Set([WEB_DIR]);
  const queue = [WEB_DIR];
  while (queue.length > 0) {
    const manifest = readManifest(root, queue.shift());
    if (!manifest) continue;
    for (const name of workspaceDependencies(manifest)) {
      const dir = byName.get(name);
      if (!dir) throw new Error(`workspace dependency ${name} has no directory`);
      if (!seen.has(dir)) {
        seen.add(dir);
        queue.push(dir);
      }
    }
  }
  return [...seen, ...EXTRA_WEB_INPUTS];
}

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function commitExists(root, rev) {
  try {
    git(root, ['cat-file', '-e', `${rev}^{commit}`]);
    return true;
  } catch {
    return false;
  }
}

/** Returns { build, reason }. build=false only when git proves no web input changed. */
export function decide(root, previousSha) {
  const base = previousSha || 'HEAD^';
  if (!commitExists(root, base)) {
    return { build: true, reason: `base ${base} is not available in this clone` };
  }
  const inputs = webBuildInputs(root);
  try {
    git(root, ['diff', '--quiet', base, 'HEAD', '--', ...inputs]);
  } catch (error) {
    if (error.status === 1) return { build: true, reason: `web inputs changed since ${base}` };
    return { build: true, reason: `git diff failed: ${error.message}` };
  }
  return { build: false, reason: `no change to ${inputs.join(', ')} since ${base}` };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let result;
  try {
    const root = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));
    result = decide(root, process.env.VERCEL_GIT_PREVIOUS_SHA);
  } catch (error) {
    result = { build: true, reason: `unexpected error: ${error.message}` };
  }
  console.log(`${result.build ? 'Building' : 'Skipping'} emopet-web: ${result.reason}.`);
  process.exit(result.build ? 1 : 0);
}
