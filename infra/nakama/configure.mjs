// SPIKE / NOT PRODUCTION AUTHORITY. Never print generated credentials.
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
const ids = process.argv.slice(2).map(id => id.toLowerCase());
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
if (ids.length !== 2 || ids[0] === ids[1] || ids.some(id => !uuid.test(id))) {
  throw new Error('Pass exactly two distinct synthetic EMOPET user UUIDs');
}
const template = readFileSync(new URL('.env.example', import.meta.url), 'utf8');
const generated = template.replaceAll('REPLACE_WITH_RANDOM_64_HEX', () => randomBytes(32).toString('hex'))
  .replace('WORLD_SPIKE_TEST_USER_IDS=', `WORLD_SPIKE_TEST_USER_IDS=${ids.join(',')}`);
writeFileSync(new URL('.env', import.meta.url), generated, { flag: 'wx', mode: 0o600 });
console.log('Created ignored infra/nakama/.env; runtime remains disabled by default.');
