import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const scanRoots = [
  'backend/api',
  'backend/db',
  'apps',
  'packages',
  'scripts',
];

const allowedReadOnlyReferences = new Set([
  'backend/api/services/ai-zero-durable-retention-readiness.ts',
  'backend/api/services/erasure-residue-verification.ts',
  'backend/api/services/subject-discovery.ts',
]);

const skippedDirectoryNames = new Set([
  '.git',
  '.next',
  'build',
  'coverage',
  'dist',
  'node_modules',
]);

const runtimeExtensions = new Set([
  '.cjs',
  '.js',
  '.jsx',
  '.mjs',
  '.ts',
  '.tsx',
]);

const mutationPatterns = [
  ['drizzle insert', /\.insert\s*\(\s*aiMessages\s*\)/],
  ['drizzle update', /\.update\s*\(\s*aiMessages\s*\)/],
  ['drizzle delete', /\.delete\s*\(\s*aiMessages\s*\)/],
  ['sql insert', /\bINSERT\s+INTO\s+(?:(?:"?public"?)\.)?"?ai_messages"?\b/i],
  ['sql update', /\bUPDATE\s+(?:ONLY\s+)?(?:(?:"?public"?)\.)?"?ai_messages"?\b/i],
  ['sql delete', /\bDELETE\s+FROM\s+(?:(?:"?public"?)\.)?"?ai_messages"?\b/i],
  ['sql merge', /\bMERGE\s+INTO\s+(?:(?:"?public"?)\.)?"?ai_messages"?\b/i],
  ['sql copy', /\bCOPY\s+(?:(?:"?public"?)\.)?"?ai_messages"?\b/i],
  ['sql truncate', /\bTRUNCATE(?:\s+TABLE)?\s+(?:(?:"?public"?)\.)?"?ai_messages"?\b/i],
];

function toPosix(filePath) {
  return filePath.split(path.sep).join('/');
}

async function collectRuntimeFiles(relativeDir) {
  const absoluteDir = path.join(repoRoot, relativeDir);
  const entries = await readdir(absoluteDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory() && skippedDirectoryNames.has(entry.name)) continue;

    const relativePath = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectRuntimeFiles(relativePath));
      continue;
    }

    if (!runtimeExtensions.has(path.extname(entry.name))) continue;
    files.push(toPosix(relativePath));
  }

  return files;
}

test('AI-A/R4 blocks repository runtime persistence paths to ai_messages', async () => {
  const runtimeFiles = (
    await Promise.all(scanRoots.map((root) => collectRuntimeFiles(root)))
  ).flat();

  const violations = [];

  for (const relativePath of runtimeFiles) {
    if (
      relativePath.startsWith('backend/db/schema/')
      || relativePath.startsWith('backend/db/migrations/')
      || relativePath.startsWith('backend/db/baseline-draft/')
    ) {
      continue;
    }

    const source = await readFile(path.join(repoRoot, relativePath), 'utf8');
    const referencesAiTable = /\baiMessages\b/.test(source) || /\bai_messages\b/i.test(source);

    if (!referencesAiTable) continue;

    if (!allowedReadOnlyReferences.has(relativePath)) {
      violations.push(`${relativePath}: unapproved runtime ai_messages reference`);
      continue;
    }

    for (const [label, pattern] of mutationPatterns) {
      if (pattern.test(source)) {
        violations.push(`${relativePath}: ${label}`);
      }
    }
  }

  assert.deepEqual(
    violations,
    [],
    [
      'Founder decision AI-A/R4 allows zero durable AI-message persistence.',
      'Only the explicitly reviewed privacy read paths may reference ai_messages at runtime.',
      'A new runtime reference or mutation requires separate product/privacy authority and guard review.',
    ].join('\n'),
  );
});
