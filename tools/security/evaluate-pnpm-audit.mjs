import fs from 'node:fs';

const reportPath = process.argv[2] ?? 'pnpm-audit.json';
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

const BLOCKING_SEVERITIES = new Set(['high', 'critical']);
const SEVERITIES = new Set(['info', 'low', 'moderate', 'high', 'critical']);
const now = new Date();

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function invalidReport(reason) {
  console.error(`Invalid pnpm audit report: ${reason}`);
  process.exit(1);
}

// pnpm can emit a valid JSON error envelope when the registry request fails.
// Missing evidence must never become an empty advisory inventory and a PASS.
if (!isRecord(report) || Object.hasOwn(report, 'error') || Object.hasOwn(report, 'errors')) {
  invalidReport('expected a successful pnpm 10 audit report.');
}
if (!isRecord(report.advisories) || !isRecord(report.metadata) ||
    !isRecord(report.metadata.vulnerabilities)) {
  invalidReport('advisories and vulnerability metadata are required.');
}

const counts = report.metadata.vulnerabilities;
for (const severity of SEVERITIES) {
  if (!Number.isSafeInteger(counts[severity]) || counts[severity] < 0) {
    invalidReport(`invalid ${severity} vulnerability count.`);
  }
}

const advisories = Object.values(report.advisories);
const blockingCounts = { high: 0, critical: 0 };
for (const advisory of advisories) {
  if (!isRecord(advisory) || !SEVERITIES.has(advisory.severity) ||
      typeof advisory.module_name !== 'string' || !advisory.module_name.trim() ||
      typeof advisory.github_advisory_id !== 'string' || !advisory.github_advisory_id.trim()) {
    invalidReport('each advisory must identify its module, advisory ID and severity.');
  }
  if (!Array.isArray(advisory.findings) || advisory.findings.length === 0 ||
      advisory.findings.some((finding) => !isRecord(finding) ||
        !Array.isArray(finding.paths) || finding.paths.length === 0 ||
        finding.paths.some((path) => typeof path !== 'string' || !path.trim()))) {
    invalidReport('each advisory finding must include non-empty dependency paths.');
  }
  if (BLOCKING_SEVERITIES.has(advisory.severity)) blockingCounts[advisory.severity] += 1;
}

// --audit-level=high can omit low/moderate advisory details while retaining
// their metadata counts. Only HIGH/CRITICAL must be complete for this gate.
for (const severity of BLOCKING_SEVERITIES) {
  if (blockingCounts[severity] !== counts[severity]) {
    invalidReport(`incomplete or inconsistent ${severity} advisory inventory.`);
  }
}

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
