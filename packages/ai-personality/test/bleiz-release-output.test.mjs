import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BHV_ELEVATED_ACTIVITY_LOW_REST_VOCAL_PATTERN,
  BLEIZ_RELEASE_TEMPLATES,
  guardReleaseGeneratedText,
} from '../dist/index.js';

function requireTemplate(id) {
  const template = BLEIZ_RELEASE_TEMPLATES.find((item) => item.id === id);
  assert.ok(template, `missing release template ${id}`);
  return template;
}

test('observation-only output allows a bounded factual description', () => {
  assert.ok(BHV_ELEVATED_ACTIVITY_LOW_REST_VOCAL_PATTERN);

  const result = guardReleaseGeneratedText(
    BHV_ELEVATED_ACTIVITY_LOW_REST_VOCAL_PATTERN,
    "Aujourd'hui, Naya a davantage bougé, a passé moins de temps de repos qualifié sur le MAT et a vocalisé plus souvent que sa référence récente. Plusieurs explications restent possibles.",
  );

  assert.equal(result.decision, 'ALLOW');
  assert.ok(result.text);
  assert.deepEqual(result.violations, []);
});

test('observation-only output rejects latent emotion even when copy sounds gentle', () => {
  assert.ok(BHV_ELEVATED_ACTIVITY_LOW_REST_VOCAL_PATTERN);

  const result = guardReleaseGeneratedText(
    BHV_ELEVATED_ACTIVITY_LOW_REST_VOCAL_PATTERN,
    'Naya semble anxieuse aujourd’hui. Cette agitation vient probablement de votre absence.',
  );

  assert.equal(result.decision, 'REJECT');
  assert.equal(result.text, null);
  assert.ok(result.violations.some((item) => item.id === 'latent-emotion'));
});

test('observation-only output rejects causal interpretation', () => {
  assert.ok(BHV_ELEVATED_ACTIVITY_LOW_REST_VOCAL_PATTERN);

  const result = guardReleaseGeneratedText(
    BHV_ELEVATED_ACTIVITY_LOW_REST_VOCAL_PATTERN,
    'Naya a davantage vocalisé parce que votre routine a changé.',
  );

  assert.equal(result.decision, 'REJECT');
  assert.equal(result.text, null);
  assert.ok(result.violations.some((item) => item.id === 'causal-claim'));
});

test('raw diagnostic claim is rejected rather than merely rewritten by lexical filter', () => {
  assert.ok(BHV_ELEVATED_ACTIVITY_LOW_REST_VOCAL_PATTERN);

  const result = guardReleaseGeneratedText(
    BHV_ELEVATED_ACTIVITY_LOW_REST_VOCAL_PATTERN,
    'Ce diagnostic montre certainement que Naya a un trouble.',
  );

  assert.equal(result.decision, 'REJECT');
  assert.equal(result.text, null);
  assert.ok(result.blockedTerms.includes('diagnostic'));
  assert.ok(result.violations.some((item) => item.id === 'diagnostic-assertion'));
  assert.ok(result.violations.some((item) => item.id === 'certainty-assertion'));
});

test('context-only output cannot turn weather context into a hidden dog state', () => {
  const template = requireTemplate('HSE_HEAT_ALERT');
  assert.equal(template.semanticAuthority, 'CONTEXT_ONLY');

  const result = guardReleaseGeneratedText(
    template,
    'La chaleur rend votre chien anxieux, donc gardez-le au calme.',
  );

  assert.equal(result.decision, 'REJECT');
  assert.equal(result.text, null);
  assert.ok(result.violations.some((item) => item.id === 'context-to-dog-state'));
});

test('context-only output can give bounded external context without mind-reading', () => {
  const template = requireTemplate('HSE_HEAT_ALERT');

  const result = guardReleaseGeneratedText(
    template,
    "Il fait plus chaud aujourd'hui. Privilégiez l'ombre, de l'eau disponible et des sorties aux heures plus fraîches.",
  );

  assert.equal(result.decision, 'ALLOW');
  assert.ok(result.text);
});

test('community-only output cannot present community copy as ELI scientific truth', () => {
  const template = requireTemplate('COM_MORNING_QUESTION');
  assert.equal(template.semanticAuthority, 'COMMUNITY_ONLY');

  const result = guardReleaseGeneratedText(
    template,
    'ELI montre que les chiens de Lorient vont mieux quand ils se retrouvent le matin.',
  );

  assert.equal(result.decision, 'REJECT');
  assert.equal(result.text, null);
  assert.ok(result.violations.some((item) => item.id === 'community-scientific-inference'));
});

test('education-only output cannot diagnose an individual dog', () => {
  const template = requireTemplate('EDU_HOME_SAFETY');
  assert.equal(template.semanticAuthority, 'EDUCATION_ONLY');

  const result = guardReleaseGeneratedText(
    template,
    'Votre chien a une maladie comportementale qui explique ce comportement.',
  );

  assert.equal(result.decision, 'REJECT');
  assert.equal(result.text, null);
  assert.ok(result.violations.some((item) => item.id === 'diagnostic-assertion'));
});

test('rejected output never returns raw candidate text', () => {
  assert.ok(BHV_ELEVATED_ACTIVITY_LOW_REST_VOCAL_PATTERN);
  const raw = 'Votre chien est heureux et votre lien est plus fort.';

  const result = guardReleaseGeneratedText(
    BHV_ELEVATED_ACTIVITY_LOW_REST_VOCAL_PATTERN,
    raw,
  );

  assert.equal(result.decision, 'REJECT');
  assert.equal(result.text, null);
  assert.equal(JSON.stringify(result).includes(raw), false);
});
