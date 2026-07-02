import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AI_TONE_PROFILE_IDS,
  BLEIZ_TEMPLATE_STATS,
  BLEIZ_TEMPLATES,
  evaluateTrigger,
  filterGeneratedText,
  filterPrompt,
  getAiPersona,
  hasRequiredFields,
  publishDecision,
  scheduleBleizContent,
} from '../dist/index.js';

function buildBaseContexts() {
  return {
    sensor: {
      hour: 8,
      day_of_week: 1,
      season: 'spring',
      month: 4,
    },
    dog: {
      name: 'Naya',
      breed: 'labrador',
      size: 'large',
      ageMonths: 24,
      is_brachycephalic: false,
      morphology_flags: [],
      adoptionAnniversaryToday: false,
    },
    user: {
      aiToneProfile: 'BREIZ',
      locale: 'fr-FR',
      region: 'Bretagne',
      days_since_onboarding: 14,
      total_km: 180,
      total_insights: 24,
      treats_today_count: 1,
    },
    community: {
      aiToneProfileDefault: 'BREIZ',
      city: 'Lorient',
      copresence_count: 0,
      otherDogName: 'Malo',
      otherDogBreed: 'berger',
      weekly_distance_goal: 60,
      owner_presence_calm_correlation: 0.72,
    },
  };
}

test('Bleiz template catalog keeps the expected V1 size', () => {
  assert.equal(BLEIZ_TEMPLATE_STATS.total, 79);
  assert.equal(BLEIZ_TEMPLATE_STATS.by_category.behavior, 4);
  assert.equal(BLEIZ_TEMPLATE_STATS.by_category.relationship, 4);
  assert.equal(BLEIZ_TEMPLATE_STATS.by_category.eli_v5, 7);
  assert.equal(BLEIZ_TEMPLATE_STATS.by_category.separation, 12);
  assert.equal(BLEIZ_TEMPLATE_STATS.by_category.noise, 6);
  assert.equal(BLEIZ_TEMPLATE_STATS.by_category.thermal, 8);
  assert.equal(BLEIZ_TEMPLATE_STATS.by_category.multi_sensor, 10);
  assert.equal(BLEIZ_TEMPLATE_STATS.by_category.allostatic, 4);
});

test('sensor template with missing required_fields never triggers', () => {
  const template = BLEIZ_TEMPLATES.find((item) => item.id === 'BHV_ANXIETY_PATTERN');
  assert.ok(template);

  const contexts = buildBaseContexts();
  contexts.sensor = {
    hour: 9,
    day_of_week: 2,
  };

  assert.equal(
    hasRequiredFields(
      template,
      contexts.sensor,
      contexts.dog,
      contexts.user,
      contexts.community,
    ),
    false,
  );
  assert.equal(
    evaluateTrigger(
      template,
      contexts.sensor,
      contexts.dog,
      contexts.user,
      contexts.community,
    ),
    false,
  );
});

test('community-only template can trigger without sensor payload', () => {
  const template = BLEIZ_TEMPLATES.find((item) => item.id === 'COM_COPRESENCE_HINT');
  assert.ok(template);

  const contexts = buildBaseContexts();
  contexts.sensor = {};
  contexts.community = {
    city: 'Lorient',
    copresence_count: 4,
    otherDogName: 'Malo',
    otherDogBreed: 'berger',
  };

  assert.equal(
    hasRequiredFields(
      template,
      contexts.sensor,
      contexts.dog,
      contexts.user,
      contexts.community,
    ),
    true,
  );
  assert.equal(
    evaluateTrigger(
      template,
      contexts.sensor,
      contexts.dog,
      contexts.user,
      contexts.community,
    ),
    true,
  );
});

test('free tier without hardware never schedules sensor-driven templates', () => {
  const sensorTemplate = BLEIZ_TEMPLATES.find((item) => item.id === 'BHV_ABSENCE_AGITATION');
  const communityTemplate = BLEIZ_TEMPLATES.find((item) => item.id === 'COM_COPRESENCE_HINT');
  assert.ok(sensorTemplate);
  assert.ok(communityTemplate);

  const contexts = buildBaseContexts();
  contexts.user.subscription_tier = 'free';
  contexts.user.hardware_linked = false;
  contexts.sensor = {
    hour: 10,
    day_of_week: 2,
    absent_vocal_events_per_hour: 6,
    absent_imu_agitation_index_mean: 4,
    absent_mat_rest_min: 10,
    presence_confidence: 0.72,
  };
  contexts.community = {
    city: 'Lorient',
    copresence_count: 5,
    otherDogName: 'Malo',
    otherDogBreed: 'berger',
  };

  assert.equal(
    evaluateTrigger(
      sensorTemplate,
      contexts.sensor,
      contexts.dog,
      contexts.user,
      contexts.community,
    ),
    false,
  );
  assert.equal(publishDecision(sensorTemplate, contexts), 'REJECT');
  assert.equal(publishDecision(communityTemplate, contexts), 'PUBLISH');

  const jobs = scheduleBleizContent({
    templates: [sensorTemplate, communityTemplate],
    contexts,
    history: [],
    now: new Date('2026-03-30T09:00:00Z'),
  });

  assert.deepEqual(jobs.map((job) => job.templateId), ['COM_COPRESENCE_HINT']);
});

test('resting RR health template degrades without enough baseline and never stays as push', () => {
  const template = BLEIZ_TEMPLATES.find((item) => item.id === 'HBR_BRACHY_REST_BREATHING');
  assert.ok(template);

  const contexts = buildBaseContexts();
  contexts.dog.is_brachycephalic = true;
  contexts.sensor = {
    resting_rr_today: 28,
    resting_rr_delta_pct: 22,
    days_with_valid_rest_data: 3,
    rest_rr_valid_today: false,
    coverage_14d: 0.2,
  };

  assert.equal(publishDecision(template, contexts), 'DEGRADE');

  const jobs = scheduleBleizContent({
    templates: [template],
    contexts,
    history: [],
    now: new Date('2026-03-30T08:00:00Z'),
  });

  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].gate, 'DEGRADE');
  assert.equal(jobs[0].channel, 'home_insight');
});

test('safety filter blocks forbidden words in prompts and generated output', () => {
  const template = BLEIZ_TEMPLATES.find((item) => item.id === 'BHV_BARK_SMALL');
  assert.ok(template);

  const prompt = filterPrompt(template, 'This prompt contains diagnostic stress and punir.');
  assert.equal(prompt.prompt.toLowerCase().includes('diagnostic'), false);
  assert.equal(prompt.prompt.toLowerCase().includes('stress'), false);
  assert.equal(prompt.prompt.toLowerCase().includes('punir'), false);

  const output = filterGeneratedText(template, 'Un diagnostic certain avec punir et stress.');
  assert.equal(output.text.toLowerCase().includes('diagnostic'), false);
  assert.equal(output.text.toLowerCase().includes('stress'), false);
  assert.equal(output.text.toLowerCase().includes('punir'), false);
});

test('aiToneProfile mapping stays stable and every persona has a display name', () => {
  const snapshot = Object.fromEntries(
    AI_TONE_PROFILE_IDS.map((profile) => {
      const persona = getAiPersona(profile, {
        dogName: 'Naya',
        locale: 'fr-FR',
        region: 'Bretagne',
      });
      assert.notEqual(persona.displayName.trim(), '');
      return [
        profile,
        {
          displayName: persona.displayName,
          greeting: persona.greeting,
        },
      ];
    }),
  );

  assert.deepEqual(snapshot, {
    BREIZ: { displayName: 'Breiz', greeting: 'Demat, Naya !' },
    BREIZIG: { displayName: 'Breizig', greeting: 'Demat mat, Naya ! On y va avec un peu de pep ?' },
    BREIZENN: { displayName: 'Breizenn', greeting: 'Demat deoc h, Naya ! On garde un rythme doux aujourd hui.' },
    BREIZOU: { displayName: 'Breizou', greeting: 'Demat, Naya ! On partage un bon moment dehors ?' },
    BREIZAT: { displayName: 'Breizat', greeting: 'Demat, Naya ! Un repere simple pour aujourd hui ?' },
  });
});

test('community default is used when user override is absent', () => {
  const persona = getAiPersona(undefined, {
    dogName: 'Naya',
    locale: 'fr-FR',
    region: 'France',
    communityDefaultProfile: 'BREIZOU',
  });

  assert.deepEqual(persona, {
    displayName: 'Breizou',
    greeting: 'Demat, Naya ! On partage un bon moment dehors ?',
    lexiconHints: ['partager', 'dehors', 'ensemble', 'elan', 'repere adapte pour France'],
    styleHints: ['plus communautaire', 'celebration douce', 'toujours inclusif', 'la region ne change jamais l inference'],
  });
});

test('legacy aliases stay mapped to the new Breiz-derived profiles', () => {
  const persona = getAiPersona('BREIZ_BASE', {
    dogName: 'Naya',
    locale: 'fr-FR',
    region: 'Bretagne',
  });
  const parisPersona = getAiPersona('FR_IDF', {
    dogName: 'Naya',
    locale: 'fr-FR',
    region: 'Ile-de-France',
  });

  assert.deepEqual(persona, {
    displayName: 'Breiz',
    greeting: 'Demat, Naya !',
    lexiconHints: ['demat', 'doucement', 'au grand air', 'petits pas'],
    styleHints: ['ton chaleureux', 'rituels inclusifs', 'jamais clinique'],
  });
  assert.equal(parisPersona.displayName, 'Breizat');
});
