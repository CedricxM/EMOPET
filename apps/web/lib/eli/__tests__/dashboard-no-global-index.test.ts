/**
 * Le tableau de bord ne publie pas d'indice global — `OPEN-UI-ELI-001`.
 *
 * `FOUNDER_STRATEGIC_LOCKS_2026-09-07.md`, seule autorité du dépôt au statut
 * `PROJECT_DECISION / STRATEGIC AUTHORITY`, pose deux règles qui suffisent :
 *
 *   « EMOPET is relationship-first rather than metric-first. […] not to flood
 *     the interface with generic scores. »
 *   « no unsupported generic emotional score »
 *
 * `EMOPET_CARE_PRODUCT_MASTER_v0.1.md` corrobore en nommant ce que Care n'est
 * pas : « a generic health score », « a "good/bad day" meter ».
 *
 * `CURRENT_UI_ELI_PRODUCT_DRIFT_AUDIT_2026-09-07.md` §8.3 prescrivait l'action
 * dès le 7 septembre ; elle a été exécutée le 20, sur décision du fondateur, et
 * tracée dans `DASHBOARD_GLOBAL_INDEX_RETIREMENT_2026-09-20.md`.
 *
 * Ces tests empêchent la surface de revenir par inadvertance — reprise d'un
 * ancien écran, copier-coller depuis `BienEtreSection`, ou restauration d'un
 * composant historique. Ils ne l'interdisent pas pour toujours : la condition de
 * retour est écrite dans le record, et remettre l'indice demandera de mettre ces
 * tests à jour, donc de relire la décision plutôt que de la contourner.
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

const webRoot = fileURLToPath(new URL('../../../', import.meta.url));
const source = readFileSync(path.join(webRoot, 'app', 'dashboard', 'page.tsx'), 'utf8');

test('la valeur composite et son delta ne sont plus publiés', () => {
  assert.ok(!source.includes('MOCK_ELI.value'), 'la valeur de l’indice global est de retour');
  assert.ok(!source.includes('MOCK_ELI.delta'), 'le delta hebdomadaire de l’indice est de retour');
});

test('le libellé de l’indice n’est plus rendu', () => {
  // `balanceIndex` est la clé i18n de « Indice d'équilibre (ELI) ».
  assert.ok(!source.includes("'balanceIndex'"), 'le libellé de l’indice global est de retour');
});

test('la jauge de progression n’est plus rendue', () => {
  // Un « good/bad day meter » est nommément exclu par le Care Master.
  assert.ok(!/<Meter\b/.test(source), 'la jauge de l’indice global est de retour');
});

test('la tendance « ELI quotidien » sur 14 jours n’est plus rendue', () => {
  // Retirer le nombre en gardant sa courbe ne retirerait rien.
  assert.ok(!source.includes('MOCK_TREND_14D'), 'la série de l’indice global est de retour');
  assert.ok(!source.includes('TrendChart'), 'le graphe de l’indice global est de retour');
  assert.ok(!source.includes("'dailyEli'"), 'le libellé « ELI quotidien » est de retour');
});

/* ---------- ce que le retrait devait PRÉSERVER (audit §7) ---------- */

test('les états de confiance restent affichés', () => {
  assert.ok(source.includes('<Pill state='), 'l’état de fiabilité a disparu avec l’indice');
});

test('le message de capture insuffisante reste affiché', () => {
  // L'abstention explicite est un comportement produit, pas un état d'échec.
  assert.ok(source.includes("'insufficientCapture'"), 'le message de capture insuffisante a disparu');
  assert.ok(source.includes('MOCK_ELI.captureMinutes'), 'la condition de capture insuffisante a disparu');
});

test('l’affordance « Comprendre les indicateurs » reste disponible', () => {
  assert.ok(source.includes("'understandShow'"), 'l’explication a disparu avec l’indice');
});

test('l’avertissement non médical reste affiché', () => {
  assert.ok(source.includes('<Disclaimer />'), 'l’avertissement non médical a disparu');
});

test('l’export de la synthèse reste disponible', () => {
  assert.ok(source.includes("'exportSummary'"), 'l’export a disparu avec la carte qui le portait');
});

test('l’observation Repos occupe désormais la place principale', () => {
  // Comparer à Anticipation, pas à Récupération : Repos précédait déjà
  // Récupération AVANT le retrait, donc cette comparaison-là ne prouverait rien.
  // Anticipation, elle, occupait la grille de tête aux côtés de l'indice.
  const rest = source.indexOf("'rest'");
  const anticipation = source.indexOf("'anticipation'");
  assert.ok(rest > 0, 'la carte Repos a disparu');
  assert.ok(anticipation > 0, 'la carte Anticipation a disparu');
  assert.ok(rest < anticipation, 'Repos devrait ouvrir la composition, avant Anticipation');
});
