import fs from 'node:fs';

const reportPath = process.argv[2] ?? 'pnpm-audit.json';
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

const BLOCKING_SEVERITIES = new Set(['high', 'critical']);
const now = new Date();

const exceptions = new Map([
  [
    'GHSA-w3rx-r6r6-pgpr',
    {
      module: 'image-size',
      expires: new Date('2026-11-30T23:59:59Z'),
      allowedPaths: new Set([
        'apps__mobile>react-native>@react-native/community-cli-plugin>metro>image-size',
      ]),
      reason:
        'No patched image-size release is currently available; exposure is bounded to Metro build-time parsing of repository-controlled assets.',
    },
  ],
  [
    'GHSA-5p2g-fcmc-qvqq',
    {
      module: 'image-size',
      expires: new Date('2026-11-30T23:59:59Z'),
      allowedPaths: new Set([
        'apps__mobile>react-native>@react-native/community-cli-plugin>metro>image-size',
      ]),
      reason:
        'No patched image-size release is currently available; exposure is bounded to Metro build-time parsing of repository-controlled assets.',
    },
  ],
]);

const advisories = Object.values(report.advisories ?? {});
const blocking = [];
const accepted = [];

for (const advisory of advisories) {
  if (!BLOCKING_SEVERITIES.has(advisory.severity)) continue;

  const ghsa = advisory.github_advisory_id;
  const exception = exceptions.get(ghsa);
  const findingPaths = (advisory.findings ?? []).flatMap((finding) => finding.paths ?? []);

  const exceptionMatches =
    exception &&
    advisory.module_name === exception.module &&
    now <= exception.expires &&
    findingPaths.length > 0 &&
    findingPaths.every((path) => exception.allowedPaths.has(path));

  if (exceptionMatches) {
    accepted.push({
      ghsa,
      module: advisory.module_name,
      severity: advisory.severity,
      expires: exception.expires.toISOString(),
      paths: findingPaths,
      reason: exception.reason,
    });
    continue;
  }

  blocking.push({
    ghsa,
    module: advisory.module_name,
    severity: advisory.severity,
    patchedVersions: advisory.patched_versions,
    recommendation: advisory.recommendation,
    paths: findingPaths,
  });
}

console.log('pnpm audit metadata:');
console.log(JSON.stringify(report.metadata ?? {}, null, 2));

if (accepted.length > 0) {
  console.log('\nAccepted, path-bounded, expiring exceptions:');
  console.log(JSON.stringify(accepted, null, 2));
}

if (blocking.length > 0) {
  console.error('\nBlocking high/critical advisories:');
  console.error(JSON.stringify(blocking, null, 2));
  process.exit(1);
}

console.log('\nDependency vulnerability gate: PASS');
