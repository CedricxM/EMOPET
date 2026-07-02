/**
 * Filtrage déterministe de la base de connaissances régionale (PATCH 1).
 *
 * PAS d'embeddings, PAS de TF-IDF : correspondance lexicale simple et lisible.
 * Score : +3 si un token du message est dans le nom/titre, +1 par token dans la
 * description, +2 si l'entrée géo correspond au département de l'utilisateur.
 * Une entrée PENDING_VERIFIED_CONTENT n'est JAMAIS injectée (score forcé < 0).
 *
 * PATCH 2 — la portion connaissance ne dépasse jamais MAX_KNOWLEDGE_TOKENS.
 */

import type { CultureEntry, GeographyEntry, RegionalKnowledgeBase } from './knowledge-types';

/** Plafond de tokens pour la connaissance injectée dans le prompt système. */
export const MAX_KNOWLEDGE_TOKENS = 800;

/** Estimation simple (aucun tokenizer requis) : ~1 token ≈ 4 caractères. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

type AnyEntry = GeographyEntry | CultureEntry;

function entryName(entry: AnyEntry): string {
  return 'name' in entry ? entry.name : entry.title;
}

function entryHaystack(entry: AnyEntry): string {
  const parts: string[] = [entryName(entry), entry.description];
  if ('dogFriendlyNotes' in entry && entry.dogFriendlyNotes) parts.push(entry.dogFriendlyNotes);
  if ('evocationExamples' in entry && entry.evocationExamples) parts.push(...entry.evocationExamples);
  return normalizeText(parts.join(' '));
}

function scoreEntry(entry: AnyEntry, tokens: Set<string>, userDepartment?: string): number {
  // Règle dure : jamais d'entrée non vérifiée dans une réponse réelle.
  if (entry._status === 'PENDING_VERIFIED_CONTENT') return -1;

  let score = 0;
  const nameNorm = normalizeText(entryName(entry));
  const haystack = entryHaystack(entry);
  for (const token of tokens) {
    if (nameNorm.includes(token)) score += 3;
    else if (haystack.includes(token)) score += 1;
  }
  if ('department' in entry && userDepartment && entry.department === userDepartment) {
    score += 2;
  }
  return score;
}

export interface FilteredKnowledge {
  geography: GeographyEntry[];
  culture: CultureEntry[];
}

function entryTokenLength(entry: AnyEntry): number {
  return estimateTokens(`${entryName(entry)} ${entry.description}`);
}

/**
 * Sélectionne au plus `maxEntries` entrées pertinentes, classées par score
 * décroissant, réparties entre géographie et culture, sous MAX_KNOWLEDGE_TOKENS.
 */
export function filterRelevantKnowledge(
  userMessage: string,
  knowledgeBase: RegionalKnowledgeBase,
  options: { maxEntries?: number; userDepartment?: string } = {},
): FilteredKnowledge {
  const maxEntries = options.maxEntries ?? 6;
  const tokens = new Set(normalizeText(userMessage).split(' ').filter((t) => t.length >= 3));
  if (tokens.size === 0) return { geography: [], culture: [] };

  const geo = knowledgeBase.geographyEntries
    .map((e) => ({ e, s: scoreEntry(e, tokens, options.userDepartment) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  const cult = knowledgeBase.cultureEntries
    .map((e) => ({ e, s: scoreEntry(e, tokens, options.userDepartment) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);

  // Répartition équilibrée géo/culture jusqu'à maxEntries.
  const merged: Array<{ kind: 'geo' | 'cult'; e: AnyEntry; s: number }> = [];
  let gi = 0;
  let ci = 0;
  while (merged.length < maxEntries && (gi < geo.length || ci < cult.length)) {
    if (gi < geo.length) {
      merged.push({ kind: 'geo', e: geo[gi]!.e, s: geo[gi]!.s });
      gi++;
    }
    if (merged.length < maxEntries && ci < cult.length) {
      merged.push({ kind: 'cult', e: cult[ci]!.e, s: cult[ci]!.s });
      ci++;
    }
  }

  // Plafond de tokens : retirer les plus faibles scores jusqu'à repasser sous le seuil.
  merged.sort((a, b) => b.s - a.s);
  const kept: typeof merged = [];
  let total = 0;
  for (const item of merged) {
    const cost = entryTokenLength(item.e);
    if (total + cost > MAX_KNOWLEDGE_TOKENS) continue;
    total += cost;
    kept.push(item);
  }

  return {
    geography: kept.filter((x) => x.kind === 'geo').map((x) => x.e as GeographyEntry),
    culture: kept.filter((x) => x.kind === 'cult').map((x) => x.e as CultureEntry),
  };
}
