import { closeDatabase } from '../../db/index.js';
import { runSecurityDetectionSchedulerTick } from '../security/security-detection-scheduler.js';

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
  const result = await runSecurityDetectionSchedulerTick({
    schemaVersion: 'security-detection-scheduler-v1',
    policyRevision: process.env['SECURITY_DETECTION_POLICY_REVISION'],
    initialWindowStart:
      process.env['SECURITY_DETECTION_INITIAL_WINDOW_START'] ?? null,
    maxEvents,
    policy: parsePolicy(),
  });

  process.stdout.write(JSON.stringify({
    worker: 'security-detection-scheduler-tick',
    ...result,
  }) + '\n');

  if (result.status !== 'EVALUATED' && result.status !== 'BUSY') {
    process.exitCode = 1;
  }
} finally {
  await closeDatabase();
}
