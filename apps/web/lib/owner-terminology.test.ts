import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const frenchRoleWord = /\bgardiens?\b/iu;
const englishRoleWord = /\bguardians?\b/iu;

test('active French owner-facing landing copy uses Propriétaire terminology', async () => {
  const landing = await readFile(new URL('../app/page.tsx', import.meta.url), 'utf8');

  assert.match(landing, /aide les propriétaires à mieux comprendre/);
  assert.match(landing, /Notes du propriétaire/);
  assert.match(landing, /Rejoignez les premiers propriétaires qui testent EMOPET/);
  assert.doesNotMatch(landing, frenchRoleWord);
});

test('Breiz conversation uses the canonical Owner implementation role', async () => {
  const conversation = await readFile(
    new URL('../components/landing/BreizConversation.tsx', import.meta.url),
    'utf8',
  );

  assert.match(conversation, /sender: 'breiz' \| 'owner'/);
  assert.match(conversation, /sender: 'owner'/);
  assert.doesNotMatch(conversation, frenchRoleWord);
});

test('current reference docs use Owner terminology for the dog owner role', async () => {
  const [readme, architecture, assetBrief] = await Promise.all([
    readFile(new URL('../../../README.md', import.meta.url), 'utf8'),
    readFile(new URL('../../../docs/architecture/system_overview.md', import.meta.url), 'utf8'),
    readFile(new URL('../ASSETS_REQUIRED_FOR_FINAL_SITE.md', import.meta.url), 'utf8'),
  ]);

  assert.match(readme, /Owner-to-dog access/);
  assert.doesNotMatch(readme, englishRoleWord);
  assert.doesNotMatch(architecture, englishRoleWord);
  assert.doesNotMatch(assetBrief, englishRoleWord);
});

test('canonical product and strategy authorities use Owner without turning delegates into owners', async () => {
  const [
    care,
    ownerDoctrine,
    ownerAuthority,
    ownerContinuity,
    strategyIndex,
    together,
    memories,
    inferenceGuardrails,
    careUiMap,
  ] = await Promise.all([
    readFile(new URL('../../../docs/product/EMOPET_CARE_PRODUCT_MASTER_v0.1.md', import.meta.url), 'utf8'),
    readFile(new URL('../../../docs/strategy/OWNER_RELATIONSHIP_AND_PRODUCT_SCOPE_DOCTRINE_2026-09-11.md', import.meta.url), 'utf8'),
    readFile(new URL('../../../docs/product/EMOPET_OWNER_AUTHORITY_MASTER_v0.1.md', import.meta.url), 'utf8'),
    readFile(new URL('../../../docs/product/EMOPET_OWNER_CONTINUITY_MASTER_v0.1.md', import.meta.url), 'utf8'),
    readFile(new URL('../../../docs/strategy/STRATEGY_MEMORY_INDEX.md', import.meta.url), 'utf8'),
    readFile(new URL('../../../docs/product/EMOPET_TOGETHER_RELATIONSHIP_ENGINE_MASTER_v0.1.md', import.meta.url), 'utf8'),
    readFile(new URL('../../../docs/product/EMOPET_MEMORIES_EXPERIENCE_MASTER_v0.1.md', import.meta.url), 'utf8'),
    readFile(new URL('../../../docs/strategy/INFERENCE_CONTEXT_AND_BREED_GUARDRAILS_2026-09-07.md', import.meta.url), 'utf8'),
    readFile(new URL('../../../docs/product/CARE_UI_MIGRATION_MAP_2026-09-07.md', import.meta.url), 'utf8'),
  ]);

  assert.doesNotMatch(care, englishRoleWord);
  assert.match(ownerDoctrine, /OWNER_DOG_RELATIONSHIP/);
  assert.match(ownerDoctrine, /Delegated access does not make a person an Owner/);
  assert.doesNotMatch(ownerDoctrine, /The Guardian|Guardian journal|dog or Guardian/iu);

  assert.match(ownerAuthority, /PRIMARY_OWNER/);
  assert.match(ownerAuthority, /TRUSTED_CAREGIVER/);
  assert.doesNotMatch(ownerAuthority, /PRIMARY_GUARDIAN|TRUSTED_GUARDIAN|The Guardian/iu);

  assert.match(ownerContinuity, /Owner Continuity/);
  assert.match(ownerContinuity, /Owner–dog relationship/);
  assert.doesNotMatch(ownerContinuity, /Guardian Continuity/iu);

  assert.match(strategyIndex, /Owner relationship authority/);
  assert.match(strategyIndex, /Detailed Owner access model/);
  assert.match(strategyIndex, /Owner Continuity/);
  assert.doesNotMatch(strategyIndex, englishRoleWord);

  assert.match(together, /SOLO_OWNER_DOG/);
  assert.doesNotMatch(together, englishRoleWord);
  assert.match(memories, /Owner–dog relationship/);
  assert.doesNotMatch(memories, englishRoleWord);
  assert.match(inferenceGuardrails, /Owner report is a separate evidence class/);
  assert.doesNotMatch(inferenceGuardrails, englishRoleWord);
  assert.match(careUiMap, /Owner-note separation/);
  assert.doesNotMatch(careUiMap, englishRoleWord);
});
