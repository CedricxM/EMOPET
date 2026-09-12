import type { MiddlewareHandler } from 'hono';

import { VetReportDataUnavailableError } from '../services/vet-report.js';

/**
 * Keep authoritative source failure distinct from a successful zero-row report.
 * This boundary is intentionally scoped to the veterinary report read path.
 */
export const vetReportSourceTruthMiddleware: MiddlewareHandler = async (c, next) => {
  try {
    await next();
  } catch (error) {
    if (!(error instanceof VetReportDataUnavailableError)) {
      throw error;
    }

    c.header('Cache-Control', 'private, max-age=0, no-store');
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('Referrer-Policy', 'no-referrer');
    return c.json({
      error: error.code,
      message: 'Vet report data is temporarily unavailable.',
    }, 503);
  }
};
