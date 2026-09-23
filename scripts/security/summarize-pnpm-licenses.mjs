#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function packageKey(row) {
  return [row.name ?? '', row.version ?? '', row.registryName ?? '', row.path ?? ''].join('\u0000');
}

function expandPnpmEntry(entry, bucketLicense = 'UNKNOWN') {
  if (!entry || typeof entry !== 'object') return [];

  const license =
    typeof entry.license === 'string' && entry.license.trim()
      ? entry.license.trim()
      : bucketLicense.trim() || 'UNKNOWN';

  // pnpm v9+ groups all installed versions of one package under
  // { name, versions: [...], paths: [...], license, ... }.
  if (Array.isArray(entry.versions)) {
    return entry.versions
      .map((version, index) => ({
        ...entry,
        version: typeof version === 'string' ? version.trim() : '',
        path:
          Array.isArray(entry.paths) && typeof entry.paths[index] === 'string'
            ? entry.paths[index]
            : '',
        license,
      }))
      .filter((row) => row.version);
  }

  // Preserve compatibility with older/synthetic fixtures that carry one
  // version/path directly.
  return [{
    ...entry,
    license,
  }];
}

export function flattenPnpmLicenseReport(report) {
  const rows = [];

  if (Array.isArray(report)) {
    for (const entry of report) rows.push(...expandPnpmEntry(entry));
    return rows;
  }

  if (!report || typeof report !== 'object') return rows;

  for (const [bucket, value] of Object.entries(report)) {
    const entries = Array.isArray(value) ? value : value && typeof value === 'object' ? [value] : [];
    for (const entry of entries) rows.push(...expandPnpmEntry(entry, bucket));
  }

  return rows;
}

export function dedupePackages(rows) {
  const seen = new Map();
  for (const row of rows) {
    const name = typeof row.name === 'string' ? row.name.trim() : '';
    const version = typeof row.version === 'string' ? row.version.trim() : '';
    const license = typeof row.license === 'string' ? row.license.trim() : '';
    if (!name || !version) continue;

    const normalized = {
      name,
      version,
      license: license || 'UNKNOWN',
      registryName: typeof row.registryName === 'string' && row.registryName.trim() ? row.registryName.trim() : null,
      author: typeof row.author === 'string' && row.author.trim() ? row.author.trim() : null,
      homepage: typeof row.homepage === 'string' && row.homepage.trim() ? row.homepage.trim() : null,
      path: typeof row.path === 'string' ? row.path : '',
    };
    seen.set(packageKey(normalized), normalized);
  }
  return [...seen.values()];
}

function normalizeExpression(value) {
  return value.toUpperCase().split(/\s+/u).filter(Boolean).join(' ').trim();
}

export function reviewClassForLicense(license) {
  const expression = normalizeExpression(license || 'UNKNOWN');

  if (
    !expression ||
    /(^|[\s(])(?:UNKNOWN|UNLICENSED|NOASSERTION|NONE|CUSTOM)(?:$|[\s)])/i.test(expression) ||
    /SEE LICEN[CS]E IN/i.test(expression)
  ) {
    return 'MISSING_OR_NONSTANDARD_METADATA_REVIEW';
  }

  if (/(?:^|[^A-Z])(?:AGPL|GPL|LGPL|MPL|EPL|CDDL|EUPL|OSL|CPAL|CPL|SSPL)(?:-|[^A-Z]|$)/i.test(expression)) {
    return 'RECIPROCAL_OR_SOURCE_OBLIGATION_REVIEW';
  }

  return 'GENERAL_NOTICE_AND_DISTRIBUTION_REVIEW';
}

function summarize(rows) {
  const packages = dedupePackages(rows);
  const byLicense = new Map();
  const review = new Map();

  for (const pkg of packages) {
    byLicense.set(pkg.license, (byLicense.get(pkg.license) ?? 0) + 1);
    const reviewClass = reviewClassForLicense(pkg.license);
    if (!review.has(reviewClass)) review.set(reviewClass, []);
    review.get(reviewClass).push({
      name: pkg.name,
      version: pkg.version,
      license: pkg.license,
      registryName: pkg.registryName,
      homepage: pkg.homepage,
    });
  }

  return {
    packageCount: packages.length,
    licenseBuckets: [...byLicense.entries()]
      .map(([license, packageCount]) => ({ license, packageCount }))
      .sort((a, b) => a.license.localeCompare(b.license)),
    reviewBuckets: [...review.entries()]
      .map(([reviewClass, packagesInClass]) => ({
        reviewClass,
        packageCount: packagesInClass.length,
        packages: packagesInClass.sort((a, b) => (a.name + '@' + a.version).localeCompare(b.name + '@' + b.version)),
      }))
      .sort((a, b) => a.reviewClass.localeCompare(b.reviewClass)),
  };
}

export function buildLicenseEvidence({ allReport, productionReport, metadata }) {
  const all = summarize(flattenPnpmLicenseReport(allReport));
  const production = summarize(flattenPnpmLicenseReport(productionReport));

  if (all.packageCount === 0) throw new Error('All-dependency licence report contains no packages.');
  if (production.packageCount === 0) throw new Error('Production-dependency licence report contains no packages.');

  return {
    schemaVersion: 'emopet-pnpm-license-evidence-v1',
    generatedAt: metadata.generatedAt,
    candidateHeadSha: metadata.candidateHeadSha,
    evaluatedCheckoutSha: metadata.evaluatedCheckoutSha,
    packageManager: metadata.packageManager,
    sourceCommand: {
      all: 'pnpm licenses list --json --long',
      production: 'pnpm licenses list --prod --json --long',
    },
    sourceArtifacts: metadata.sourceArtifacts,
    claimsLegalClearance: false,
    claimsDistributionCompatibility: false,
    claimsNoticeCompleteness: false,
    disposition: 'OPEN_REVIEW_REQUIRED',
    reviewBoundary: [
      'Package metadata is inventory evidence, not legal interpretation.',
      'Review buckets are mechanical triage labels only; they do not declare a licence compatible, incompatible, permissive or prohibited.',
      'Actual shipped artifacts, copied assets, fonts, native binaries, firmware/toolchain SDKs and required notices must be reviewed separately.',
      'A dependency SBOM and a package licence list do not replace qualified licensing/distribution review.',
    ],
    allDependencies: all,
    productionDependencies: production,
  };
}

export function markdownCell(value) {
  const output = [];
  for (const char of String(value)) {
    if (char === '&') output.push('&amp;');
    else if (char === '<') output.push('&lt;');
    else if (char === '>') output.push('&gt;');
    else if (char === '|') output.push('&#124;');
    else if (char === '\r' || char === '\n') output.push(' ');
    else if (char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127) output.push(' ');
    else output.push(char);
  }
  return output.join('').trim();
}

export function renderMarkdown(evidence) {
  const lines = [
    '# EMOPET exact-head dependency licence evidence',
    '',
    'Candidate head SHA: ' + evidence.candidateHeadSha,
    'Evaluated checkout SHA: ' + evidence.evaluatedCheckoutSha,
    'Generated: ' + evidence.generatedAt,
    'Package manager: ' + evidence.packageManager,
    '',
    '> Engineering inventory only. This report does not grant legal clearance, distribution compatibility, or notice completeness.',
    '',
    '## Counts',
    '',
    '- All installed dependency entries: **' + evidence.allDependencies.packageCount + '**',
    '- Production dependency entries: **' + evidence.productionDependencies.packageCount + '**',
    '',
    '## Production licence buckets',
    '',
    '| Licence metadata | Packages |',
    '|---|---:|',
    ...evidence.productionDependencies.licenseBuckets.map(
      (row) => '| ' + markdownCell(row.license) + ' | ' + row.packageCount + ' |',
    ),
    '',
    '## Mechanical review buckets',
    '',
    ...evidence.productionDependencies.reviewBuckets.map(
      (row) => '- **' + row.reviewClass + '**: ' + row.packageCount,
    ),
    '',
    '## Disposition',
    '',
    'OPEN_REVIEW_REQUIRED',
    '',
    'This artifact is suitable for exact-head inventory evidence. It is not a NOTICE file and it is not a legal/licensing sign-off.',
    '',
  ];
  return lines.join('\n');
}

function main() {
  const [allPathArg, productionPathArg, outputJsonArg, outputMarkdownArg] = process.argv.slice(2);
  if (!allPathArg || !productionPathArg || !outputJsonArg || !outputMarkdownArg) {
    console.error(
      'Usage: node scripts/security/summarize-pnpm-licenses.mjs <all.json> <production.json> <evidence.json> <summary.md>',
    );
    process.exit(2);
  }

  const allPath = resolve(allPathArg);
  const productionPath = resolve(productionPathArg);
  const outputJson = resolve(outputJsonArg);
  const outputMarkdown = resolve(outputMarkdownArg);
  const packageJson = readJson(resolve('package.json'));

  const evidence = buildLicenseEvidence({
    allReport: readJson(allPath),
    productionReport: readJson(productionPath),
    metadata: {
      generatedAt: new Date().toISOString(),
      candidateHeadSha: process.env.EMOPET_CANDIDATE_SHA ?? process.env.GITHUB_SHA ?? 'LOCAL_UNPINNED',
      evaluatedCheckoutSha: process.env.GITHUB_SHA ?? 'LOCAL_UNPINNED',
      packageManager: packageJson.packageManager ?? 'UNKNOWN',
      sourceArtifacts: [
        { file: basename(allPath), sha256: sha256(allPath), scope: 'ALL_INSTALLED' },
        { file: basename(productionPath), sha256: sha256(productionPath), scope: 'PRODUCTION' },
      ],
    },
  });

  writeFileSync(outputJson, JSON.stringify(evidence, null, 2) + '\n', 'utf8');
  writeFileSync(outputMarkdown, renderMarkdown(evidence) + '\n', 'utf8');

  console.log(
    JSON.stringify(
      {
        disposition: evidence.disposition,
        candidateHeadSha: evidence.candidateHeadSha,
        evaluatedCheckoutSha: evidence.evaluatedCheckoutSha,
        allPackages: evidence.allDependencies.packageCount,
        productionPackages: evidence.productionDependencies.packageCount,
        outputJson,
        outputMarkdown,
      },
      null,
      2,
    ),
  );
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  main();
}
