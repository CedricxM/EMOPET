import test from 'node:test';
import assert from 'node:assert/strict';

import * as pkg from '../dist/index.js';

test('package root does not expose pre-doctrine content bypass APIs', () => {
  for (const forbidden of [
    'TEMPLATES',
    'getTemplates',
    'generateDailyInsight',
    'generateMorningGreeting',
    'generateRecordAnnouncement',
    'scheduleFreemiumContent',
    'simulateSchedule',
    'V6_BLEIZ_TEMPLATES',
    'SEP_ANTICIPATION_DETECTED',
    'ALLO_RECOVERY_SLOWING',
  ]) {
    assert.equal(
      Object.prototype.hasOwnProperty.call(pkg, forbidden),
      false,
      `${forbidden} must not bypass canonical release authority from package root`,
    );
  }

  assert.equal(typeof pkg.scheduleBleizContent, 'function');
  assert.equal(typeof pkg.guardReleaseGeneratedText, 'function');
  assert.ok(Array.isArray(pkg.BLEIZ_RELEASE_TEMPLATES));
});

test('historical Breiz catalog is explicit legacy authority only', () => {
  assert.ok(Array.isArray(pkg.LEGACY_BLEIZ_TEMPLATES));
  assert.ok(pkg.LEGACY_BLEIZ_TEMPLATE_STATS);
  assert.equal(Object.prototype.hasOwnProperty.call(pkg, 'BLEIZ_TEMPLATES'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(pkg, 'BLEIZ_TEMPLATE_STATS'), false);
});

test('v6 sensor-driven templates enter only through the canonical release registry', () => {
  for (const id of ['SEP_ANTICIPATION_DETECTED', 'ALLO_RECOVERY_SLOWING']) {
    const template = pkg.BLEIZ_RELEASE_TEMPLATES.find((item) => item.id === id);
    assert.ok(template, `${id} should exist in canonical release registry`);
    assert.equal(template.sourceAuthority, 'SANITIZED_V6');
    assert.equal(template.releaseClass, 'OBSERVATION_EXPLANATION');
    assert.equal(template.semanticAuthority, 'OBSERVATION_ONLY');
  }
});

test('canonical release registry contains unique IDs across legacy, v6 and native replacements', () => {
  const ids = pkg.BLEIZ_RELEASE_TEMPLATES.map((template) => template.id);
  assert.equal(ids.length, new Set(ids).size);
});
