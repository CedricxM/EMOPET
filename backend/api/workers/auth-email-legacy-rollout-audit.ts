import { closeDatabase } from '../../db/index.js';
import { collectAuthEmailLegacyRolloutCensus } from '../services/auth-email-legacy-rollout-audit.js';

async function main(): Promise<void> {
  try {
    const report = await collectAuthEmailLegacyRolloutCensus();
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } catch {
    process.stderr.write('AUTH email legacy rollout census failed\n');
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
}

void main();
