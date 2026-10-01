import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  auditBretagneLanguageReviewPacket,
  buildBretagneLanguageReviewPacket,
} from '../bretagne-language-review-packet';
import { REGIONAL_LEXICON } from '../regional-lexicon';
import { BRETAGNE_PROFILE } from '../profiles/bretagne';

test('Bretagne review packet is derived from the exact live identity claims', () => {
  const packet = buildBretagneLanguageReviewPacket();

  assert.equal(packet.status, 'DRAFT_NOT_SENT');
  assert.equal(packet.regionId, 'bretagne');
  assert.equal(packet.identity.assistantName, BRETAGNE_PROFILE.assistantName);
  assert.equal(
    packet.identity.assistantNameOrigin,
    BRETAGNE_PROFILE.assistantNameOrigin,
  );
  assert.equal(packet.identity.namingRule, BRETAGNE_PROFILE.namingRule);
  assert.deepEqual(auditBretagneLanguageReviewPacket(packet), []);
});

test('Bretagne review packet contains every current regional lexicon item exactly once', () => {
  const packet = buildBretagneLanguageReviewPacket();
  const runtime = REGIONAL_LEXICON.filter(
    (entry) => entry.regionId === 'bretagne',
  );

  assert.equal(packet.lexicon.length, runtime.length);
  assert.deepEqual(
    packet.lexicon.map((entry) => entry.itemId).sort(),
    runtime.map((entry) => entry.id).sort(),
  );

  for (const entry of runtime) {
    const reviewItem = packet.lexicon.find(
      (item) => item.itemId === entry.id,
    );
    assert.ok(reviewItem);
    assert.equal(reviewItem.term, entry.term);
    assert.equal(reviewItem.meaningFr, entry.meaningFr);
    assert.equal(reviewItem.usage, entry.usage);
    assert.equal(reviewItem.lexiconRevision, entry.revision);
  }
});

test('Bretagne review packet remains deliberately tiny and contains the first review set', () => {
  const packet = buildBretagneLanguageReviewPacket();

  assert.deepEqual(
    packet.lexicon.map((entry) => entry.itemId).sort(),
    ['bretagne_ar_veute', 'bretagne_demat'],
  );
  assert.equal(packet.identity.itemId, 'bretagne_companion_identity');
});

test('every review item has one bounded response template', () => {
  const packet = buildBretagneLanguageReviewPacket();
  const expected = [
    packet.identity.itemId,
    ...packet.lexicon.map((entry) => entry.itemId),
  ].sort();

  assert.deepEqual(
    packet.responseTemplates.map((entry) => entry.itemId).sort(),
    expected,
  );

  for (const template of packet.responseTemplates) {
    assert.deepEqual(template.requestedDisposition, [
      'APPROVED',
      'APPROVED_WITH_CONDITIONS',
      'REJECTED',
    ]);
    assert.ok(template.requiredFields.includes('evidence_reference'));
    assert.ok(template.requiredFields.includes('conditions_or_restrictions'));
    assert.ok(
      template.requiredFields.includes('attribution_or_reuse_requirements'),
    );
  }
});

test('review packet audit detects identity and lexicon drift', () => {
  const packet = buildBretagneLanguageReviewPacket();

  assert.ok(
    auditBretagneLanguageReviewPacket({
      ...packet,
      identity: {
        ...packet.identity,
        assistantNameOrigin: 'Edited after packet generation',
      },
    }).includes('identity assistantNameOrigin drift'),
  );

  assert.ok(
    auditBretagneLanguageReviewPacket({
      ...packet,
      lexicon: packet.lexicon.map((entry) =>
        entry.itemId === 'bretagne_demat'
          ? { ...entry, term: 'Edited after packet generation' }
          : entry,
      ),
    }).includes('bretagne_demat: term drift'),
  );
});

test('packet contains no contact data or partnership/approval claim', () => {
  const packet = buildBretagneLanguageReviewPacket();
  const serialized = JSON.stringify(packet).toLowerCase();

  assert.doesNotMatch(serialized, /email|telephone|phone|contact@/);
  assert.doesNotMatch(serialized, /"partner":true|"partnership":true/);
  assert.doesNotMatch(serialized, /"status":"approved"/);
});
