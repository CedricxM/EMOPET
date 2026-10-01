/**
 * Tests du moteur d'ancrage régional (Section 9 + critères PATCH).
 * Exécution : depuis apps/web → `node --import tsx --test lib/regional/__tests__/regional.test.ts`
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildAssistantSystemPrompt } from '../build-system-prompt';
import { detectRegion } from '../detect-region';
import { MAX_KNOWLEDGE_TOKENS, estimateTokens, filterRelevantKnowledge } from '../filter-knowledge';
import { shouldInitiate } from '../initiate';
import { BRETAGNE_KNOWLEDGE, BRETAGNE_PROFILE } from '../profiles/bretagne';
import { TEST_REGION_KNOWLEDGE, TEST_REGION_PROFILE } from '../profiles/test-region';
import type { RegionalKnowledgeBase } from '../knowledge-types';

test('buildAssistantSystemPrompt injecte le nom régional', () => {
  const built = buildAssistantSystemPrompt(BRETAGNE_PROFILE, BRETAGNE_KNOWLEDGE, {
    userMessage: 'bonjour', touchesEliData: false,
  });
  assert.match(built.prompt, /Breiz/);
  assert.match(built.prompt, /bretagne/);
});

test('le filtrage exclut les entrées PENDING_VERIFIED_CONTENT', () => {
  const filtered = filterRelevantKnowledge('lieux balade à vérifier traditions', BRETAGNE_KNOWLEDGE, { maxEntries: 6 });
  const all = [...filtered.geography, ...filtered.culture];
  assert.ok(all.every((e) => e._status !== 'PENDING_VERIFIED_CONTENT'), 'aucune entrée PENDING injectée');
});

test('les entrées EXEMPLE_DEMO ne sont jamais injectées comme connaissance réelle', () => {
  const filtered = filterRelevantKnowledge(
    'le festival interceltique de Lorient',
    BRETAGNE_KNOWLEDGE,
    { maxEntries: 6 },
  );
  assert.equal(filtered.culture.length, 0);
});

test('une entrée VERIFIED avec preuve structurée peut être injectée', () => {
  const verified: RegionalKnowledgeBase = {
    regionId: 'bretagne',
    geographyEntries: [],
    cultureEntries: [
      {
        id: 'cult_verified_fixture',
        theme: 'autre',
        title: 'Repère culturel vérifié',
        description: 'Contenu synthétique de test sur un repère régional.',
        sourceVerified: true,
        evidence: {
          sourceId: 'fixture-source',
          sourceRef: 'fixture-record-001',
          reviewerRole: 'test reviewer',
          reviewedAt: '2026-09-30T10:00:00Z',
          provenanceNote: 'Synthetic test evidence only.',
        },
        _status: 'VERIFIED',
      },
    ],
    rhythmSources: [],
  };

  const filtered = filterRelevantKnowledge('repère culturel vérifié', verified, {
    maxEntries: 6,
  });
  assert.deepEqual(filtered.culture.map((entry) => entry.id), ['cult_verified_fixture']);
});

test('détection région : département → profil', () => {
  assert.equal(detectRegion({ department: '29' }).profile.regionId, 'bretagne');
});

test('détection région : 44 rattaché à la Bretagne (PATCH 6)', () => {
  const r = detectRegion({ department: '44' });
  assert.equal(r.profile.regionId, 'bretagne');
  assert.equal(r.isDefault, false);
});

test('détection région : fallback national neutre si rien', () => {
  const r = detectRegion({});
  assert.equal(r.profile.regionId, 'neutral_france');
  assert.equal(r.profile.assistantName, 'EMOPET');
  assert.equal(r.isDefault, true);
  assert.ok(r.invitation);
});

test('garde-fou médical : touchesEliData → chemin verrouillé', () => {
  const locked = buildAssistantSystemPrompt(BRETAGNE_PROFILE, BRETAGNE_KNOWLEDGE, {
    userMessage: 'quel est le score ELI de repos ?', touchesEliData: true,
  });
  assert.match(locked.prompt, /VERROUILLÉ/);
  assert.match(locked.prompt, /strictement factuel/);
  // Jamais d'autorisation de moduler le ton sur la donnée.
  assert.doesNotMatch(locked.prompt, /module[rs]? ton ton sur la donnée/i);
});

test('garde-fou anti-classement : règle présente, aucune logique de classement social', () => {
  const built = buildAssistantSystemPrompt(BRETAGNE_PROFILE, BRETAGNE_KNOWLEDGE, {
    userMessage: 'salut', touchesEliData: false,
  });
  assert.match(built.prompt, /ne CLASSES JAMAIS/);
  for (const forbidden of [/adapte.{0,20}selon (le|la) (statut|niveau social|cat[ée]gorie)/i, /r[ée]serve.{0,20}cat[ée]gorie/i]) {
    assert.doesNotMatch(built.prompt, forbidden);
  }
});

test('plafond de tokens : la connaissance reste sous MAX_KNOWLEDGE_TOKENS', () => {
  // KB synthétique avec beaucoup d'entrées vérifiées qui matchent toutes "plage".
  const big: RegionalKnowledgeBase = {
    regionId: 'bretagne',
    geographyEntries: Array.from({ length: 40 }, (_, i) => ({
      id: `g${i}`, name: `Plage numéro ${i}`, type: 'plage' as const, department: '29',
      description: 'Plage de Bretagne avec une longue description '.repeat(8),
      sourceVerified: true,
      evidence: {
        sourceId: 'synthetic-test-source',
        sourceRef: `synthetic-geo-${i}`,
        reviewerRole: 'test reviewer',
        reviewedAt: '2026-09-30T10:00:00Z',
        provenanceNote: 'Synthetic test evidence only.',
      },
      _status: 'VERIFIED' as const,
    })),
    cultureEntries: [],
    rhythmSources: [],
  };
  const built = buildAssistantSystemPrompt(BRETAGNE_PROFILE, big, { userMessage: 'plage', touchesEliData: false }, { maxEntries: 40 });
  assert.ok(built.knowledgeTokens <= MAX_KNOWLEDGE_TOKENS, `knowledgeTokens=${built.knowledgeTokens} <= ${MAX_KNOWLEDGE_TOKENS}`);
  assert.ok(estimateTokens('abcd') === 1);
});

test('shouldInitiate : conservateur (toutes conditions requises)', () => {
  const base = { idleMinutes: 15, hasEvokedRegionalEntry: false, hasRelevantVerifiedEntry: true, initiativeEnabled: true };
  assert.equal(shouldInitiate(base), true);
  assert.equal(shouldInitiate({ ...base, idleMinutes: 2 }), false);
  assert.equal(shouldInitiate({ ...base, hasEvokedRegionalEntry: true }), false);
  assert.equal(shouldInitiate({ ...base, hasRelevantVerifiedEntry: false }), false);
  assert.equal(shouldInitiate({ ...base, initiativeEnabled: false }), false);
});

test('duplication : le moteur fonctionne sur une région fictive sans modification', () => {
  const verifiedTestKnowledge: RegionalKnowledgeBase = {
    ...TEST_REGION_KNOWLEDGE,
    geographyEntries: TEST_REGION_KNOWLEDGE.geographyEntries.map((entry) => ({
      ...entry,
      sourceVerified: true,
      _status: 'VERIFIED' as const,
      evidence: {
        sourceId: 'synthetic-test-source',
        sourceRef: 'synthetic-test-record',
        reviewerRole: 'test reviewer',
        reviewedAt: '2026-09-30T10:00:00Z',
        provenanceNote: 'Synthetic test evidence only.',
      },
    })),
  };
  const built = buildAssistantSystemPrompt(TEST_REGION_PROFILE, verifiedTestKnowledge, {
    userMessage: 'Testville', touchesEliData: false,
  });
  assert.match(built.prompt, /Testig/);
  assert.match(built.prompt, /test_region/);
  assert.ok(built.usedGeography >= 1);
});
