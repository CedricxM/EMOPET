import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildLicenseEvidence,
  dedupePackages,
  flattenPnpmLicenseReport,
  markdownTableCell,
  renderMarkdown,
  reviewClassForLicense,
} from './summarize-pnpm-licenses.mjs';

test('flattens pnpm v9+ grouped versions without inventing licence metadata', () => {
  const rows = flattenPnpmLicenseReport({
    MIT: [{
      name: 'alpha',
      versions: ['1.0.0', '1.1.0'],
      paths: ['/alpha-1.0.0', '/alpha-1.1.0'],
      license: 'MIT',
    }],
    'Apache-2.0': [{
      name: 'beta',
      versions: ['2.0.0'],
      paths: ['/beta-2.0.0'],
      license: 'Apache-2.0',
    }],
  });

  assert.deepEqual(
    rows.map((row) => [row.name, row.version, row.path, row.license]),
    [
      ['alpha', '1.0.0', '/alpha-1.0.0', 'MIT'],
      ['alpha', '1.1.0', '/alpha-1.1.0', 'MIT'],
      ['beta', '2.0.0', '/beta-2.0.0', 'Apache-2.0'],
    ],
  );
});

test('retains compatibility with one-version licence rows', () => {
  const rows = flattenPnpmLicenseReport([
    { name: 'legacy', version: '3.0.0', path: '/legacy', license: 'ISC' },
  ]);

  assert.deepEqual(rows.map((row) => [row.name, row.version, row.license]), [
    ['legacy', '3.0.0', 'ISC'],
  ]);
});

test('deduplicates exact installed entries while retaining distinct versions', () => {
  const rows = [
    { name: 'alpha', version: '1.0.0', license: 'MIT', path: '/a' },
    { name: 'alpha', version: '1.0.0', license: 'MIT', path: '/a' },
    { name: 'alpha', version: '2.0.0', license: 'MIT', path: '/b' },
  ];

  assert.equal(dedupePackages(rows).length, 2);
});

test('markdown table cells are encoded without partial replacement semantics', () => {
  assert.equal(markdownTableCell('MIT|Apache-2.0'), 'MIT\\|Apache-2.0');
  assert.equal(markdownTableCell('line1\nline2'), 'line1 line2');
  assert.equal(markdownTableCell('A\\B|C'), 'A\\\\B\\|C');
});

test('review classes are triage labels, never legal clearance', () => {
  assert.equal(reviewClassForLicense('UNKNOWN'), 'MISSING_OR_NONSTANDARD_METADATA_REVIEW');
  assert.equal(reviewClassForLicense('GPL-3.0-only'), 'RECIPROCAL_OR_SOURCE_OBLIGATION_REVIEW');
  assert.equal(reviewClassForLicense('MPL-2.0'), 'RECIPROCAL_OR_SOURCE_OBLIGATION_REVIEW');
  assert.equal(reviewClassForLicense('MIT'), 'GENERAL_NOTICE_AND_DISTRIBUTION_REVIEW');
});

test('evidence remains OPEN even when metadata is complete', () => {
  const evidence = buildLicenseEvidence({
    allReport: {
      MIT: [{ name: 'alpha', version: '1.0.0', path: '/alpha' }],
      'GPL-3.0-only': [{ name: 'beta', version: '2.0.0', path: '/beta' }],
    },
    productionReport: {
      MIT: [{ name: 'alpha', version: '1.0.0', path: '/alpha' }],
    },
    metadata: {
      generatedAt: '2026-09-23T00:00:00.000Z',
      candidateHeadSha: '0123456789abcdef0123456789abcdef01234567',
      evaluatedCheckoutSha: 'fedcba9876543210fedcba9876543210fedcba98',
      packageManager: 'pnpm@10.33.0',
      sourceArtifacts: [],
    },
  });

  assert.equal(evidence.candidateHeadSha, '0123456789abcdef0123456789abcdef01234567');
  assert.equal(evidence.evaluatedCheckoutSha, 'fedcba9876543210fedcba9876543210fedcba98');
  assert.equal(evidence.claimsLegalClearance, false);
  assert.equal(evidence.claimsDistributionCompatibility, false);
  assert.equal(evidence.claimsNoticeCompleteness, false);
  assert.equal(evidence.disposition, 'OPEN_REVIEW_REQUIRED');
  assert.equal(evidence.allDependencies.packageCount, 2);
  assert.equal(evidence.productionDependencies.packageCount, 1);
  assert.match(renderMarkdown(evidence), /Engineering inventory only/);
  assert.match(renderMarkdown(evidence), /OPEN_REVIEW_REQUIRED/);
});

test('empty production evidence fails closed', () => {
  assert.throws(
    () =>
      buildLicenseEvidence({
        allReport: { MIT: [{ name: 'alpha', version: '1.0.0', path: '/alpha' }] },
        productionReport: {},
        metadata: {
          generatedAt: '2026-09-23T00:00:00.000Z',
          candidateHeadSha: '0123456789abcdef0123456789abcdef01234567',
          evaluatedCheckoutSha: 'fedcba9876543210fedcba9876543210fedcba98',
          packageManager: 'pnpm@10.33.0',
          sourceArtifacts: [],
        },
      }),
    /contains no packages/,
  );
});
