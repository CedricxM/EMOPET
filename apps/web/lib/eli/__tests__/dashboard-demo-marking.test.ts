/**
 * La carte ELI du tableau de bord ne publie pas un nombre nu — ELI-ARCH-G3 (#118).
 *
 * `MOCK_ELI` vient de `lib/eli/mock.ts`, dont l'en-tête dit « Données SIMULÉES —
 * PRNG déterministe ». La carte principale publiait pourtant cette valeur avec un
 * badge de fiabilité, une tendance et une jauge, sans rien dire de sa provenance.
 *
 * La quarantaine G3 avait bien atterri, mais seulement sur `components/eli/*` :
 * `ConfidenceBadge` rend « DÉMO · <état> » et `Gauge` rend « DÉMO · /100 ». Or la
 * carte du tableau de bord n'utilise pas ces atomes — elle emploie les primitives
 * génériques `Pill`, `DataXL` et `Meter`, qui ne portent aucune provenance. Le
 * contrôle existait donc, testé, et la surface la plus visible y échappait.
 *
 * `lib/narration.ts` avait déjà écrit la règle pour l'autre chemin de publication
 * (« une source non autoritative est marquée `DÉMO ·` »), verrouillée par le test
 * « jamais un nombre nu » — qui emploie justement la valeur 72, celle que la carte
 * affichait sans marque. Ces tests verrouillent la même règle sur le tableau de bord.
 *
 * Le fichier de page est un `.tsx` que le harnais ne collecte pas ; la liaison est
 * donc vérifiée au niveau de la SOURCE, comme le fait déjà
 * `lib/data/eli/__tests__/eli-surface-boundary.test.ts`.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { ELI_WEB_MOCK_PROVENANCE } from '../mock-provenance';
import { ELI_DEMO_PREFIX, isAuthoritativeEliProvenance } from '../../narration';

const webRoot = fileURLToPath(new URL('../../../', import.meta.url));
const dashboardPage = path.join(webRoot, 'app', 'dashboard', 'page.tsx');
const source = readFileSync(dashboardPage, 'utf8');

test('la provenance du tableau de bord est non autoritative, donc le marquage doit rendre', () => {
  // Si cette assertion tombe un jour, c'est qu'une source réelle a été déclarée :
  // le marquage disparaîtra alors de lui-même, et c'est l'intention. Vérifier
  // dans ce cas que la source est vraiment câblée avant de mettre à jour le test.
  assert.equal(isAuthoritativeEliProvenance(ELI_WEB_MOCK_PROVENANCE), false);
  assert.equal(ELI_WEB_MOCK_PROVENANCE.classification, 'DEMO_MOCK_ONLY');
});

test('la carte publie une valeur simulée, donc elle consulte la provenance', () => {
  assert.ok(source.includes('MOCK_ELI.value'), 'la carte ne publie plus MOCK_ELI.value — revoir ce test');
  assert.ok(
    source.includes('isAuthoritativeEliProvenance'),
    'la carte publie une valeur simulée sans consulter la provenance',
  );
  assert.ok(
    source.includes('ELI_WEB_MOCK_PROVENANCE'),
    'la provenance consultée doit être celle de la quarantaine G3',
  );
});

test('le marqueur employé est celui du dépôt, pas un texte réinventé', () => {
  assert.ok(source.includes('ELI_DEMO_PREFIX'), 'marqueur codé en dur au lieu de ELI_DEMO_PREFIX');
  assert.equal(ELI_DEMO_PREFIX.trim(), 'DÉMO ·');
});

test('le marquage est conditionnel, jamais inconditionnel', () => {
  // Un marquage en dur survivrait au câblage d'une source réelle et mentirait
  // dans l'autre sens : il annoncerait une démonstration là où il y aurait une
  // observation. La condition est donc aussi importante que le marqueur.
  assert.ok(
    source.includes('eliAuthoritative'),
    'le marquage doit dépendre du verdict de provenance',
  );
  assert.ok(
    /!eliAuthoritative|eliAuthoritative\s*\?/.test(source),
    'aucune branche conditionnelle trouvée autour du marquage',
  );
});

test('le badge de fiabilité est marqué, pas seulement la valeur', () => {
  // C'est l'élément le plus trompeur : « VALIDE » affirme la fiabilité d'un
  // nombre produit par un PRNG. Le marquer importe autant que marquer l'unité.
  assert.ok(source.includes('PILL_LABELS'), 'le libellé du badge n’est pas préfixé');
  assert.match(
    source,
    /\$\{ELI_DEMO_PREFIX\}\$\{PILL_LABELS\[/,
    'le badge doit rendre « DÉMO · <état> », comme ConfidenceBadge',
  );
});
