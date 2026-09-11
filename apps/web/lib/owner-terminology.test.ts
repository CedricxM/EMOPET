import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const roleWord = /\bgardiens?\b/iu;

test('active French owner-facing landing copy uses Propriétaire terminology', async () => {
  const landing = await readFile(new URL('../app/page.tsx', import.meta.url), 'utf8');

  assert.match(landing, /aide les propriétaires à mieux comprendre/);
  assert.match(landing, /Notes du propriétaire/);
  assert.match(landing, /Rejoignez les premiers propriétaires qui testent EMOPET/);
  assert.doesNotMatch(landing, roleWord);
});

test('Breiz conversation uses the canonical Owner implementation role', async () => {
  const conversation = await readFile(
    new URL('../components/landing/BreizConversation.tsx', import.meta.url),
    'utf8',
  );

  assert.match(conversation, /sender: 'breiz' \| 'owner'/);
  assert.match(conversation, /sender: 'owner'/);
  assert.doesNotMatch(conversation, roleWord);
});
