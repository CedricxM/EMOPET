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

test('absence comparison validates days after ownership and before evidence access', () => {
  const routeStart = routeSource.indexOf("dogs.get('/:id/absence-comparison'");
  const routeEnd = routeSource.indexOf("dogs.get('/:id/vet-report-link'", routeStart);
  const route = routeSource.slice(routeStart, routeEnd);

  assert.ok(routeStart >= 0 && routeEnd > routeStart);
  assert.match(route, /parseLookbackWindow\(c\.req\.query\('days'\)\)/);
  assert.match(route, /invalid_presence_window/);
  assert.match(route, /parameter:\s*'days'/);
  assert.doesNotMatch(route, /Number\(c\.req\.query\('days'\)/);
  assert.ok(route.indexOf('if (denied) return denied;') < route.indexOf('parseLookbackWindow'));
  assert.ok(route.indexOf('parseLookbackWindow') < route.indexOf('let summaries'));
});
