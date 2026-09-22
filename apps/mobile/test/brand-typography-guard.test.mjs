/**
 * #238 regression guard — mobile runtime typography must stay on the controlled
 * brand authority.
 *
 * This checks the two files that decide what actually renders: the token
 * declarations and the `useFonts` registration. It deliberately does NOT assert
 * that `@expo-google-fonts/source-sans-3` is absent from package.json: the
 * legacy `App.v04.tsx` root (not the `expo-router/entry` main) still imports it,
 * and retiring that historical artefact is a separate decision.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (rel) => readFile(new URL(rel, import.meta.url), 'utf8');

const typography = await read('../src/theme/typography.ts');
const layout = await read('../app/_layout.tsx');
const textPrimitives = await read('../src/components/ui/text.tsx');
const pkg = JSON.parse(await read('../package.json'));

/** Native (ios/android) family names declared in the token file. */
function declaredNativeFamilies(source) {
  return [...source.matchAll(/\b(?:ios|android):\s*'([^']+)'/g)].map((m) => m[1]);
}

/** Alias keys registered in the `brandFonts` map. */
function registeredAliases(source) {
  const block = source.match(/const brandFonts = \{([\s\S]*?)\n\};/);
  assert.ok(block, '_layout.tsx must declare a brandFonts map');
  return [...block[1].matchAll(/^\s*'?([A-Za-z][A-Za-z0-9-]*)'?:/gm)].map((m) => m[1]);
}

test('the superseded body family cannot return to the live mobile runtime', () => {
  for (const [name, source] of [
    ['src/theme/typography.ts', typography],
    ['app/_layout.tsx', layout],
    ['src/components/ui/text.tsx', textPrimitives],
  ]) {
    assert.ok(!/SourceSans3|Source Sans|source-sans/.test(source), `${name} still references the superseded body family`);
  }
});

test('body tokens declare Instrument Sans on every native platform', () => {
  for (const token of ['sans', 'sansMedium', 'sansSemi', 'sansBold']) {
    const block = typography.match(new RegExp(`${token}: Platform\\.select\\(\\{([\\s\\S]*?)\\}\\)`));
    assert.ok(block, `missing token: ${token}`);
    const families = declaredNativeFamilies(block[1]);
    assert.equal(families.length, 2, `${token} must declare both ios and android`);
    for (const family of families) {
      assert.match(family, /^InstrumentSans-(Regular|Medium|SemiBold|Bold)$/, `${token} -> ${family}`);
    }
    // The human family name stays in this stack as a fallback behind the
    // registered alias; the leading entry is asserted by the web test below.
    const web = block[1].match(/web: '([^']+)'/);
    assert.ok(web, `${token} must declare a web stack`);
    assert.ok(
      web[1].includes('"Instrument Sans"'),
      `${token} web stack must keep "Instrument Sans" as a fallback`,
    );
  }
});

test('every native family the tokens declare is actually registered by useFonts', () => {
  const aliases = new Set(registeredAliases(layout));
  // 'System' and platform monospace are OS fallbacks, not loaded assets.
  const osProvided = new Set(['System', 'monospace', 'Menlo']);
  const declared = declaredNativeFamilies(typography).filter((f) => !osProvided.has(f));
  assert.ok(declared.length > 0, 'expected at least one loaded family');
  for (const family of declared) {
    assert.ok(aliases.has(family), `typography.ts declares '${family}' but _layout.tsx does not register it`);
  }
});

test('every web stack leads with a family useFonts actually registers', () => {
  // expo-font emits `@font-face{font-family:<useFonts key>}` on web
  // (_createWebFontTemplate), so a web stack that leads with the human family
  // name matches nothing and falls back to the system font. mono is the one
  // deliberate exception: loading JetBrains Mono is outside #238.
  const aliases = new Set(registeredAliases(layout));
  const tokens = ['serif', 'sans', 'sansMedium', 'sansSemi', 'sansBold'];
  for (const token of tokens) {
    const block = typography.match(new RegExp(`${token}: Platform\\.select\\(\\{([\\s\\S]*?)\\}\\)`));
    assert.ok(block, `missing token: ${token}`);
    const web = block[1].match(/web: '([^']+)'/);
    assert.ok(web, `${token} must declare a web stack`);
    const first = web[1].match(/^"([^"]+)"/);
    assert.ok(first, `${token} web stack must lead with a quoted family`);
    assert.ok(
      aliases.has(first[1]),
      `${token} web stack leads with '${first[1]}', which _layout.tsx does not register`,
    );
  }
});

test('Fraunces display and native monospace behaviour are preserved', () => {
  assert.match(typography, /serif: Platform\.select\(\{\s*ios: 'Fraunces'/);
  assert.match(layout, /Fraunces: Fraunces_600SemiBold/);
  // mono stays on the platform monospace on native; loading JetBrains Mono
  // there is outside #238 and must not be silently introduced by this guard.
  assert.match(typography, /mono: Platform\.select\(\{\s*ios: 'Menlo',\s*android: 'monospace'/);
});

test('the Instrument Sans package is declared as a dependency', () => {
  assert.ok(
    pkg.dependencies['@expo-google-fonts/instrument-sans'],
    'package.json must declare @expo-google-fonts/instrument-sans',
  );
});
