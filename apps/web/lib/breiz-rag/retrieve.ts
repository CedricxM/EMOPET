/**
 * Récupération (retrieval) — R4 Breiz RAG.
 * Scoring lexical léger (overlap pondéré tags/titre), sans modèle ni embeddings.
 */

import { ALL_DOCS } from './corpus';
import type { KnowledgeDoc } from './corpus';

const STOPWORDS = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'au', 'aux', 'et', 'ou', 'mais', 'donc',
  'a', 'à', 'est', 'sont', 'son', 'sa', 'ses', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'ce',
  'cet', 'cette', 'ces', 'que', 'qui', 'quoi', 'dont', 'pour', 'par', 'sur', 'dans', 'avec',
  'il', 'elle', 'je', 'tu', 'on', 'nous', 'vous', 'ils', 'elles', 'se', 'ne', 'pas', 'plus',
  'en', 'y', 'comment', 'pourquoi', 'quand', 'quel', 'quelle', 'quels', 'quelles', 'mon',
  'chien', 'chienne', 'gus', 'capitaine', 'me', 'mes', 'fait', 'faire', 'est-ce', 'qu',
]);

/** Normalise : minuscules, sans accents, tokens alphanumériques utiles. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

export interface ScoredDoc {
  doc: KnowledgeDoc;
  score: number;
}

const docTokenCache = new WeakMap<KnowledgeDoc, { body: Set<string>; title: Set<string>; tags: Set<string> }>();

function docTokens(doc: KnowledgeDoc) {
  let t = docTokenCache.get(doc);
  if (!t) {
    t = {
      body: new Set(tokenize(doc.text)),
      title: new Set(tokenize(doc.title)),
      tags: new Set(doc.tags.flatMap((tag) => tokenize(tag))),
    };
    docTokenCache.set(doc, t);
  }
  return t;
}

/** Top-k documents pertinents (score > 0), du plus pertinent au moins. */
export function retrieve(query: string, k = 3, docs: KnowledgeDoc[] = ALL_DOCS): ScoredDoc[] {
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return [];
  const scored: ScoredDoc[] = [];
  for (const doc of docs) {
    const dt = docTokens(doc);
    let score = 0;
    for (const q of qTokens) {
      if (dt.tags.has(q)) score += 3;
      if (dt.title.has(q)) score += 2;
      if (dt.body.has(q)) score += 1;
    }
    if (score > 0) scored.push({ doc, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}
