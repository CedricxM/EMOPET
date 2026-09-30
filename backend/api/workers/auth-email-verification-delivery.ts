import { closeDatabase } from '../../db/index.js';
import { assertEmailVerificationRuntimeConfiguration } from '../services/auth-email-delivery.js';
import { dispatchEmailVerificationDeliveryBatch } from '../services/auth-email-delivery-outbox.js';

const rawLimit = process.env['AUTH_EMAIL_DELIVERY_BATCH_LIMIT']?.trim();
const parsedLimit = rawLimit ? Number(rawLimit) : 25;
const limit = Number.isSafeInteger(parsedLimit) ? parsedLimit : 25;

try {
  assertEmailVerificationRuntimeConfiguration();
  const counts = await dispatchEmailVerificationDeliveryBatch(limit);
  // Counts only. Never log addresses or message payloads.
  process.stdout.write(JSON.stringify({
    worker: 'auth-email-verification-delivery',
    counts,
  }) + '\n');
} finally {
  await closeDatabase();
}
