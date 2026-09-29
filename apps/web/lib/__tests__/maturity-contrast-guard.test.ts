/**
 * Garde : les mentions de maturité et la limite clinique de la page d'accueil
 * doivent rester lisibles.
 *
 * POURQUOI CELLE-CI EXISTE. Mesuré au navigateur sur la page servie : les onze
 * mentions de maturité de la page d'accueil échouaient TOUTES au contraste AA
 * (WCAG 2.2 §1.4.3), « CONCEPT VISUAL » à 1,66. Les affirmations de la page
 * étaient lisibles ; les réserves ne l'étaient pas.
 *
 * CE QUE CE TEST NE FAIT PAS. Il ne parcourt aucune page et ne rend rien. La
 * preuve du « avant / après » est dans la PR : 11 → 0, mesuré au navigateur,
 * sonde vérifiée en négatif.
 *
 * CE QUE CE TEST FAIT. Il recalcule le ratio de contraste WCAG à partir des
 * couples couleur/fond déclarés dans `components/landing/maturity-labels.ts` et
 * échoue si l'un repasse sous 4,5. Vérifier les VALEURS et non les noms : le
 * dépôt a déjà connu des tokens dont le nom disait terre cuite et la valeur
 * disait orange. Un nom ne prouve pas une couleur ; un ratio, si.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const SOURCE = join(process.cwd(), 'components', 'landing', 'maturity-labels.ts');

function channelLuminance(value: number): number {
  const v = value / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * channelLuminance(r!) + 0.7152 * channelLuminance(g!) + 0.0722 * channelLuminance(b!);
}

function contrast(fg: string, bg: string): number {
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Extrait `text-[#xxxxxx]` et `bg-[#xxxxxx]` de la valeur d'une constante. */
function colorsOf(source: string, name: string): { fg: string; bg: string | null } {
  const m = source.match(new RegExp(`export const ${name}\\s*=\\s*'([^']*)'`));
  assert.ok(m, `constante ${name} introuvable — à vérifier avant de toucher à cette garde`);
  const fg = m[1]!.match(/text-\[(#[0-9A-Fa-f]{6})\]/);
  const bg = m[1]!.match(/bg-\[(#[0-9A-Fa-f]{6})\]/);
  assert.ok(fg, `${name} ne déclare plus de couleur de texte`);
  return { fg: fg[1]!, bg: bg ? bg[1]! : null };
}

/**
 * Fonds effectifs des mentions qui n'embarquent pas le leur. Mesurés au
 * navigateur sur la page servie, pas devinés depuis la source.
 */
const AMBIENT: Record<string, { bg: string; where: string }[]> = {
  MATURITY_CAPTION: [
    { bg: '#FAF7F1', where: 'légende « CONCEPT VISUAL », scène MAT' },
    { bg: '#F4EFE6', where: 'légende « CONCEPT VISUAL », scène TAG' },
  ],
  MATURITY_FOOTNOTE: [{ bg: '#141C25', where: 'pied de page' }],
  CLINICAL_BOUNDARY: [{ bg: '#F4EFE6', where: 'limite non médicale, scène vétérinaire' }],
};

const AA_NORMAL = 4.5;

test('les pastilles de maturité portent leur propre fond et passent AA', () => {
  for (const name of ['MATURITY_PILL_PLANNED', 'MATURITY_PILL_IN_PROGRESS']) {
    const src = readFileSync(SOURCE, 'utf8');
    const { fg, bg } = colorsOf(src, name);
    assert.ok(bg, `${name} doit déclarer son fond : sans lui le ratio n'est pas calculable`);
    const ratio = contrast(fg, bg);
    assert.ok(
      ratio >= AA_NORMAL,
      `${name} : ${fg} sur ${bg} = ${ratio.toFixed(2)}, sous le seuil AA de ${AA_NORMAL}. ` +
        "C'est une mention de maturité : illisible, elle ne remplit plus son office.",
    );
  }
});

test('les mentions sans fond propre passent AA sur chacun de leurs fonds réels', () => {
  const src = readFileSync(SOURCE, 'utf8');
  for (const [name, spots] of Object.entries(AMBIENT)) {
    const { fg } = colorsOf(src, name);
    for (const { bg, where } of spots) {
      const ratio = contrast(fg, bg);
      assert.ok(
        ratio >= AA_NORMAL,
        `${name} (${where}) : ${fg} sur ${bg} = ${ratio.toFixed(2)}, sous ${AA_NORMAL}.`,
      );
    }
  }
});

test('la limite clinique ne retombe pas sous le seuil au motif qu’elle est discrète', () => {
  // Elle a sa propre assertion parce que sa raison d'être n'est pas la même que
  // celle des pastilles : ce n'est pas un état de maturité, c'est la frontière
  // non médicale du produit. Elle doit rester lisible même si la palette bouge.
  const { fg } = colorsOf(readFileSync(SOURCE, 'utf8'), 'CLINICAL_BOUNDARY');
  assert.ok(
    contrast(fg, '#F4EFE6') >= AA_NORMAL,
    'La mention « informations, pas des diagnostics » est repassée sous AA.',
  );
});

test('le calcul de contraste lui-même est juste', () => {
  // Une garde qui se trompe de formule valide n'importe quoi. Deux repères
  // connus : le contraste maximal, et un couple dont la valeur est publiée.
  assert.equal(Math.round(contrast('#000000', '#FFFFFF') * 100) / 100, 21);
  assert.equal(Math.round(contrast('#FFFFFF', '#FFFFFF') * 100) / 100, 1);
  assert.equal(Math.round(contrast('#5A6570', '#FAF7F1') * 100) / 100, 5.56);
});
