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
