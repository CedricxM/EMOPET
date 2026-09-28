/** Breiz transparency regression guards scoped to PR #688. */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const web = (rel: string) => readFileSync(new URL(`../../../${rel}`, import.meta.url), 'utf8');

test('shared message tags always disclose AI and render declared evidence metadata', () => {
  const tags = web('components/breiz/BreizMessageTags.tsx');
  assert.match(tags, /<span style=\{TAG_STYLE\}>IA<\/span>/);
  assert.match(tags, /message\.demo/);
  assert.match(tags, /message\.transparency\?\.evidenceLevel/);
  assert.match(tags, /EVIDENCE_LABELS\[message\.transparency\.evidenceLevel\]/);
});

test('the web chat hook preserves transparency metadata from API and local fallback', () => {
  const hook = web('lib/breiz-rag/useBreizChat.ts');
  for (const field of ['via', 'sources', 'transparency']) assert.match(hook, new RegExp(field));
  assert.match(hook, /askBreiz/);
});

test('the model path does not cite the assistant itself as a source', () => {
  const route = web('app/api/breiz/route.ts');
  assert.doesNotMatch(route, /ancrage \$\{/);
  assert.match(route, /via: 'model'[\s\S]*?sources: \[\]/);
});
