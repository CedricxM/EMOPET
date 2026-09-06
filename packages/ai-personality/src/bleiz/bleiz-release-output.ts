import { filterGeneratedText } from './bleiz-content-scheduler.js';
import type {
  BleizReleaseTemplate,
  BleizSemanticAuthority,
} from './bleiz-release-templates.js';

export type ReleaseOutputDecision = 'ALLOW' | 'REJECT';

export interface ReleaseOutputViolation {
  id: string;
  semanticAuthority: BleizSemanticAuthority;
  description: string;
}

export interface ReleaseOutputGuardResult {
  decision: ReleaseOutputDecision;
  /** Present only when the candidate passes the semantic ceiling. */
  text: string | null;
  /** Terms detected/removed by the existing lexical safety filter. */
  blockedTerms: string[];
  /** Semantic-ceiling violations. The raw rejected candidate is deliberately not returned. */
  violations: ReleaseOutputViolation[];
}

interface SemanticPattern {
  id: string;
  description: string;
  pattern: RegExp;
}

/**
 * Patterns that are incompatible with EMOPET release copy regardless of surface.
 *
 * This is intentionally a narrow fail-closed safety layer, not a substitute for
 * scientific validation or model evaluation. False positives should be resolved by
 * improving the candidate wording, not by weakening the ceiling silently.
 */
const UNIVERSAL_PATTERNS: SemanticPattern[] = [
  {
    id: 'diagnostic-assertion',
    description: 'diagnostic or pathological assertion',
    pattern: /\b(diagnostic|diagnostique|diagnostiquer|pathologie|pathologique|maladie|syndrome|sympt[oô]me|trouble)\b/i,
  },
  {
    id: 'certainty-assertion',
    description: 'unsupported certainty language',
    pattern: /\b(certainement|sans aucun doute|[àa] coup s[uû]r|c['’]est certain|definitely|certainly)\b/i,
  },
  {
    id: 'dog-pain-assertion',
    description: 'pain or suffering asserted as known internal state',
    pattern: /\b(il|elle|votre chien|le chien)\s+(a mal|souffre|est douloureux|est douloureuse)\b/i,
  },
];

const OBSERVATION_ONLY_PATTERNS: SemanticPattern[] = [
  {
    id: 'latent-emotion',
    description: 'hidden emotional state asserted from observation',
    pattern: /\b(anxieux|anxieuse|anxi[eé]t[eé]|stress[eé]e?|peur|apeur[eé]|paniqu[eé]e?|triste|heureux|heureuse|bonheur|d[eé]prim[eé]e?)\b/i,
  },
  {
    id: 'causal-claim',
    description: 'causal interpretation beyond observational authority',
    pattern: /\b([àa] cause de|parce que|cela signifie que|[cç]a signifie que|cela prouve que|[cç]a prouve que|the reason is|this means that|this proves that)\b/i,
  },
  {
    id: 'motivation-mind-reading',
    description: 'motivation or intention attributed as known',
    pattern: /\b(il|elle|votre chien|le chien)\s+(veut|cherche [àa]|essaie de|pense|croit|ressent)\b/i,
  },
  {
    id: 'relationship-quality-claim',
    description: 'relationship or bond quality inferred from evidence',
    pattern: /\b(lien (est )?(plus )?fort|relation (est )?(plus )?forte|attachement (est )?(plus )?fort|[eé]quilibre [eé]motionnel|bond is stronger|stronger bond|relationship is stronger)\b/i,
  },
];

const CONTEXT_ONLY_PATTERNS: SemanticPattern[] = [
  {
    id: 'context-to-dog-state',
    description: 'external context converted into a hidden dog state',
    pattern: /\b(la m[eé]t[eé]o|la chaleur|le froid|la saison|the weather|the heat|the cold)\b.{0,80}\b(rend|provoque|cause|makes|causes)\b.{0,40}\b(anxieux|stress[eé]|peur|malade|anxious|stressed|afraid|sick)\b/i,
  },
];

const SUGGESTION_ONLY_PATTERNS: SemanticPattern[] = [
  {
    id: 'suggestion-presented-as-proof',
    description: 'suggestion wording presented as proof of dog or relationship state',
    pattern: /\b(cela montre que|[cç]a montre que|cela prouve que|[cç]a prouve que|this shows that|this proves that)\b/i,
  },
  {
    id: 'relationship-certainty',
    description: 'relationship quality asserted as fact',
    pattern: /\b(votre lien est|votre relation est|le lien avec .* est|your bond is|your relationship is)\b/i,
  },
];

const COMMUNITY_ONLY_PATTERNS: SemanticPattern[] = [
  {
    id: 'community-scientific-inference',
    description: 'community content presented as scientific inference',
    pattern: /\b(eli (montre|prouve|confirme)|les capteurs (montrent|prouvent|confirment)|scientifiquement prouv[eé]|ELI (shows|proves|confirms)|the sensors (show|prove|confirm))\b/i,
  },
];

const EDUCATION_ONLY_PATTERNS: SemanticPattern[] = [
  {
    id: 'generic-to-individual-diagnosis',
    description: 'general educational content converted into an individual diagnosis',
    pattern: /\b(votre chien|ce chien|your dog)\s+(a|souffre de|est atteint de|has|suffers from)\s+.{0,50}\b(maladie|trouble|syndrome|pathologie|disease|disorder|syndrome)\b/i,
  },
];

function patternsFor(authority: BleizSemanticAuthority): SemanticPattern[] {
  switch (authority) {
    case 'OBSERVATION_ONLY':
      return OBSERVATION_ONLY_PATTERNS;
    case 'CONTEXT_ONLY':
      return CONTEXT_ONLY_PATTERNS;
    case 'SUGGESTION_ONLY':
      return SUGGESTION_ONLY_PATTERNS;
    case 'COMMUNITY_ONLY':
      return COMMUNITY_ONLY_PATTERNS;
    case 'EDUCATION_ONLY':
      return EDUCATION_ONLY_PATTERNS;
    default:
      return [];
  }
}

/**
 * Enforces the semantic ceiling on the raw candidate BEFORE lexical rewriting,
 * then applies the historical lexical safety filter and checks the filtered text
 * again. This prevents a forbidden claim from being cosmetically rewritten into
 * apparent compliance.
 *
 * Any semantic violation rejects the entire candidate. Rejected raw text is not
 * returned to callers.
 */
export function guardReleaseGeneratedText(
  template: BleizReleaseTemplate,
  candidate: string,
): ReleaseOutputGuardResult {
  const patterns = [...UNIVERSAL_PATTERNS, ...patternsFor(template.semanticAuthority)];
  const lexical = filterGeneratedText(template, candidate);

  const violationsById = new Map<string, ReleaseOutputViolation>();
  for (const rule of patterns) {
    if (rule.pattern.test(candidate) || rule.pattern.test(lexical.text)) {
      violationsById.set(rule.id, {
        id: rule.id,
        semanticAuthority: template.semanticAuthority,
        description: rule.description,
      });
    }
  }

  const violations = [...violationsById.values()];
  if (violations.length > 0) {
    return {
      decision: 'REJECT',
      text: null,
      blockedTerms: lexical.blockedTerms,
      violations,
    };
  }

  return {
    decision: 'ALLOW',
    text: lexical.text,
    blockedTerms: lexical.blockedTerms,
    violations: [],
  };
}
