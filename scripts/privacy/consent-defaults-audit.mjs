import { readFile } from 'node:fs/promises';

const preferencesPath = new URL('../../apps/mobile/src/store/preferences.ts', import.meta.url);
const source = await readFile(preferencesPath, 'utf8');

const requiredFalseDefaults = [
  'location_opt_in',
  'community_opt_in',
  'vet_export_opt_in',
];

const failures = [];

for (const key of requiredFalseDefaults) {
  const falsePattern = new RegExp(`${key}\\s*:\\s*false\\b`);
  const truePattern = new RegExp(`${key}\\s*:\\s*true\\b`);

  if (!falsePattern.test(source)) {
    failures.push(`${key} must default to false in the mobile preference store`);
  }
  if (truePattern.test(source)) {
    failures.push(`${key} contains an unsafe true default in the mobile preference store`);
  }
}

if (failures.length > 0) {
  console.error('Sensitive consent defaults audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Sensitive consent defaults audit passed: location, Community and Vet export default to false.');
