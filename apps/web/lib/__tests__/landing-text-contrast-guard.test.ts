/**
 * Garde de contraste — texte ordinaire de la landing.
 *
 * La QA rendue de #714 avait laissé 26 échecs hors mentions de maturité :
 * texte secondaire trop clair, accents turquoise utilisés comme texte, CTA
 * blancs sur fonds trop clairs et placeholder insuffisamment contrasté.
 *
 * Cette garde ne prétend pas rendre la page. Elle verrouille les couples
 * corrigés et refuse le retour des combinaisons source déjà mesurées en échec.
 */

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const webRoot = fileURLToPath(new URL('../../', import.meta.url));

function read(...parts: string[]): string {
  return readFileSync(path.join(webRoot, ...parts), 'utf8');
}

function landingSources(): Array<{ path: string; source: string }> {
  const out: Array<{ path: string; source: string }> = [
    { path: 'app/page.tsx', source: read('app', 'page.tsx') },
  ];
  const dir = path.join(webRoot, 'components', 'landing');
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.tsx')) continue;
    out.push({
      path: `components/landing/${name}`,
      source: read('components', 'landing', name),
    });
  }
  return out;
}

function channel(value: number): number {
  const v = value / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * channel(r!) + 0.7152 * channel(g!) + 0.0722 * channel(b!);
}

function contrast(fg: string, bg: string): number {
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

test('les couples de remplacement gardent au moins 4.5:1', () => {
  const pairs = [
    ['ardoise sur sable', '#5A6570', '#F4EFE6'],
    ['ardoise sur blanc', '#5A6570', '#FFFFFF'],
    ['lichen sombre sur vert pâle', '#4F6F53', '#E3EAE4'],
    ['lichen sombre sur sable clair', '#4F6F53', '#FAF7F1'],
    ['pierre sur footer granit', '#D8D0C2', '#141C25'],
    ['blanc sur terre cuite sombre', '#FFFFFF', '#A65E3F'],
    ['blanc sur lichen sombre', '#FFFFFF', '#4F6F53'],
    ['blanc sur granit hover', '#FFFFFF', '#1F2A36'],
  ] as const;

  for (const [label, fg, bg] of pairs) {
    const ratio = contrast(fg, bg);
    assert.ok(ratio >= 4.5, `${label}: ${ratio.toFixed(2)}:1 < 4.5:1`);
  }
});

test('les combinaisons de texte déjà mesurées en échec ne reviennent pas', () => {
  const forbidden = [
    /text-\[#6B7684\]/,
    /text-\[#1E9A90\]/,
    /text-\[#2CB7AB\]/,
    /text-\[#A8BCAC\]/,
    /text-\[#9B5A3E\]/,
    /bg-\[#B46A4A\]\s+text-white/,
    /bg-\[#2CB7AB\]\s+text-white/,
    /placeholder-\[#C6BBA4\]/,
    /hover:text-\[#B46A4A\]/,
    /hover:bg-\[#1E9A90\]/,
    /focus:ring-\[#2CB7AB\]/,
  ];

  for (const file of landingSources()) {
    for (const pattern of forbidden) {
      assert.doesNotMatch(
        file.source,
        pattern,
        `${file.path} réintroduit une combinaison de contraste déjà mesurée en échec: ${pattern}`,
      );
    }
  }
});

test('les remplacements restent présents dans les surfaces qui en ont besoin', () => {
  const page = read('app', 'page.tsx');
  const footer = read('components', 'landing', 'LandingFooter.tsx');
  const breiz = read('components', 'landing', 'BreizConversation.tsx');
  const mockup = read('components', 'landing', 'AppMockup.tsx');

  assert.match(page, /bg-\[#A65E3F\]\s+text-white/);
  assert.match(page, /bg-\[#4F6F53\]\s+text-white/);
  assert.match(page, /placeholder-\[#5A6570\]/);
  assert.match(footer, /text-\[#D8D0C2\]/);
  assert.match(breiz, /text-\[#4F6F53\]/);
  assert.match(mockup, /text-\[#4F6F53\]/);
});
