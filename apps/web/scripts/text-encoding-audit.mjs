/**
 * Garde-fou d'encodage — détecte le double-encodage UTF-8 dans les sources web.
 *
 * Symptôme : un fichier UTF-8 est lu par un éditeur comme du cp1252/latin-1,
 * puis ré-enregistré en UTF-8. Chaque caractère accentué devient alors sa
 * propre mojibake, figée dans la source. Le dépôt en portait 260 lignes sur
 * 19 fichiers, dont 199 hors commentaires : libellés JSX, `aria-label`,
 * `<option>`, messages d'erreur et texte dessiné au canvas. Ce n'était donc
 * pas un défaut de source mais un défaut de rendu, visible par l'utilisateur.
 *
 * La détection est ALGORITHMIQUE, jamais par liste de motifs : on tente de
 * défaire une couche de mauvais décodage, et on ne signale que si l'opération
 * réussit ET produit un texte différent. Aucun littéral abîmé n'est donc écrit
 * dans ce fichier — il ne se signale pas lui-même.
 *
 * Limites : ce garde-fou ne juge ni l'orthographe, ni la typographie, ni la
 * présence d'un BOM. Il ne contrôle qu'une chose, vérifiable mécaniquement :
 * le texte de la source est-il celui qui sera affiché.
 */

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Octets 0x80–0x9F tels que cp1252 les interprète. C'est cette table qui
 * distingue cp1252 de latin-1, et c'est elle qui explique pourquoi « ⊙ », « — »
 * ou « ↓ » se retrouvent abîmés en « âŠ™ », « â€” », « â†“ » : leur troisième
 * octet tombe dans cette plage.
 */
const CP1252_HIGH = {
  0x80: 0x20ac, 0x82: 0x201a, 0x83: 0x0192, 0x84: 0x201e, 0x85: 0x2026,
  0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02c6, 0x89: 0x2030, 0x8a: 0x0160,
  0x8b: 0x2039, 0x8c: 0x0152, 0x8e: 0x017d, 0x91: 0x2018, 0x92: 0x2019,
  0x93: 0x201c, 0x94: 0x201d, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
  0x98: 0x02dc, 0x99: 0x2122, 0x9a: 0x0161, 0x9b: 0x203a, 0x9c: 0x0153,
  0x9e: 0x017e, 0x9f: 0x0178,
};

const CP1252_REVERSE = new Map(
  Object.entries(CP1252_HIGH).map(([byte, code]) => [code, Number(byte)]),
);

/** Encode `text` vers des octets selon `cp1252` ou `latin1`, ou `null` si un caractère n'est pas représentable. */
function toSingleByte(text, encoding) {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) {
    const code = text.codePointAt(i);
    if (code > 0xffff) return null; // hors BMP : jamais issu d'un octet unique
    if (code <= 0xff) {
      // En cp1252 les points de code 0x80–0x9F ne proviennent pas d'un octet
      // de cette plage : les y renvoyer inventerait un tour de plus.
      if (encoding === 'cp1252' && code >= 0x80 && code <= 0x9f) return null;
      bytes[i] = code;
      continue;
    }
    if (encoding !== 'cp1252') return null;
    const byte = CP1252_REVERSE.get(code);
    if (byte === undefined) return null;
    bytes[i] = byte;
  }
  return bytes;
}

const STRICT_UTF8 = new TextDecoder('utf-8', { fatal: true });

/**
 * Défait UNE couche de mauvais décodage si — et seulement si — l'opération est
 * exacte : tous les caractères représentables sur un octet, et les octets
 * obtenus formant de l'UTF-8 valide. Rend `null` quand la ligne est saine.
 */
export function undoMojibake(line) {
  for (const encoding of ['cp1252', 'latin1']) {
    const bytes = toSingleByte(line, encoding);
    if (bytes === null) continue;
    let decoded;
    try {
      decoded = STRICT_UTF8.decode(bytes);
    } catch {
      continue;
    }
    if (decoded !== line) return decoded;
  }
  return null;
}

/** Vrai si la ligne est du texte double-encodé. */
export function isMojibake(line) {
  return undoMojibake(line) !== null;
}

const SCANNED_EXTENSIONS = new Set(['.ts', '.tsx', '.css', '.md', '.json', '.mjs']);
const SKIPPED_DIRECTORIES = new Set(['node_modules', '.next', 'dist', 'build', '.turbo']);

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIPPED_DIRECTORIES.has(entry.name)) continue;
      yield* walk(full);
    } else if (SCANNED_EXTENSIONS.has(path.extname(entry.name))) {
      yield full;
    }
  }
}

/**
 * Parcourt `rootDir` et rend une liste de `{ file, line, current, expected }`.
 * Liste vide = aucun double-encodage détecté.
 */
export async function scanTree(rootDir) {
  const findings = [];
  for await (const file of walk(rootDir)) {
    const source = await readFile(file, 'utf8');
    const lines = source.split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      const expected = undoMojibake(lines[i]);
      if (expected === null) continue;
      findings.push({
        file: path.relative(rootDir, file),
        line: i + 1,
        current: lines[i].trim(),
        expected: expected.trim(),
      });
    }
  }
  return findings;
}
