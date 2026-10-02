import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  MOTSPET_ENTRIES,
  MOTSPET_REVISION,
  buildMotsPetPromptBlock,
  getControlledMotsPetEntries,
  getMotsPetEntry,
} from '../motspet';

test('MotsPet controlled seed excludes HOLD entries', () => {
  const controlled = getControlledMotsPetEntries();

  assert.ok(controlled.length > 0);
  assert.ok(controlled.every((entry) => entry.status === 'CONTROLLED_SEED'));
  assert.ok(!controlled.some((entry) => entry.id === 'activation_change'));
});

test('MotsPet entries carry explicit revision and review metadata', () => {
  for (const entry of MOTSPET_ENTRIES) {
    assert.equal(entry.revision, MOTSPET_REVISION);
    assert.ok(entry.authorityPaths.length > 0, `${entry.id} must carry authority`);
    assert.ok(entry.authorityPaths.every((path) => path.startsWith('docs/')));

    if (entry.reviewState === 'EXTERNAL_REVIEWED') {
      assert.ok(entry.reviewer?.trim());
      assert.ok(entry.reviewedAt?.trim());
      assert.ok(entry.reviewReceipt?.trim());
    }
  }
});

test('MotsPet prompt exposes controlled language but not HOLD wording', () => {
  const block = buildMotsPetPromptBlock();

  assert.match(block, /Contrat de langage MotsPet/);
  assert.match(block, new RegExp(MOTSPET_REVISION));
  assert.match(block, /observation/);
  assert.match(block, /niveau de confiance/);
  assert.doesNotMatch(block, /variation d’activation observée/);
});

test('Owner terminology preserves domain Owner vs French product Propriétaire split', () => {
  const ownerNote = getMotsPetEntry('owner_note');
  assert.ok(ownerNote);
  assert.equal(ownerNote.publicFr, 'note du propriétaire');
  assert.equal(ownerNote.publicEn, 'owner note');
  assert.ok(
    ownerNote.authorityPaths.includes(
      'docs/records/terminology/GUARDIAN_TO_OWNER_SUPERSESSION_2026-09-11.md',
    ),
  );
});

test('consent language is tied to data-governance authority, not a lexical guess', () => {
  const consent = getMotsPetEntry('consent');
  assert.ok(consent);
  assert.ok(
    consent.authorityPaths.includes(
      'docs/strategy/DATA_TRUST_AND_BUSINESS_MODEL_DOCTRINE_2026-09-07.md',
    ),
  );
  assert.ok(consent.prohibitedPublicTerms.includes('autorisation pour tout usage'));
});

test('sensitive activation/arousal wording remains authority HOLD', () => {
  const held = getMotsPetEntry('activation_change');
  assert.ok(held);
  assert.equal(held.status, 'HOLD');
  assert.equal(held.reviewState, 'AUTHORITY_HOLD');
  assert.equal(held.reviewer, null);
});


test('uncertainty is controlled as a bounded evidence qualifier, not reassurance', () => {
  const uncertainty = getMotsPetEntry('uncertainty');
  assert.ok(uncertainty);
  assert.equal(uncertainty.status, 'CONTROLLED_SEED');
  assert.equal(uncertainty.publicFr, 'incertitude');
  assert.equal(uncertainty.publicEn, 'uncertainty');
  assert.equal(uncertainty.requiresProvenance, true);
  assert.ok(uncertainty.prohibitedPublicTerms.includes('tout va bien'));
  assert.ok(
    uncertainty.authorityPaths.includes(
      'docs/control/EMOPET_PRODUCT_AUTHORITY_MAP_v0.1.md',
    ),
  );
});

test('trend is controlled only as named longitudinal change, never a global wellbeing trend', () => {
  const trend = getMotsPetEntry('trend');
  assert.ok(trend);
  assert.equal(trend.status, 'CONTROLLED_SEED');
  assert.equal(trend.publicFr, 'évolution longitudinale');
  assert.equal(trend.publicEn, 'longitudinal change');
  assert.equal(trend.requiresProvenance, true);
  assert.ok(trend.definitionFr.includes('observation nommée'));
  assert.ok(trend.definitionFr.includes('référence individuelle ou contextuelle'));
  assert.ok(trend.prohibitedPublicTerms.includes('tendance ELI globale'));
  assert.ok(trend.prohibitedPublicTerms.includes('bien-être en hausse'));
});


test('share scope is bounded by recipient, purpose and access window rather than blanket consent', () => {
  const shareScope = getMotsPetEntry('share_scope');
  assert.ok(shareScope);
  assert.equal(shareScope.status, 'CONTROLLED_SEED');
  assert.equal(shareScope.domain, 'privacy');
  assert.equal(shareScope.publicFr, 'périmètre de partage');
  assert.equal(shareScope.publicEn, 'sharing scope');
  assert.equal(shareScope.requiresProvenance, true);
  assert.ok(shareScope.definitionFr.includes('destinataire ou audience'));
  assert.ok(shareScope.definitionFr.includes('finalité'));
  assert.ok(shareScope.definitionFr.includes('fenêtre d’accès'));
  assert.ok(shareScope.definitionFr.includes('ni un consentement pour un autre usage'));
  assert.ok(shareScope.prohibitedPublicTerms.includes('accès illimité'));
  assert.ok(shareScope.prohibitedPublicTerms.includes('public par défaut'));
});

test('Moment stays private-first and cannot be minted from sensor or ELI interpretation', () => {
  const moment = getMotsPetEntry('moment');
  assert.ok(moment);
  assert.equal(moment.status, 'CONTROLLED_SEED');
  assert.equal(moment.domain, 'relationship');
  assert.equal(moment.publicFr, 'moment choisi');
  assert.equal(moment.publicEn, 'chosen moment');
  assert.equal(moment.requiresProvenance, true);
  assert.ok(moment.definitionFr.includes('Capture volontaire'));
  assert.ok(moment.definitionFr.includes('privé par défaut'));
  assert.ok(moment.definitionFr.includes('ne peut pas être créé automatiquement'));
  assert.ok(moment.prohibitedPublicTerms.includes('moment heureux détecté'));
  assert.ok(moment.prohibitedPublicTerms.includes('public automatiquement'));
});

test('Memory stays Owner-chosen relationship history rather than ELI sentiment', () => {
  const memory = getMotsPetEntry('memory');
  assert.ok(memory);
  assert.equal(memory.status, 'CONTROLLED_SEED');
  assert.equal(memory.domain, 'relationship');
  assert.equal(memory.publicFr, 'souvenir choisi');
  assert.equal(memory.publicEn, 'chosen memory');
  assert.equal(memory.requiresProvenance, true);
  assert.ok(memory.definitionFr.includes('propriétaire choisit explicitement'));
  assert.ok(memory.definitionFr.includes('ni une interprétation ELI'));
  assert.ok(memory.prohibitedPublicTerms.includes('souvenir généré automatiquement'));
  assert.ok(memory.prohibitedPublicTerms.includes('preuve de lien'));
  assert.ok(memory.prohibitedPublicTerms.includes('score de relation'));
});

test('explicit preference stays Owner-declared and never becomes dog-state or relationship inference', () => {
  const preference = getMotsPetEntry('explicit_preference');
  assert.ok(preference);
  assert.equal(preference.status, 'CONTROLLED_SEED');
  assert.equal(preference.domain, 'relationship');
  assert.equal(preference.publicFr, 'préférence déclarée');
  assert.equal(preference.publicEn, 'explicit preference');
  assert.equal(preference.requiresProvenance, true);
  assert.ok(preference.definitionFr.includes('déclaré ou confirmé par le propriétaire'));
  assert.ok(preference.definitionFr.includes('ne constitue pas une inférence'));
  assert.ok(preference.prohibitedPublicTerms.includes('le chien préfère'));
  assert.ok(preference.prohibitedPublicTerms.includes('score de relation'));
});
