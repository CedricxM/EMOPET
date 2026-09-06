import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BHV_ELEVATED_ACTIVITY_LOW_REST_VOCAL_PATTERN,
  BLEIZ_RELEASE_TEMPLATES,
  BLEIZ_RELEASE_TEMPLATE_STATS,
  LEGACY_BLEIZ_TEMPLATES,
  filterReleaseTemplates,
  releaseTemplateBlockReason,
  scheduleBleizContent,
} from '../dist/index.js';

const blockedIds = [
  'BHV_ANXIETY_PATTERN',
  'ACT_DISTANCE_RECORD',
  'MIL_DISTANCE_RECORD',
  'MIL_MAT_STREAK',
];

const releaseClasses = new Set([
  'OBSERVATION_EXPLANATION',
  'GENERAL_EDUCATION',
  'SEASONAL_CONTEXT',
  'SUGGESTION',
  'COMMUNITY_CONTENT',
]);

const forbiddenReleaseFields = [
  /mat_streak/i,
  /personal_best/i,
  /weekly_distance_goal/i,
  /weekly_distance_last/i,
];

function commonContexts() {
  return {
    sensor: {
      activity_km_today: 8,
      activity_km_7d_avg: 2,
      mat_presence_today_min: 10,
      vocal_events_today: 20,
      vocal_events_7d_avg: 4,
    },
    dog: { name: 'Naya', breed: 'labrador', size: 'large', ageMonths: 24 },
    user: { subscription_tier: 'premium', hardware_linked: true },
  };
}

test('release catalog excludes legacy anxiety and performance/adherence templates', () => {
  for (const id of blockedIds) {
    const legacy = LEGACY_BLEIZ_TEMPLATES.find((template) => template.id === id);
    if (!legacy) continue;
    assert.ok(releaseTemplateBlockReason(legacy), `${id} should have a release block reason`);
    assert.equal(
      BLEIZ_RELEASE_TEMPLATES.some((template) => template.id === id),
      false,
      `${id} leaked into release catalog`,
    );
  }
});

test('every release template carries a machine-readable class and semantic ceiling', () => {
  assert.ok(BLEIZ_RELEASE_TEMPLATES.length > 0);
  assert.equal(BLEIZ_RELEASE_TEMPLATE_STATS.total, BLEIZ_RELEASE_TEMPLATES.length);

  for (const template of BLEIZ_RELEASE_TEMPLATES) {
    assert.ok(releaseClasses.has(template.releaseClass), `${template.id} has invalid releaseClass`);
    assert.ok(template.semanticAuthority, `${template.id} is missing semanticAuthority`);
    assert.ok(template.sourceAuthority, `${template.id} is missing sourceAuthority`);

    const fields = [
      ...template.required_fields,
      ...template.triggers.map((trigger) => trigger.field),
    ];
    for (const field of fields) {
      assert.equal(
        forbiddenReleaseFields.some((pattern) => pattern.test(field)),
        false,
        `${template.id} leaked forbidden release field ${field}`,
      );
    }
  }
});

test('legacy anxiety semantic identity is replaced by an observable-pattern release identity', () => {
  assert.ok(BHV_ELEVATED_ACTIVITY_LOW_REST_VOCAL_PATTERN);
  assert.equal(
    BHV_ELEVATED_ACTIVITY_LOW_REST_VOCAL_PATTERN.id,
    'BHV_ELEVATED_ACTIVITY_LOW_REST_VOCAL_PATTERN',
  );
  assert.equal(
    BHV_ELEVATED_ACTIVITY_LOW_REST_VOCAL_PATTERN.releaseClass,
    'OBSERVATION_EXPLANATION',
  );
  assert.equal(
    BHV_ELEVATED_ACTIVITY_LOW_REST_VOCAL_PATTERN.semanticAuthority,
    'OBSERVATION_ONLY',
  );
  assert.equal(
    BLEIZ_RELEASE_TEMPLATES.some((template) => template.id === 'BHV_ANXIETY_PATTERN'),
    false,
  );
});

test('release filter rejects distance/MAT goal fields even if a new template uses a different id', () => {
  const candidate = {
    id: 'NEW_SOFT_NAME',
    category: 'community',
    channel: 'community_post',
    priority: 1,
    cooldownHours: 1,
    weeklyBudget: 1,
    required_fields: ['community.weekly_distance_goal'],
    triggers: [],
    targeting: {},
    never_say: [],
    safety: { requireNonMedical: true },
    tone: 'warm',
    prompt: 'hello',
  };

  assert.deepEqual(filterReleaseTemplates([candidate]), []);
});

test('package-root scheduler cannot be bypassed with an explicitly supplied blocked template', () => {
  const blocked = LEGACY_BLEIZ_TEMPLATES.find((template) => template.id === 'BHV_ANXIETY_PATTERN');
  assert.ok(blocked);

  const jobs = scheduleBleizContent({
    templates: [blocked],
    contexts: commonContexts(),
    history: [],
    now: new Date('2026-09-06T12:00:00Z'),
  });

  assert.deepEqual(jobs, []);
});

test('package-root scheduler rejects unregistered ad-hoc templates even when structurally safe', () => {
  const adHoc = {
    id: 'AD_HOC_NOT_IN_RELEASE_REGISTRY',
    category: 'education',
    channel: 'home_insight',
    priority: 1,
    cooldownHours: 1,
    weeklyBudget: 1,
    required_fields: ['dog.name'],
    triggers: [{
      type: 'event',
      field: 'dog.name',
      operator: 'exists',
      description: 'Name exists',
    }],
    targeting: {},
    never_say: [],
    safety: { requireNonMedical: true },
    tone: 'informative',
    prompt: 'Provide a neutral educational note.',
  };

  const jobs = scheduleBleizContent({
    templates: [adHoc],
    contexts: commonContexts(),
    history: [],
    now: new Date('2026-09-06T12:00:00Z'),
  });

  assert.deepEqual(jobs, []);
});

test('observable replacement can publish the same evidence without encoding a latent state', () => {
  assert.ok(BHV_ELEVATED_ACTIVITY_LOW_REST_VOCAL_PATTERN);

  const jobs = scheduleBleizContent({
    templates: [BHV_ELEVATED_ACTIVITY_LOW_REST_VOCAL_PATTERN],
    contexts: commonContexts(),
    history: [],
    now: new Date('2026-09-06T12:00:00Z'),
  });

  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].templateId, 'BHV_ELEVATED_ACTIVITY_LOW_REST_VOCAL_PATTERN');
  assert.equal(jobs[0].gate, 'PUBLISH');
  assert.equal(jobs[0].metadata.category, 'behavior');
  assert.equal(jobs[0].metadata.releaseClass, 'OBSERVATION_EXPLANATION');
  assert.equal(jobs[0].metadata.semanticAuthority, 'OBSERVATION_ONLY');
  assert.equal(jobs[0].metadata.sourceAuthority, 'SANITIZED_LEGACY');
  assert.match(jobs[0].prompt, /observable combination/i);
  assert.match(jobs[0].prompt, /several explanations can remain possible/i);
  assert.equal(/BHV_ANXIETY_PATTERN/i.test(jobs[0].prompt), false);
});

test('degraded physiological evidence stays degraded and is not promoted to a confident push', () => {
  const template = BLEIZ_RELEASE_TEMPLATES.find(
    (item) => item.id === 'HBR_BRACHY_REST_BREATHING',
  );
  if (!template) return;

  const jobs = scheduleBleizContent({
    templates: [template],
    contexts: {
      sensor: {
        resting_rr_today: 28,
        resting_rr_delta_pct: 22,
        days_with_valid_rest_data: 3,
        rest_rr_valid_today: false,
        coverage_14d: 0.2,
      },
      dog: {
        name: 'Naya',
        breed: 'bouledogue francais',
        size: 'small',
        ageMonths: 24,
        is_brachycephalic: true,
      },
      user: { subscription_tier: 'premium', hardware_linked: true },
    },
    history: [],
    now: new Date('2026-09-06T08:00:00Z'),
  });

  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].gate, 'DEGRADE');
  assert.notEqual(jobs[0].channel, 'push');
  assert.match(jobs[0].prompt, /Degraded mode/i);
  assert.ok(jobs[0].metadata.releaseClass);
  assert.ok(jobs[0].metadata.semanticAuthority);
});
