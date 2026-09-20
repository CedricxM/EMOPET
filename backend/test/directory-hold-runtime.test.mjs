import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { Hono } from 'hono';

import { directory } from '../dist/api/routes/directory.js';

const ORIGINAL_ENV = {
  NODE_ENV: process.env.NODE_ENV,
  EMOPET_LOCAL_DIRECTORY_RELEASE_GATE: process.env.EMOPET_LOCAL_DIRECTORY_RELEASE_GATE,
  EMOPET_LOCAL_DIRECTORY_DEMO: process.env.EMOPET_LOCAL_DIRECTORY_DEMO,
};

function restoreEnv(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

afterEach(() => {
  restoreEnv('NODE_ENV', ORIGINAL_ENV.NODE_ENV);
  restoreEnv('EMOPET_LOCAL_DIRECTORY_RELEASE_GATE', ORIGINAL_ENV.EMOPET_LOCAL_DIRECTORY_RELEASE_GATE);
  restoreEnv('EMOPET_LOCAL_DIRECTORY_DEMO', ORIGINAL_ENV.EMOPET_LOCAL_DIRECTORY_DEMO);
});

function buildDirectoryApp() {
  const app = new Hono();
  app.route('/api/directory', directory);
  return app;
}

const HOLD_PAYLOAD = {
  error: 'Local directory unavailable',
  code: 'DATA_RIGHTS_GATE_HOLD',
  dataStatus: 'HOLD',
  message: 'Directory publication is disabled until row-level provenance and rights review are complete.',
};

async function assertHold(app, path) {
  const response = await app.request(path);
  assert.equal(response.status, 503, `${path} must fail closed while directory rights authority is HOLD`);
  assert.deepEqual(await response.json(), HOLD_PAYLOAD);
}

test('INT-07E: all directory read surfaces fail closed before publication while rights authority is HOLD', async () => {
  delete process.env.EMOPET_LOCAL_DIRECTORY_RELEASE_GATE;
  delete process.env.EMOPET_LOCAL_DIRECTORY_DEMO;
  process.env.NODE_ENV = 'production';

  const app = buildDirectoryApp();
  for (const path of [
    '/api/directory/search',
    '/api/directory/categories',
    '/api/directory/1',
  ]) {
    await assertHold(app, path);
  }
});

test('INT-07E: deployment GO flag alone cannot release directory data', async () => {
  process.env.NODE_ENV = 'production';
  process.env.EMOPET_LOCAL_DIRECTORY_RELEASE_GATE = 'GO';
  delete process.env.EMOPET_LOCAL_DIRECTORY_DEMO;

  const app = buildDirectoryApp();
  for (const path of [
    '/api/directory/search',
    '/api/directory/categories',
    '/api/directory/1',
  ]) {
    await assertHold(app, path);
  }
});

test('INT-07E: production cannot enter the non-production demo path', async () => {
  process.env.NODE_ENV = 'production';
  delete process.env.EMOPET_LOCAL_DIRECTORY_RELEASE_GATE;
  process.env.EMOPET_LOCAL_DIRECTORY_DEMO = '1';

  const app = buildDirectoryApp();
  for (const path of [
    '/api/directory/search',
    '/api/directory/categories',
    '/api/directory/1',
  ]) {
    await assertHold(app, path);
  }
});