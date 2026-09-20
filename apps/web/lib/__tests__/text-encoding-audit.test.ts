/**
 * Tests du garde-fou d'encodage (scripts/text-encoding-audit.mjs).
 *
 * Le défaut couvert ici n'était pas une faute de frappe : 19 fichiers de
 * `apps/web` portaient du texte UTF-8 relu en cp1252 puis ré-enregistré en
 * UTF-8. La source contenait donc littéralement ce que l'utilisateur voyait —
 * libellés de formulaire, `aria-label`, `<option>`, messages d'erreur, et le
 * texte dessiné dans le canvas de la carte postale exportée.
 *
 * Comme pour `vocab-audit.test.ts`, les exemples abîmés sont construits par
 * séquences d'échappement `\u....` et jamais écrits en clair : ce fichier
 * reste ASCII sur ces lignes, donc le balayage de l'arbre ci-dessous ne se
 * signale pas lui-même. C'est une contrainte réelle, pas une coquetterie —
 * un test écrit naïvement ferait échouer son propre garde-fou.
 */

import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

// @ts-expect-error — module utilitaire en JavaScript, sans déclaration de types.
import { isMojibake, scanTree, undoMojibake } from '../../scripts/text-encoding-audit.mjs';

const WEB_ROOT = fileURLToPath(new URL('../../', import.meta.url));

/** « Durée, distance » relu en cp1252 — cas accentué ordinaire (2 octets). */
const MOJIBAKE_ACCENT = 'Dur' + String.fromCharCode(0xc3, 0xa9) + 'e, distance';
/** « ⊙ Carnet » relu en cp1252 — cas 3 octets, propre à cp1252 et non à latin-1. */
const MOJIBAKE_GLYPH = String.fromCharCode(0xe2, 0x160, 0x2122) + ' Carnet';
/** « Maquette — aucune donnée » : cadratin + accent dans la même ligne. */
const MOJIBAKE_MIXED =
  'Maquette ' + String.fromCharCode(0xe2, 0x20ac, 0x201d) +
  ' aucune donn' + String.fromCharCode(0xc3, 0xa9) + 'e';

test('texte double-encodé accentué → détecté et restitué', () => {
  assert.equal(isMojibake(MOJIBAKE_ACCENT), true);
  assert.equal(undoMojibake(MOJIBAKE_ACCENT), 'Durée, distance');
});

test('glyphe 3 octets abîmé par cp1252 → détecté et restitué', () => {
  // La plage 0x80–0x9F distingue cp1252 de latin-1. Sans elle, ce cas passe
  // inaperçu : c'est précisément ce qu'une première mesure latin-1 avait raté.
  assert.equal(isMojibake(MOJIBAKE_GLYPH), true);
  assert.equal(undoMojibake(MOJIBAKE_GLYPH), '⊙ Carnet');
});

test('cadratin et accent sur la même ligne → restitués ensemble', () => {
  assert.equal(undoMojibake(MOJIBAKE_MIXED), 'Maquette — aucune donnée');
});

test('la correction est idempotente : une ligne saine n’est pas « re-corrigée »', () => {
  for (const sample of [MOJIBAKE_ACCENT, MOJIBAKE_GLYPH, MOJIBAKE_MIXED]) {
    const fixed = undoMojibake(sample) as string;
    assert.equal(undoMojibake(fixed), null, `seconde passe sur « ${fixed} »`);
  }
});

test('français correctement encodé → jamais signalé', () => {
  const clean = [
    'Visite vétérinaire',
    'Durée (min)',
    'Aperçu de la carte postale',
    'Contrôle',
    '⊙ Carnet · EMOPET',
    'Activité réduite observée sur la fenêtre de référence.',
    'Le chien n’est pas comparé à une moyenne de race.',
  ];
  for (const line of clean) {
    assert.equal(isMojibake(line), false, `faux positif : « ${line} »`);
  }
});

test('ASCII pur et séquence tronquée → jamais signalés', () => {
  // Un « Ã » isolé ne forme pas de l'UTF-8 valide une fois ramené à un octet :
  // le décodage strict échoue, donc aucune correction n'est inventée.
  for (const line of ['const label = "hello";', '', 'Ã', '// TODO: rien ici']) {
    assert.equal(isMojibake(line), false, `faux positif : « ${line} »`);
  }
});

test("aucun double-encodage ne subsiste dans apps/web", async () => {
  const findings = await scanTree(WEB_ROOT);
  const report = findings
    .slice(0, 20)
    .map((f: { file: string; line: number; current: string; expected: string }) =>
      `  ${f.file}:${f.line}\n    trouvé : ${f.current}\n    attendu: ${f.expected}`)
    .join('\n');
  assert.equal(
    findings.length,
    0,
    `${findings.length} ligne(s) double-encodée(s) subsistent :\n${report}`,
  );
});
