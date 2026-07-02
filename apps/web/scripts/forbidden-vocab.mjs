/**
 * Source UNIQUE des termes interdits par les invariants EMOPET
 * (anthropomorphisation, labels émotionnels, claims médicaux/diagnostiques).
 *
 * Importé par :
 *   - scripts/vocab-audit.mjs            → scan du code UI (exit 1 si violation)
 *   - lib/__tests__/vocab-audit.test.ts  → couverture de l'outil lui-même
 *
 * ────────────────────────────────────────────────────────────────────────────
 * PRINCIPE : précision avant rappel.
 *
 * On ne proscrit PAS les mots émotionnels/médicaux nus : EMOPET les emploie
 * légitimement dans ses disclaimers (« EMOPET ne mesure pas l'anxiété »,
 * « dispositif non médical, aucune affirmation de maladie »). Proscrire le mot
 * nu casserait cette communication honnête.
 *
 * On cible donc trois FORMULATIONS interdites :
 *   1. émotion ATTRIBUÉE au chien        (« le chien est anxieux », « il a peur »)
 *   2. émotion TRAITÉE COMME UNE MESURE  (« niveau de stress », « anxiété détectée »)
 *   3. CLAIM médical affirmatif          (« détection de maladie », « risque cardiaque »)
 *
 * Une ALLOWLIST neutralise d'abord les tournures légitimes (disclaimers, négations,
 * « bien-être », redirection vétérinaire) pour éviter tout faux positif.
 *
 * Ce fichier vit dans scripts/ — hors des SCAN_DIRS (app|components|lib) ET dans
 * EXCLUDE_FILE de vocab-audit.mjs — il ne peut donc jamais se signaler lui-même ;
 * les motifs sont écrits en clair (lisibilité > obfuscation ici).
 * ────────────────────────────────────────────────────────────────────────────
 */

/** Racines émotionnelles (positives ET négatives : aucun label émotionnel n'est admis). */
const EMO =
  "anxi(?:été|eux|euse)|stress\\w*|déprim\\w*|peur\\w*|détresse|tristesse|ennui" +
  "|joie|joyeu(?:x|se)|bonheur|heureu(?:x|se)|content(?:e)?|malheureu(?:x|se)";

/** Verbes d'attribution d'état au chien (« a l'air » avant « a » : alternance ordonnée). */
const ATTR_VERB = "est|semble|paraît|a l['’]air|se sent|devient|reste|a";

/**
 * Frontière de fin de jeton SÛRE avec les accents : `\b` échoue après « é/è/à… »
 * (non-`\w`), donc « alerte santé » suivi d'un espace ne matcherait jamais.
 * On exige juste que le caractère suivant ne soit pas une lettre latine (accents inclus).
 */
const END = '(?![A-Za-zÀ-ÿ])';

/** Tournures exactes — score émotionnel + anthropomorphisation directe + classement. */
export const LITERALS = [
  'score de bonheur',
  'happiness score',
  'niveau de joie',
  'chien heureux',
  'chien triste',
  'votre chien est anxieux',
  'classement des chiens',
  'meilleur chien',
];

/**
 * Phrases légitimes neutralisées AVANT le scan (précision avant rappel).
 * Flag `g` requis (remplacement global).
 */
export const ALLOWLIST = [
  /bien-être/gi,
  /non[- ]médica\w*/gi,
  /évaluation vétérinaire/gi,
  /consult\w*\s+(?:votre\s+|un\s+|le\s+)?vétérinaire/gi,
  // Négations / disclaimers : « ne mesure pas l'anxiété », « n'est pas anxieux »,
  // « ne pose aucun diagnostic », « n'affiche aucun score de … ».
  new RegExp(
    `\\b(?:ne|n['’])\\s*\\w*\\s*(?:pas|plus|jamais|aucune?|ni)\\s+` +
      `[^.,;:!?]{0,25}?(?:${EMO}|maladie|diagnostic|émotion|score de \\w+)`,
    'gi',
  ),
  // « aucun score / niveau / état de <émotion> »
  new RegExp(
    `\\b(?:aucune?|sans|pas de|ni)\\s+(?:score|niveau|indice|jauge|état|évaluation)\\s+` +
      `(?:de\\s+|d['’])?(?:${EMO})`,
    'gi',
  ),
];

/** Regex de violation (après neutralisation de l'allowlist). */
export const PATTERNS = [
  // 1 — émotion humaine prêtée au chien (anthropomorphisation)
  /\bil s['’]ennuie\b/i,
  /\ba fait un (?:beau |bon )?rêve\b/i,
  new RegExp(`\\bchien(?:ne)?\\s+(?:${ATTR_VERB})\\s+(?:très |un peu |plutôt |si )?(?:${EMO})`, 'i'),
  new RegExp(`\\bressent\\s+(?:de |du |de la |de l['’]|une |son |sa |un )?(?:${EMO})`, 'i'),
  // 2 — émotion traitée comme une mesure
  new RegExp(`\\b(?:score|niveau|indice|jauge|taux|note)\\s+(?:de |d['’]|du )(?:${EMO})`, 'i'),
  new RegExp(`\\b(?:${EMO})\\s+(?:détecté|détectée|mesuré|mesurée|quantifié|quantifiée|élevé|élevée)${END}`, 'i'),
  // 3 — claims médicaux / diagnostiques affirmatifs (jamais les disclaimers)
  /\bdétection (?:de |d['’])?(?:maladie|anomalie|problème cardiaque)\b/i,
  new RegExp(`\\brisque (?:cardiaque|d['’]obésité|de maladie|sanitaire)${END}`, 'i'),
  new RegExp(`\\balerte santé${END}`, 'i'),
  /\bdiagnostic (?:de |d['’]|:)/i,
];

/**
 * Scanne un texte et renvoie les correspondances interdites (vide = conforme).
 * Pure (aucune E/S) → testable unitairement.
 * @param {string} text
 * @returns {string[]}
 */
export function scanText(text) {
  // 1) neutraliser les tournures légitimes (disclaimers, négations, bien-être…)
  let scrubbed = text;
  for (const re of ALLOWLIST) scrubbed = scrubbed.replace(re, ' ');
  // 2) littéraux (sous-chaîne, insensible à la casse)
  const lower = scrubbed.toLowerCase();
  const hits = [];
  for (const term of LITERALS) {
    if (lower.includes(term)) hits.push(term);
  }
  // 3) motifs de violation
  for (const re of PATTERNS) {
    const m = scrubbed.match(re);
    if (m) hits.push(m[0].trim());
  }
  return hits;
}
