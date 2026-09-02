import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const routeSource = readFileSync(new URL('../api/routes/sensors.ts', import.meta.url), 'utf8');
const serviceSource = readFileSync(new URL('../api/services/presence.ts', import.meta.url), 'utf8');

test('presence-event API exposes its process-memory storage class', () => {
  assert.match(routeSource, /storageClass:\s*'VOLATILE_PROCESS'/);
  assert.match(routeSource, /durable:\s*false/);
  assert.match(routeSource, /survivesRestart:\s*false/);
  assert.match(routeSource, /presence_event_recorded_in_volatile_store/);
  assert.doesNotMatch(routeSource, /message:\s*'presence_event_recorded'/);
});

test('presence events still use the explicit in-process store on this candidate', () => {
  assert.match(serviceSource, /const presenceEventStore = new Map<string, PresenceEventInput\[\]>\(\)/);
  assert.match(serviceSource, /presenceEventStore\.set\(dogId/);
});

test('presence-event reads validate days after ownership and before store access', () => {
  const routeStart = routeSource.indexOf("sensors.get('/presence/:dogId/events'");
  const routeEnd = routeSource.indexOf('\nexport { sensors };', routeStart);
  const route = routeSource.slice(routeStart, routeEnd);

  assert.ok(routeStart >= 0 && routeEnd > routeStart);
  assert.match(route, /parseLookbackWindow\(c\.req\.query\('days'\)\)/);
  assert.match(route, /invalid_presence_window/);
  assert.match(route, /parameter:\s*'days'/);
  assert.doesNotMatch(route, /Number\(c\.req\.query\('days'\)/);
  assert.ok(route.indexOf('if (denied) return denied;') < route.indexOf('parseLookbackWindow'));
  assert.ok(route.indexOf('parseLookbackWindow') < route.indexOf('getPresenceEventsForDog'));
});
