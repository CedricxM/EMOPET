import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const webRoot = fileURLToPath(new URL('../../', import.meta.url));

function read(...parts: string[]): string {
  return readFileSync(path.join(webRoot, ...parts), 'utf8');
}

test('the global anchor reset stays lower-specificity than explicit color utilities', () => {
  const globals = read('styles', 'globals.css');

  assert.match(globals, /:where\(a\)\s*\{\s*color:\s*inherit;/);
  assert.doesNotMatch(globals, /(?:^|\n)\s*a\s*\{\s*color:\s*inherit;/);
});

test('rendered contrast follow-ups use robust foreground tokens', () => {
  const scene = read('components', 'world', 'world-scene.module.css');
  const builder = read('components', 'world', 'world-builder.module.css');
  const tags = read('components', 'breiz', 'BreizMessageTags.tsx');

  assert.match(scene, /\.sceneCaption span\s*\{[^}]*color:\s*var\(--cream-50\)/s);
  assert.match(builder, /\.heroLead\s*\{[^}]*color:\s*var\(--cream-50\)/s);
  assert.match(tags, /const TAG_STYLE = \{[\s\S]*?color:\s*'var\(--fg-2\)'/);
});
