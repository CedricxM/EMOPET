import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('../../', import.meta.url));

async function walk(dir, predicate) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full, predicate));
    else if (predicate(full)) out.push(full);
  }
  return out;
}

const routeFiles = [
  ...await walk(path.join(root, 'backend/api/routes'), (file) => file.endsWith('.ts')),
  ...await walk(path.join(root, 'apps/web/app/api'), (file) => path.basename(file) === 'route.ts'),
];

function relative(file) {
  return path.relative(root, file).replaceAll(path.sep, '/');
}

function descendants(node, visit) {
  visit(node);
  node.forEachChild((child) => descendants(child, visit));
}

function isConsoleCall(node) {
  return ts.isCallExpression(node)
    && ts.isPropertyAccessExpression(node.expression)
    && ts.isIdentifier(node.expression.expression)
    && node.expression.expression.text === 'console';
}

function isValueReferenceIdentifier(node) {
  const parent = node.parent;
  if (!parent) return true;

  // Static object/property names such as { error: 'bounded_code' } are not
  // references to the caught variable named "error".
  if (ts.isPropertyAssignment(parent) && parent.name === node) return false;
  if (ts.isPropertyAccessExpression(parent) && parent.name === node) return false;

  return true;
}

function containsIdentifierReference(node, name) {
  let found = false;
  descendants(node, (child) => {
    if (
      ts.isIdentifier(child)
      && child.text === name
      && isValueReferenceIdentifier(child)
    ) {
      found = true;
    }
  });
  return found;
}

test('active HTTP handlers do not use console logging or reflect raw caught exceptions', async () => {
  assert.ok(routeFiles.length >= 10, 'expected active backend/web HTTP route inventory');
  const failures = [];

  for (const file of routeFiles) {
    const source = await readFile(file, 'utf8');
    const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

    descendants(sf, (node) => {
      if (isConsoleCall(node)) {
        const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
        failures.push(relative(file) + ':' + (line + 1) + ' uses console.* inside an active HTTP route');
      }

      if (!ts.isCatchClause(node) || !node.variableDeclaration) return;
      const binding = node.variableDeclaration.name;
      if (!ts.isIdentifier(binding)) return;
      const errorName = binding.text;

      descendants(node.block, (child) => {
        if (!ts.isReturnStatement(child) || !child.expression) return;
        if (!containsIdentifierReference(child.expression, errorName)) return;
        const { line } = sf.getLineAndCharacterOfPosition(child.getStart(sf));
        failures.push(relative(file) + ':' + (line + 1) + " returns data derived directly from caught exception '" + errorName + "'");
      });
    });
  }

  assert.deepEqual(
    failures,
    [],
    ['HTTP error/log minimisation regression:', ...failures.map((f) => ' - ' + f),
     'Use bounded machine-readable/client-safe errors and keep raw exception detail out of request handlers.'].join('\n'),
  );
});

test('guard scans both backend Hono routes and Next.js API handlers', () => {
  const rel = routeFiles.map(relative);
  assert.ok(rel.some((file) => file.startsWith('backend/api/routes/')));
  assert.ok(rel.some((file) => file.startsWith('apps/web/app/api/') && file.endsWith('/route.ts')));
});
