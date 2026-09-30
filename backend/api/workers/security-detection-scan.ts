import { closeDatabase } from '../../db/index.js';
import {
  runSecurityDetectionScan,
  summarizeSecurityDetectionRuntimeResult,
} from '../security/security-detection-runtime.js';

function parsePolicy(): unknown {
  const raw = process.env['SECURITY_DETECTION_POLICY_JSON'];
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const rawMaxEvents = process.env['SECURITY_DETECTION_MAX_EVENTS'];
const maxEvents = rawMaxEvents ? Number(rawMaxEvents) : Number.NaN;

try {
  const result = await runSecurityDetectionScan({
    schemaVersion: 'security-detection-runtime-v1',
    policyRevision: process.env['SECURITY_DETECTION_POLICY_REVISION'],
    windowStart: process.env['SECURITY_DETECTION_WINDOW_START'],
    windowEnd: process.env['SECURITY_DETECTION_WINDOW_END'],
    maxEvents,
    policy: parsePolicy(),
  });

  const summary = summarizeSecurityDetectionRuntimeResult(result);
  process.stdout.write(JSON.stringify({
    worker: 'security-detection-scan',
    ...summary,
  }) + '\n');

  if (result.status !== 'EVALUATED') {
    process.exitCode = 1;
  }
} finally {
  await closeDatabase();
}
