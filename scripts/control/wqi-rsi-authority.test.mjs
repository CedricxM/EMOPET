import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const authorityUrl = new URL('../../config/product/wqi-rsi-authority.json', import.meta.url);
const entitlementsUrl = new URL('../../packages/shared/src/entitlements/index.ts', import.meta.url);
const catalogUrl = new URL('../../apps/web/lib/eli/catalog.ts', import.meta.url);

test('WQI/RSI remain HOLD and are not sold through tier entitlements', async () => {
  const authority = JSON.parse(await readFile(authorityUrl, 'utf8'));
  const entitlements = await readFile(entitlementsUrl, 'utf8');

  assert.equal(authority.status, 'HOLD');
  assert.equal(authority.walkQuality.productEntitlementAuthorized, false);
  assert.equal(authority.routineStability.productEntitlementAuthorized, false);
  assert.equal(entitlements.includes("feature_id: 'walk_quality'"), false);
  assert.equal(entitlements.includes("feature_id: 'routine_stability'"), false);
});

test('prototype constants are explicitly classified as EMOPET prototype choices', async () => {
  const authority = JSON.parse(await readFile(authorityUrl, 'utf8'));
  const catalog = await readFile(catalogUrl, 'utf8');

  assert.equal(authority.walkQuality.weightsEvidenceStatus, 'EMOPET_PROTOTYPE_CHOICE');
  assert.equal(authority.routineStability.thresholdEvidenceStatus, 'EMOPET_PROTOTYPE_CHOICE');
  assert.match(catalog, /#91/);
  assert.doesNotMatch(catalog, /WQI \(Walk Quality Index\) — ELI v6 §7/);
  assert.doesNotMatch(catalog, /Seuils RSI \(ELI v6 §8\)/);
});
