/**
 * La carte Repos porte les attributs d'observation exigés par Care §4.
 *
 * `EMOPET_CARE_PRODUCT_MASTER_v0.1.md` exige qu'une observation publiée porte
 * sa référence, sa provenance, ce qui explique sa qualité/confiance et ses
 * limites. Après le retrait de l'indice global
 * (`DASHBOARD_GLOBAL_INDEX_RETIREMENT_2026-09-20.md`), la carte Repos occupe la
 * place principale : elle affichait trois nombres — interruptions, durée,
 * confiance — sans dire à quoi ils se comparent ni d'où ils viennent. Trois
 * nombres nus à la place d'un seul ne valent pas mieux.
 *
 * Ces tests verrouillent quatre choses :
 *
 *   1. les quatre énoncés sont RENDUS, pas seulement présents au dictionnaire ;
 *   2. FR et EN déclarent les MÊMES placeholders — une traduction qui en perd un
 *      ferait disparaître un nombre sans casser la compilation ;
 *   3. chaque placeholder déclaré est ALIMENTÉ au point d'appel — sinon
 *      `fillTemplate` laisse `{duration}` en clair à l'écran ;
 *   4. le marqueur `DÉMO ·` est porté par la SOURCE, et par elle seule.
 *
 * Le fichier de page est un `.tsx` que le harnais ne collecte pas ; la
 * vérification porte donc sur la SOURCE, comme le fait déjà
 * `lib/data/eli/__tests__/eli-surface-boundary.test.ts`.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { en, fr } from '../../i18n/dictionaries';

const webRoot = fileURLToPath(new URL('../../../', import.meta.url));
const source = readFileSync(path.join(webRoot, 'app', 'dashboard', 'page.tsx'), 'utf8');

/** Les quatre attributs Care §4 que la carte ne portait pas. */
const ROWS = [
  { label: 'restReferenceLabel', text: 'restReferenceText' },
  { label: 'restSourceLabel', text: 'restSourceText' },
  { label: 'restConfidenceLabel', text: 'restConfidenceText' },
  { label: 'restLimitsLabel', text: 'restLimitsText' },
] as const;

function placeholders(template: string): string[] {
  return [...template.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}

/** Le fragment JSX de la ligne qui rend cette clé de texte. */
function rowFragment(textKey: string): string {
  const fragments = source.split('<ObservationFact').slice(1);
  const match = fragments.find((fragment) => fragment.includes(`'${textKey}'`));
  assert.ok(match, `aucune ligne <ObservationFact> ne rend ${textKey}`);
  return match.slice(0, match.indexOf('/>'));
}

test('les quatre attributs d’observation sont rendus par la carte', () => {
  for (const { label, text } of ROWS) {
    assert.ok(source.includes(`'${label}'`), `l’intitulé ${label} n’est pas rendu`);
    assert.ok(source.includes(`'${text}'`), `l’énoncé ${text} n’est pas rendu`);
  }
});

test('les énoncés sont rendus dans une liste de définitions', () => {
  // Intitulé + valeur : <dl>/<dt>/<dd> le dit à l'arbre d'accessibilité, deux
  // <span> côte à côte ne le disent pas.
  assert.ok(source.includes('<dl'), 'les attributs ne sont pas structurés en liste de définitions');
  assert.ok(source.includes('<dt'), 'les intitulés ne sont pas des <dt>');
  assert.ok(source.includes('<dd'), 'les valeurs ne sont pas des <dd>');
});

test('FR et EN déclarent les mêmes placeholders', () => {
  for (const { text } of ROWS) {
    assert.deepEqual(
      placeholders(en.dashboard[text]),
      placeholders(fr.dashboard[text]),
      `la traduction de ${text} ne porte pas les mêmes valeurs que le français`,
    );
  }
});

test('chaque placeholder déclaré est alimenté au point d’appel', () => {
  // Un placeholder non fourni reste VISIBLE à l'écran (cf. fill-template.test.ts) :
  // c'est voulu, mais ça reste un défaut d'affichage qu'un test doit attraper.
  for (const { text } of ROWS) {
    const fragment = rowFragment(text);
    for (const key of placeholders(fr.dashboard[text])) {
      assert.match(fragment, new RegExp(`\\b${key}:`), `{${key}} n’est pas alimenté pour ${text}`);
    }
  }
});

test('les valeurs viennent des fixtures, pas de littéraux recopiés dans la page', () => {
  // Recopier « 14 nuits » dans le JSX ferait diverger la carte de sa source le
  // jour où la fixture change — ou, pire, le jour où une vraie source arrive.
  for (const field of [
    'MOCK_REPOS.reference.nights',
    'MOCK_REPOS.reference.medianInterruptions',
    'MOCK_REPOS.reference.medianDurationMinutes',
    'MOCK_REPOS.source.device',
    'MOCK_REPOS.source.windowStart',
    'MOCK_REPOS.source.windowEnd',
    'MOCK_REPOS.unusableMinutes',
  ]) {
    assert.ok(source.includes(field), `${field} n’alimente pas la carte`);
  }
});

/* ---------- marquage de provenance (ELI-ARCH-G3, #118) ---------- */

test('le marqueur DÉMO est porté par la source, et par elle seule', () => {
  const occurrences = source.split('ELI_DEMO_PREFIX').length - 1;
  // Une fois à l'import, une fois au point d'usage.
  assert.equal(occurrences, 2, 'le marqueur DÉMO est posé ailleurs que sur la source');
  assert.match(
    rowFragment('restSourceText'),
    /ELI_DEMO_PREFIX/,
    'la source ne porte pas le marqueur DÉMO',
  );
  for (const { text } of ROWS) {
    if (text === 'restSourceText') continue;
    assert.ok(
      !rowFragment(text).includes('ELI_DEMO_PREFIX'),
      `${text} porte le marqueur DÉMO : c’est la source qui est fictive, pas le raisonnement`,
    );
  }
});

test('le marquage est fail-closed : il dépend de la provenance, pas d’une constante', () => {
  // Le jour où une source MAT/TAG réelle est déclarée, le marqueur doit
  // disparaître sans retoucher ce fichier — et pas l'inverse.
  assert.ok(
    source.includes('isAuthoritativeEliProvenance(ELI_WEB_MOCK_PROVENANCE)'),
    'le marqueur n’est plus conditionné par la provenance déclarée',
  );
});
