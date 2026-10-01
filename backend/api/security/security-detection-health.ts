import { sql } from 'drizzle-orm';

import { db } from '../../db/index.js';
import { SECURITY_DETECTION_STREAM_ID } from './security-detection-scheduler.js';

export const SECURITY_DETECTION_HEALTH_PROBE_SCHEMA_VERSION =
  'security-detection-health-probe-v1' as const;

const HEALTH_STATUSES = new Set([
  'INITIAL_CURSOR_REQUIRED',
  'BUSY',
  'WINDOW_NOT_READY',
  'SCAN_FAILED',
  'LATE_EVENT_LIMIT_EXCEEDED',
  'LATE_SCAN_FAILED',
  'EVALUATED',
  'SCHEDULER_UNAVAILABLE',
]);

const FAILURE_STATUSES = new Set([
  'INITIAL_CURSOR_REQUIRED',
  'SCAN_FAILED',
  'LATE_EVENT_LIMIT_EXCEEDED',
  'LATE_SCAN_FAILED',
  'SCHEDULER_UNAVAILABLE',
]);

export type SecurityDetectionHealthProbeResult =
  | { status: 'INVALID_REQUEST'; healthy: false }
  | { status: 'NO_RECEIPT'; healthy: false }
  | {
      status: 'STALE_ATTEMPT';
      healthy: false;
      lastStatus: string;
      consecutiveFailures: number;
    }
  | {
      status: 'LAST_TICK_FAILED';
      healthy: false;
      lastStatus: string;
      consecutiveFailures: number;
    }
  | {
      status: 'NO_SUCCESS';
      healthy: false;
      lastStatus: string;
      consecutiveFailures: number;
    }
  | {
      status: 'STALE_SUCCESS';
      healthy: false;
      lastStatus: string;
      consecutiveFailures: number;
    }
  | {
      status: 'HEALTHY';
      healthy: true;
      lastStatus: string;
      consecutiveFailures: number;
    }
  | { status: 'HEALTH_UNAVAILABLE'; healthy: false; retryable: true };

interface HealthProbeRequest {
  schemaVersion: typeof SECURITY_DETECTION_HEALTH_PROBE_SCHEMA_VERSION;
  maxStalenessSeconds: number;
}

function parseRequest(input: unknown): HealthProbeRequest | null {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return null;
  }

  const value = input as Record<string, unknown>;
  if (
    Object.keys(value).some(
      (key) => key !== 'schemaVersion' && key !== 'maxStalenessSeconds',
    )
  ) {
    return null;
  }

  if (value.schemaVersion !== SECURITY_DETECTION_HEALTH_PROBE_SCHEMA_VERSION) {
    return null;
  }

  if (
    typeof value.maxStalenessSeconds !== 'number'
    || !Number.isSafeInteger(value.maxStalenessSeconds)
    || value.maxStalenessSeconds < 1
    || value.maxStalenessSeconds > Math.floor(Number.MAX_SAFE_INTEGER / 1000)
  ) {
    return null;
  }

  return {
    schemaVersion: SECURITY_DETECTION_HEALTH_PROBE_SCHEMA_VERSION,
    maxStalenessSeconds: value.maxStalenessSeconds,
  };
}

function asDate(value: unknown): Date | null {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }
  return null;
}

/**
 * Read-only operational probe for #870.
 *
 * The caller supplies the allowed staleness explicitly. No production cadence
 * is selected here and no HTTP route is created.
 */
export async function checkSecurityDetectionSchedulerHealth(
  input: unknown,
): Promise<SecurityDetectionHealthProbeResult> {
  const request = parseRequest(input);
  if (!request) {
    return { status: 'INVALID_REQUEST', healthy: false };
  }

  try {
    const rows = await db.execute(sql`
      SELECT
        last_attempt_at,
        last_success_at,
        last_status,
        consecutive_failures,
        CURRENT_TIMESTAMP AS database_now
      FROM security_detection_scheduler_health
      WHERE stream_id = ${SECURITY_DETECTION_STREAM_ID}
      LIMIT 1
    `);

    const row = rows[0] as Record<string, unknown> | undefined;
    if (!row) {
      return { status: 'NO_RECEIPT', healthy: false };
    }

    const lastAttemptAt = asDate(row['last_attempt_at']);
    const lastSuccessAt = row['last_success_at'] == null
      ? null
      : asDate(row['last_success_at']);
    const databaseNow = asDate(row['database_now']);
    const lastStatus = row['last_status'];
    const consecutiveFailures = row['consecutive_failures'];

    if (
      !lastAttemptAt
      || !databaseNow
      || (lastSuccessAt === null && row['last_success_at'] != null)
      || typeof lastStatus !== 'string'
      || !HEALTH_STATUSES.has(lastStatus)
      || typeof consecutiveFailures !== 'number'
      || !Number.isSafeInteger(consecutiveFailures)
      || consecutiveFailures < 0
    ) {
      return {
        status: 'HEALTH_UNAVAILABLE',
        healthy: false,
        retryable: true,
      };
    }

    const maxAgeMs = request.maxStalenessSeconds * 1000;

    if (databaseNow.getTime() - lastAttemptAt.getTime() > maxAgeMs) {
      return {
        status: 'STALE_ATTEMPT',
        healthy: false,
        lastStatus,
        consecutiveFailures,
      };
    }

    if (FAILURE_STATUSES.has(lastStatus)) {
      return {
        status: 'LAST_TICK_FAILED',
        healthy: false,
        lastStatus,
        consecutiveFailures,
      };
    }

    if (!lastSuccessAt) {
      return {
        status: 'NO_SUCCESS',
        healthy: false,
        lastStatus,
        consecutiveFailures,
      };
    }

    if (databaseNow.getTime() - lastSuccessAt.getTime() > maxAgeMs) {
      return {
        status: 'STALE_SUCCESS',
        healthy: false,
        lastStatus,
        consecutiveFailures,
      };
    }

    return {
      status: 'HEALTHY',
      healthy: true,
      lastStatus,
      consecutiveFailures,
    };
  } catch {
    return {
      status: 'HEALTH_UNAVAILABLE',
      healthy: false,
      retryable: true,
    };
  }
}
