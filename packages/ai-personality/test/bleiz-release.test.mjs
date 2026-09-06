import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BLEIZ_RELEASE_TEMPLATES,
  BLEIZ_TEMPLATES,
  filterReleaseTemplates,
  releaseTemplateBlockReason,
  scheduleBleizContent,
} from '../dist/index.js';

const blockedIds = ['BHV_ANXIETY_PATTERN', 'ACT_DISTANCE_RECORD', 'MIL_DISTANCE_RECORD', 'MIL_MAT_STREAK'];

test('release catalog excludes legacy anxiety and performance/adherence templates', () => {
  for (const id of blockedIds) {
    const legacy = BLEIZ_TEMPLATES.find((template) => template.id === id);
    if (!legacy) continue;
    assert.ok(releaseTemplateBlockReason(legacy), `${id} should have a release block reason`);
    assert.equal(BLEIZ_RELEASE_TEMPLATES.some((template) => template.id === id), false, `${id} leaked into release catalog`);
  }
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
  const blocked = BLEIZ_TEMPLATES.find((template) => template.id === 'BHV_ANXIETY_PATTERN');
  assert.ok(blocked);

  const jobs = scheduleBleizContent({
    templates: [blocked],
    contexts: {
      sensor: {
        activity_km_today: 8,
        activity_km_7d_avg: 2,
        mat_presence_today_min: 10,
        vocal_events_today: 20,
        vocal_events_7d_avg: 4,
      },
      dog: { name: 'Naya', breed: 'labrador', size: 'large', ageMonths: 24 },
      user: { subscription_tier: 'premium', hardware_linked: true },
    },
    history: [],
    now: new Date('2026-09-06T12:00:00Z'),
  });

  assert.deepEqual(jobs, []);
});
