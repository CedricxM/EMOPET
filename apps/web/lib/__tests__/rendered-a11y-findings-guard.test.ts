/**
 * Regression guard for rendered Chrome findings from PR #810.
 *
 * This test does not replace browser QA. It locks the source-level remedies
 * chosen after the browser probe found:
 * - landing CTA text below AA on the complex hero/nav surface;
 * - alpha-dimmed World copy below/near AA;
 * - Breiz transparency tags just under 4.5:1;
 * - the quartier opt-in wrapping label below 24 CSS px high.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const webRoot = fileURLToPath(new URL('../../', import.meta.url));
const read = (relative: string) => readFileSync(path.join(webRoot, relative), 'utf8');

test('landing CTAs keep the deeper rendered-safe terracotta background', () => {
  const nav = read('components/landing/LandingNav.tsx');
  const page = read('app/page.tsx');

  assert.doesNotMatch(nav, /bg-\[#A65E3F\]\s+text-white/);
  assert.doesNotMatch(page, /bg-\[#A65E3F\]\s+text-white/);
  assert.match(nav, /bg-\[#814931\]\s+text-white/);
  assert.match(page, /bg-\[#814931\]\s+text-white/);
});

test('World copy measured on gradients is not alpha-dimmed', () => {
  const builder = read('components/world/world-builder.module.css');
  const scene = read('components/world/world-scene.module.css');

  assert.match(builder, /\.heroLead[\s\S]*?color:\s*var\(--cream-50\);/);
  assert.match(scene, /\.sceneCaption span[\s\S]*?color:\s*var\(--cream-50\);/);
});

test('Breiz transparency tags use the stronger foreground token', () => {
  const tags = read('components/breiz/BreizMessageTags.tsx');

  assert.match(tags, /color:\s*'var\(--fg-2\)'/);
  assert.doesNotMatch(tags, /color:\s*'var\(--fg-muted\)'/);
});

test('quartier opt-in wrapping label preserves a 24px minimum target height', () => {
  const quartier = read('app/quartier/page.tsx');

  assert.match(
    quartier,
    /<label style=\{\{[^}]*minHeight:\s*24[^}]*\}\}>[\s\S]*?<input type="checkbox"/,
  );
});
