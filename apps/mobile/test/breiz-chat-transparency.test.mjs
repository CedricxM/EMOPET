/**
 * #226 Breiz transparency audit (2026-09-27) — the mobile chat tab must name
 * the AI and must not let a message look answered when no engine is wired.
 * See docs/compliance/BREIZ_TRANSPARENCY_AUDIT_2026-09-27.md.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const chat = await readFile(new URL('../app/(tabs)/chat.tsx', import.meta.url), 'utf8');

test('the chat tab discloses the AI in its header and above the composer', () => {
  assert.match(chat, /Assistant IA · tonalité \{effective\}/);
  assert.match(chat, /Breiz est une IA\. Les réponses ne sont pas encore disponibles/);
});

test('the chat tab shows no tone setting as a source', () => {
  assert.doesNotMatch(chat, /sources: 'Profil ·/);
});

test('D6: the legacy App.v04 chat marks its sensor-like sources and attributes no intent', async () => {
  const legacy = await readFile(new URL('../src/screens/ChatScreen.tsx', import.meta.url), 'utf8');
  assert.match(legacy, /Assistant IA/);
  assert.doesNotMatch(legacy, /anticipation|rien d'alarmant|sources: 'Profil ·/);
  for (const [, source] of legacy.matchAll(/sources: '([^']*)'/g)) assert.match(source, /^DÉMO · /, source);
});

test('sending still produces no fabricated reply', () => {
  const send = chat.slice(chat.indexOf('const send = () =>'), chat.indexOf('return ('));
  assert.doesNotMatch(send, /from: 'bleiz'/);
});
