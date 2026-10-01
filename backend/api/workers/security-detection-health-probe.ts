import { closeDatabase } from '../../db/index.js';
import {
  checkSecurityDetectionSchedulerHealth,
  SECURITY_DETECTION_HEALTH_PROBE_SCHEMA_VERSION,
} from '../security/security-detection-health.js';

const raw = process.env['SECURITY_DETECTION_HEALTH_MAX_STALENESS_SECONDS'];
const maxStalenessSeconds = raw ? Number(raw) : Number.NaN;

try {
  const result = await checkSecurityDetectionSchedulerHealth({
    schemaVersion: SECURITY_DETECTION_HEALTH_PROBE_SCHEMA_VERSION,
    maxStalenessSeconds,
  });

  process.stdout.write(JSON.stringify({
    worker: 'security-detection-health-probe',
    ...result,
  }) + '\n');

  if (!result.healthy) {
    process.exitCode = 1;
  }
} finally {
  await closeDatabase();
}
