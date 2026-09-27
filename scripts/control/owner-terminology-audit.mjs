import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const legacy = ['guard', 'ian'].join('');
const legacyUpper = legacy.toUpperCase();

const HISTORICAL_PREFIXES = [
  'docs/records/memory/',
];

const HISTORICAL_EXACT = new Set([
  'docs/records/terminology/GUARDIAN_TO_OWNER_SUPERSESSION_2026-09-11.md',
  'docs/strategy/GUARDIAN_RELATIONSHIP_AND_PRODUCT_SCOPE_DOCTRINE_2026-09-07.md',
  'docs/product/EMOPET_GUARDIAN_AUTHORITY_MASTER_v0.1.md',
  'docs/product/EMOPET_GUARDIAN_CONTINUITY_MASTER_v0.1.md',
  'docs/strategy/INT08_AUTHORITY_REPLAY_MANIFEST_2026-09-17.md',
  'backend/db/migrations/0006_professional_share_authority.sql',
  'backend/db/migrations/0009_professional_share_owner_terminology.sql',
  'scripts/security/professional-share-authority-audit.mjs',
  'scripts/docs/verify-int08-authorities.mjs',
  'scripts/docs/verify-int08-authorities.test.mjs',
  'backend/test/professional-share-authority-static.test.mjs',
]);

const TEXT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.md', '.sql', '.yaml', '.yml', '.txt',
]);

function isHistorical(pathname) {
  return HISTORICAL_EXACT.has(pathname)
    || HISTORICAL_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function scrubPermittedLineage(content) {
  const externalBrand = new RegExp(`git${legacy}`, 'gi');
  const externalEnv = new RegExp(`API_GIT${legacyUpper}[A-Z0-9_]*`, 'g');
  const stableGate = new RegExp(`G-${legacyUpper}-[A-Z0-9-]+`, 'g');
  const historicalFileToken = new RegExp(
    `[A-Za-z0-9_./-]*${legacyUpper}[A-Za-z0-9_./-]*`,
    'g',
  );

  return content
    .replace(externalBrand, '')
    .replace(externalEnv, '')
    .replace(stableGate, '')
    .replace(historicalFileToken, '');
}

const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);

const forbidden = new RegExp(`\\b${legacy}s?\\b|${legacy}[A-Z_]|\\b${legacyUpper}_`, 'i');
const failures = [];

for (const file of tracked) {
  if (isHistorical(file)) continue;
  if (!TEXT_EXTENSIONS.has(path.extname(file))) continue;

  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  const scrubbed = scrubPermittedLineage(content);
  const lines = scrubbed.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    if (forbidden.test(lines[i])) {
      failures.push(`${file}:${i + 1}: ${lines[i].trim()}`);
    }
  }
}

if (failures.length > 0) {
  console.error('Active legacy dog-owner terminology remains outside approved historical/provider lineage:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Owner terminology audit: active repository vocabulary is clean.');
