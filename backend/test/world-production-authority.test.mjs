import test from 'node:test';
import assert from 'node:assert/strict';

import { configuredWorldSpike, worldRuntimeMode } from '../dist/api/routes/world-spike.js';
import { isWorldProductionReleaseAuthorized } from '../dist/api/services/world-release-authority.js';

const GO_AUTHORITY = {
  disposition: 'GO',
  founderAuthorizedAt: '2026-09-30T08:51:41Z',
  evidenceRevision: 'world-prod-evidence-test',
  reviewedAt: '2026-09-30T08:51:50Z',
  reviewerRole: 'founder',
  deploymentProfile: 'synthetic-test-profile',
  reason: 'synthetic test authority only',
};

const HOLD_AUTHORITY = {
  ...GO_AUTHORITY,
  disposition: 'HOLD',
};

const blocks = { async isBlockedEitherWay() { return false; } };
const reports = { async create(input) { return { id: 'synthetic', kind: input.kind, status: 'open', createdAt: new Date(0) }; } };
const access = { async isEligible() { return true; } };
const social = {
  async isMutuallyConnected() { return true; },
  async connectedPeers() { return []; },
  async hasPresenceConsent() { return false; },
  async grantPresenceConsent() {},
  async withdrawPresenceConsent() {},
};

test('production release authority requires a complete reviewed GO record', () => {
  assert.equal(isWorldProductionReleaseAuthorized(HOLD_AUTHORITY), false);
  assert.equal(isWorldProductionReleaseAuthorized({ ...GO_AUTHORITY, evidenceRevision: null }), false);
  assert.equal(isWorldProductionReleaseAuthorized({ ...GO_AUTHORITY, deploymentProfile: null }), false);
  assert.equal(isWorldProductionReleaseAuthorized({ ...GO_AUTHORITY, reviewedAt: '2026-09-30T08:50:00Z' }), false,
    'review cannot predate founder authorization');
  assert.equal(isWorldProductionReleaseAuthorized(GO_AUTHORITY), true);
});

test('production runtime flag alone cannot activate World', () => {
  const env = {
    NODE_ENV: 'production',
    EMOPET_WORLD_RELEASE_GATE: 'GO',
    NAKAMA_URL: 'https://nakama.example.test',
    NAKAMA_HTTP_KEY: 'a'.repeat(64),
  };
  assert.equal(worldRuntimeMode(env, HOLD_AUTHORITY), 'HOLD');
  assert.throws(
    () => configuredWorldSpike(env, blocks, reports, access, social, HOLD_AUTHORITY),
    /release authority is HOLD/,
  );
});

test('reviewed authority without deployment GO stays disabled', () => {
  const env = {
    NODE_ENV: 'production',
    NAKAMA_URL: 'https://nakama.example.test',
    NAKAMA_HTTP_KEY: 'a'.repeat(64),
  };
  assert.equal(worldRuntimeMode(env, GO_AUTHORITY), 'DISABLED');
  assert.equal(configuredWorldSpike(env, blocks, reports, access, social, GO_AUTHORITY), null);
});

test('production enters release mode only when both gates are GO', t => {
  const original = globalThis.WebSocket;
  t.after(() => { globalThis.WebSocket = original; });
  globalThis.WebSocket = class {};

  const env = {
    NODE_ENV: 'production',
    EMOPET_WORLD_RELEASE_GATE: 'GO',
    NAKAMA_URL: 'https://nakama.example.test',
    NAKAMA_HTTP_KEY: 'a'.repeat(64),
  };
  assert.equal(worldRuntimeMode(env, GO_AUTHORITY), 'RELEASE_GO');
  assert.ok(configuredWorldSpike(env, blocks, reports, access, social, GO_AUTHORITY));
});

test('local spike remains explicitly development/test only', () => {
  assert.equal(worldRuntimeMode({
    NODE_ENV: 'test',
    WORLD_NAKAMA_SPIKE_ENABLED: 'true',
  }, HOLD_AUTHORITY), 'SPIKE_LOCAL');

  assert.equal(worldRuntimeMode({
    NODE_ENV: 'staging',
    WORLD_NAKAMA_SPIKE_ENABLED: 'true',
  }, HOLD_AUTHORITY), 'HOLD');
});
