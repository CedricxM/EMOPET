/**
 * Assemblage du prompt système (Section 5 + PATCH 1/2).
 * Moteur commun (constant) + identité régionale (profil) + connaissance
 * régionale filtrée par pertinence (jamais toute la base, jamais d'entrée
 * non vérifiée, sous MAX_KNOWLEDGE_TOKENS).
 */

import { COMMON_ENGINE_BLOCKS, ELI_LOCKED_BLOCK } from './engine';
import { MAX_KNOWLEDGE_TOKENS, estimateTokens, filterRelevantKnowledge } from './filter-knowledge';
import type { CultureEntry, GeographyEntry, RegionalKnowledgeBase } from './knowledge-types';
import type { ConversationContext, RegionalProfile } from './types';

function geoLine(e: GeographyEntry): string {
  return `- ${e.name} (${e.type}, dép. ${e.department}) : ${e.description}${e.dogFriendlyNotes ? ` — chiens : ${e.dogFriendlyNotes}` : ''}`;
}
function cultLine(e: CultureEntry): string {
  return `- ${e.title} (${e.theme}) : ${e.description}`;
}

export interface BuiltPrompt {
  prompt: string;
  /** Estimation tokens de la seule portion connaissance (pour le test de coût). */
  knowledgeTokens: number;
  usedGeography: number;
  usedCulture: number;
}

/**
 * Assemble le prompt système régional. `context.touchesEliData` ajoute le
 * bloc verrouillé. La connaissance est filtrée et plafonnée.
 */
export function buildAssistantSystemPrompt(
  profile: RegionalProfile,
  knowledgeBase: RegionalKnowledgeBase,
  context: ConversationContext,
  options: { userDepartment?: string; maxEntries?: number } = {},
): BuiltPrompt {
  const blocks: string[] = [...COMMON_ENGINE_BLOCKS];

  // Chemin verrouillé si la réponse touche une donnée ELI.
  if (context.touchesEliData) blocks.push(ELI_LOCKED_BLOCK);

  // Identité régionale (depuis le profil).
  blocks.push(
    `# Identité\nTu t'appelles ${profile.assistantName} (${profile.assistantNameOrigin}). Tu accompagnes les propriétaires de la région « ${profile.regionId} » (départements : ${profile.departments.join(', ')}).`,
  );

  // Connaissance régionale filtrée par pertinence (jamais toute la base).
  const filtered = filterRelevantKnowledge(context.userMessage, knowledgeBase, {
    userDepartment: options.userDepartment,
    maxEntries: options.maxEntries ?? 6,
  });

  // Plafond DUR (PATCH 2) appliqué sur le texte RÉELLEMENT rendu : on ajoute
  // les lignes tant qu'on reste sous MAX_KNOWLEDGE_TOKENS, géo puis culture.
  const keptGeo: string[] = [];
  const keptCult: string[] = [];
  let used = 0;
  let usedGeography = 0;
  let usedCulture = 0;
  for (const e of filtered.geography) {
    const line = geoLine(e);
    const cost = estimateTokens(line);
    if (used + cost > MAX_KNOWLEDGE_TOKENS) break;
    used += cost;
    keptGeo.push(line);
    usedGeography++;
  }
  for (const e of filtered.culture) {
    const line = cultLine(e);
    const cost = estimateTokens(line);
    if (used + cost > MAX_KNOWLEDGE_TOKENS) break;
    used += cost;
    keptCult.push(line);
    usedCulture++;
  }
  const geoBlock = keptGeo.length ? `## Lieux régionaux pertinents\n${keptGeo.join('\n')}` : '';
  const cultBlock = keptCult.length ? `## Culture régionale pertinente\n${keptCult.join('\n')}` : '';
  const knowledgeText = [geoBlock, cultBlock].filter(Boolean).join('\n\n');
  const knowledgeTokens = knowledgeText ? estimateTokens(knowledgeText) : 0;

  if (knowledgeText) {
    blocks.push(`# Connaissance régionale (à mobiliser seulement si pertinent et exact)\n${knowledgeText}`);
  } else {
    blocks.push(`# Connaissance régionale\nAucune entrée vérifiée pertinente pour cette requête. Réponds utilement sans inventer de référence régionale.`);
  }

  return {
    prompt: blocks.join('\n\n'),
    knowledgeTokens,
    usedGeography,
    usedCulture,
  };
}

export { MAX_KNOWLEDGE_TOKENS };
