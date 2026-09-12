import { readFile } from 'node:fs/promises';

const preferencesPath = new URL('../../apps/mobile/src/store/preferences.ts', import.meta.url);
const source = await readFile(preferencesPath, 'utf8');

const requiredFalseDefaults = [
  'location_opt_in',
  'community_opt_in',
  'vet_export_opt_in',
];

const failures = [];

// This gate owns default values only. Positive authority transitions are audited
// separately by the feature-specific privacy gates and must not be mistaken for
// an unsafe initial default simply because the literal `true` exists elsewhere.
const storeStart = source.indexOf('export const usePreferencesStore');
const storeSource = storeStart >= 0 ? source.slice(storeStart) : '';
const defaultsMatch = storeSource.match(/consents:\s*\{([\s\S]*?)\n\s*\},/);

if (!defaultsMatch) {
  failures.push('mobile preference store consent defaults block could not be located');
} else {
  const defaults = defaultsMatch[1];
  for (const key of requiredFalseDefaults) {
    const falsePattern = new RegExp(`${key}\\s*:\\s*false\\b`);
    const truePattern = new RegExp(`${key}\\s*:\\s*true\\b`);

    if (!falsePattern.test(defaults)) {
      failures.push(`${key} must default to false in the mobile preference store`);
    }
    if (truePattern.test(defaults)) {
      failures.push(`${key} contains an unsafe true default in the mobile preference store defaults block`);
    }
  }
}

if (failures.length > 0) {
  console.error('Sensitive consent defaults audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Sensitive consent defaults audit passed: location, Community and Vet export default to false.');
console.log('Scope note: this gate verifies initial defaults only; positive activation and withdrawal authority are owned by feature-specific privacy gates.');
