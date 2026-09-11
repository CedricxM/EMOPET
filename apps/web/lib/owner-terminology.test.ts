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
