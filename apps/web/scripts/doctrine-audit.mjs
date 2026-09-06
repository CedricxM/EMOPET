#!/usr/bin/env node
/**
 * EMOPET doctrine leakage guard.
 *
 * Purpose:
 * - freeze known legacy doctrine conflicts so they cannot silently spread;
 * - fail when prohibited reward/latent-state identifiers appear in new code paths;
 * - keep the current legacy files visible until #233/#234 migrate them.
 *
 * This is intentionally narrower than a generic grep. Technical uses of words such
 * as `score`, `points` or reliability `streak` are not banned globally because
 * they can be legitimate (SVG points, geocoding score, reliability state machine).
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');

const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const SCAN_ROOTS = ['apps', 'packages', 'backend'];
const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', 'build', 'coverage', '.turbo']);

/**
 * Known legacy occurrences at the 2026-09-06 hardening snapshot.
 * New files are NOT allowed to introduce these identifiers.
 * Existing paths remain temporary exceptions and are tracked by #233/#234.
 */
const RULES = [
  {
    id: 'MAT_STREAK_REWARD',
    regex: /\bmat_streak\b|\bMIL_MAT_STREAK\b|\bmat_streak_days\b/g,
    allowedLegacyPaths: new Set([
      'packages/shared/src/types/user.ts',
      'packages/ai-personality/src/bleiz/bleiz-content-templates.ts',
    ]),
    rationale: 'MAT adherence must not become an achievement, streak or reward source.',
  },
  {
    id: 'DISTANCE_RECORD_REWARD',
    regex: /\bdistance_record\b|\bDISTANCE_RECORD\b|\bpersonal_best_km\b/g,
    allowedLegacyPaths: new Set([
      'packages/shared/src/types/user.ts',
      'packages/ai-personality/src/bleiz/bleiz-content-templates.ts',
    ]),
    rationale: 'Real-dog distance/performance must not become an achievement or milestone reward source.',
  },
  {
    id: 'CARE_DATA_ACHIEVEMENT',
    regex: /\bbaselineFrozen\b|\bvalidDataDays\b/g,
    allowedLegacyPaths: new Set(['apps/web/lib/gamification.ts']),
    rationale: 'Baseline/data-validity adherence must not become reward progression.',
  },
  {
    id: 'LEGACY_GLOBAL_REWARD_POINTS',
    regex: /\bpointsReward\b/g,
    allowedLegacyPaths: new Set(['apps/web/lib/gamification.ts']),
    rationale: 'Legacy global reward points are HOLD pending #233; do not spread the model.',
  },
  {
    id: 'LATENT_ANXIETY_TEMPLATE',
    regex: /\bBHV_ANXIETY_PATTERN\b/g,
    allowedLegacyPaths: new Set(['packages/ai-personality/src/bleiz/bleiz-content-templates.ts']),
    rationale: 'Breiz internal semantics must not encode unsupported anxiety truth; migration tracked by #234.',
  },
  {
    id: 'MILESTONE_UNLOCK_LANGUAGE',
    regex: /\bmilestoneUnlocked\b/g,
    allowedLegacyPaths: new Set([
      'apps/web/app/journal/page.tsx',
      'apps/web/lib/i18n/dictionaries.ts',
    ]),
    rationale: 'Unlock framing is legacy and must not spread before the Memories/journal redesign.',
  },
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const absolute = path.join(dir, name);
    const stat = statSync(absolute);
    if (stat.isDirectory()) {
      walk(absolute, out);
      continue;
    }
    if (CODE_EXTENSIONS.has(path.extname(name))) out.push(absolute);
  }
  return out;
}

const files = SCAN_ROOTS.flatMap((root) => {
  const absolute = path.join(repoRoot, root);
  try {
    return walk(absolute);
  } catch {
    return [];
  }
});

const violations = [];
const legacyHits = [];

for (const absolute of files) {
  const relative = path.relative(repoRoot, absolute).split(path.sep).join('/');
  const content = readFileSync(absolute, 'utf8');

  for (const rule of RULES) {
    rule.regex.lastIndex = 0;
    const matches = [...content.matchAll(rule.regex)];
    if (matches.length === 0) continue;

    if (rule.allowedLegacyPaths.has(relative)) {
      legacyHits.push({ rule: rule.id, path: relative, count: matches.length });
      continue;
    }

    violations.push({
      rule: rule.id,
      path: relative,
      count: matches.length,
      rationale: rule.rationale,
    });
  }
}

process.stdout.write('EMOPET doctrine audit\n');
process.stdout.write(`Scanned ${files.length} code files.\n`);

if (legacyHits.length > 0) {
  process.stdout.write('\nKnown legacy occurrences (temporary allowlist; #233/#234):\n');
  for (const hit of legacyHits) {
    process.stdout.write(`  • ${hit.rule} — ${hit.path} (${hit.count})\n`);
  }
}

if (violations.length > 0) {
  process.stderr.write('\n✗ Doctrine leakage detected outside the legacy allowlist:\n');
  for (const violation of violations) {
    process.stderr.write(
      `  • ${violation.rule} — ${violation.path} (${violation.count})\n` +
      `    ${violation.rationale}\n`,
    );
  }
  process.stderr.write('\nDo not expand the allowlist casually. Reconcile the design authority or migrate the code.\n');
  process.exit(1);
}

process.stdout.write('\n✓ No new prohibited doctrine identifiers found outside known legacy paths.\n');
process.stdout.write('Legacy paths remain OPEN remediation work and are not release-authorized.\n');
