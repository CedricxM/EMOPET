import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const [historicalPath, generatedPath] = process.argv.slice(2);
const readNames = (path) => readFileSync(path, 'utf8').trim().split('\n').filter(Boolean).sort();
const declared = JSON.parse(readFileSync(new URL('../../backend/db/fresh-baseline-only-tables.json', import.meta.url)));
const historical = readNames(historicalPath);
const generated = readNames(generatedPath);
assert.deepEqual(declared.tables, ['professional_share_access_audits', 'professional_share_grants']);
assert.equal(declared.claimsExistingDatabaseUpgradeReady, false);
assert.deepEqual(declared.tables.filter((table) => historical.includes(table)), [], 'fresh-only tables must not silently acquire historical replay authority');
assert.deepEqual(generated, [...historical, ...declared.tables].sort(), 'generated inventory must match history plus exactly the declared INT-05 tables');
console.log('Generated table inventory matches history + 2 explicit INT-05 fresh-only tables.');
