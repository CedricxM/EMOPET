#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative } from 'node:path';

const failures = [];
const root = resolve('.');
const seedIndexPath = 'backend/db/seeds/index.ts';
const allowedLegacyPrefix = 'backend/db/seeds/freemium-templates-';

function read(path) {
  const absolute = resolve(path);
  if (!existsSync(absolute)) {
    failures.push(`missing file: ${path}`);
    return '';
  }
  return readFileSync(absolute, 'utf8');
}

function walk(directory, files = []) {
  for (const entry of readdirSync(directory)) {
    if (entry === 'node_modules' || entry === '.git' || entry === '.next' || entry === 'dist' || entry === 'coverage') continue;
    const absolute = resolve(directory, entry);
    const stat = statSync(absolute);
    if (stat.isDirectory()) {
      walk(absolute, files);
      continue;
    }
    if (/\.(?:[cm]?[jt]sx?|mjs)$/.test(entry)) files.push(absolute);
  }
  return files;
}

const index = read(seedIndexPath);

for (const marker of [
  "process.env['EMOPET_ALLOW_LEGACY_FREEMIUM_TEMPLATE_SEED'] === '1'",
  'if (allowLegacyFreemiumTemplates)',
  'db.insert(schema.bleizFreemiumTemplates)',
  'migration/dev authority only',
]) {
  if (!index.includes(marker)) failures.push(`${seedIndexPath}: missing ${marker}`);
}

const guardPosition = index.indexOf('if (allowLegacyFreemiumTemplates)');
const insertPosition = index.indexOf('db.insert(schema.bleizFreemiumTemplates)');
if (insertPosition !== -1 && (guardPosition === -1 || insertPosition < guardPosition)) {
  failures.push(`${seedIndexPath}: legacy template insert is not visibly behind the explicit opt-in gate`);
}

for (const absolute of walk(root)) {
  const path = relative(root, absolute).replaceAll('\\', '/');
  const content = readFileSync(absolute, 'utf8');

  if (content.includes('freemium-scheduler')) {
    failures.push(`${path}: retired freemium scheduler reference remains`);
  }

  if (!content.includes('freemium-templates-')) continue;
  const allowed = path === seedIndexPath || path.startsWith(allowedLegacyPrefix);
  if (!allowed) failures.push(`${path}: historical freemium seed corpus referenced outside backend/db/seeds quarantine`);
}

if (failures.length > 0) {
  console.error('Legacy freemium authority audit FAILED:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('Legacy freemium authority audit PASS.');
console.log('PASS proves the historical DB template corpus is quarantined behind an explicit migration/dev gate; it does not approve that content for release.');
