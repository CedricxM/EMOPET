import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(process.cwd(), '..');

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next' || name === 'dist' || name === 'build') continue;
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path, acc);
    else if (/\.(?:ts|tsx|js|mjs|sql)$/.test(name)) acc.push(path);
  }
  return acc;
}

test('behavioural response absence states are never silently coerced to numeric zero', () => {
  const roots = [
    join(root, 'backend/api'),
    join(root, 'backend/db/schema'),
    join(root, 'apps'),
    join(root, 'packages'),
  ];

  const patterns = [
    /responseValue\s*\?\?\s*0/g,
    /responseValue\s*\|\|\s*0/g,
    /response_value\s*\?\?\s*0/g,
    /response_value\s*\|\|\s*0/g,
    /COALESCE\s*\(\s*response_value\s*,\s*0\s*\)/gi,
  ];

  const violations = [];

  for (const dir of roots) {
    for (const path of walk(dir)) {
      const source = readFileSync(path, 'utf8');
      for (const pattern of patterns) {
        if (pattern.test(source)) violations.push(path.replace(root + '/', ''));
        pattern.lastIndex = 0;
      }
    }
  }

  assert.deepEqual(
    [...new Set(violations)].sort(),
    [],
    'not_applicable / not_observed / skipped / missing must not be silently converted to answered(0)',
  );
});
