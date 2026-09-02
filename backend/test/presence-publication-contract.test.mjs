import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const routeSource = readFileSync(new URL('../api/routes/dogs.ts', import.meta.url), 'utf8');
const serviceSource = readFileSync(new URL('../api/services/presence.ts', import.meta.url), 'utf8');

test('absence comparison is explicitly non-publishable while SCI-PRES-01 is open', () => {
  assert.match(routeSource, /PROTOTYPE_SEMANTICS_UNVALIDATED/);
  assert.match(routeSource, /publishable:\s*false/);
  assert.match(routeSource, /controllingGate:\s*'SCI-PRES-01'/);
  assert.match(routeSource, /syntheticFallback:\s*false/);
  assert.match(routeSource, /publication produit non autorisee/);
});

test('quarantine does not rewrite current presence formulas or gate thresholds', () => {
  assert.match(serviceSource, /validPresenceHours < 2 \|\| validAbsenceHours < 2/);
  assert.match(serviceSource, /validPresenceHours < 4 \|\| validAbsenceHours < 4 \|\| confidence < 0\.6/);
  assert.match(serviceSource, /const vocal = summary\.vocalEvents \?\? 0/);
  assert.match(serviceSource, /const agitation = summary\.agitationEvents \?\? 0/);
  assert.match(serviceSource, /const rest = summary\.matPresenceMinutes \?\? 0/);
});
