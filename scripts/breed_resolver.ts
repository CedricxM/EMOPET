/**
 * Breed Resolver — Canonical breed lookup from user input
 *
 * Used during:
 * - Onboarding (user types breed name)
 * - Bleiz content generation (normalize breed references)
 * - Community matching (same breed / related breeds)
 *
 * Usage:
 *   import { createBreedResolver } from './breed_resolver';
 *   const resolver = await createBreedResolver('data/vbo/breed_canonical.json');
 *   const result = resolver.resolve('bouledogue français');
 *   // { vbo_id: 'VBO:...', display_name: 'French Bulldog', fci_number: 101 }
 */

import { readFileSync } from 'fs';

// ─── Types ──────────────────────────────────────────────────────────

export interface BreedCanonical {
  vbo_id: string;
  label: string;
  display_name: string;
  breed_slug: string;
  synonyms: string[];
  fci_number: number | null;
}

export interface BreedMatch {
  vbo_id: string;
  display_name: string;
  fci_number: number | null;
  match_type: 'exact_slug' | 'synonym' | 'fuzzy';
  confidence: number;
}

// ─── Helpers ────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function toSlug(s: string): string {
  return normalize(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// ─── Resolver ───────────────────────────────────────────────────────

export class BreedResolver {
  private slugMap: Map<string, BreedCanonical>;
  private synonymMap: Map<string, BreedCanonical>;
  private allSlugs: string[];

  constructor(breeds: BreedCanonical[]) {
    this.slugMap = new Map();
    this.synonymMap = new Map();

    for (const breed of breeds) {
      this.slugMap.set(breed.breed_slug, breed);
      // Also map normalized display name
      this.synonymMap.set(normalize(breed.display_name), breed);

      for (const syn of breed.synonyms) {
        this.synonymMap.set(normalize(syn), breed);
      }
    }

    this.allSlugs = Array.from(this.slugMap.keys());
  }

  resolve(input: string): BreedMatch | null {
    if (!input || !input.trim()) return null;

    const slug = toSlug(input);
    const norm = normalize(input);

    // 1. Exact slug match
    const exactSlug = this.slugMap.get(slug);
    if (exactSlug) {
      return {
        vbo_id: exactSlug.vbo_id,
        display_name: exactSlug.display_name,
        fci_number: exactSlug.fci_number,
        match_type: 'exact_slug',
        confidence: 1.0,
      };
    }

    // 2. Synonym match (case-insensitive, accent-stripped)
    const synMatch = this.synonymMap.get(norm);
    if (synMatch) {
      return {
        vbo_id: synMatch.vbo_id,
        display_name: synMatch.display_name,
        fci_number: synMatch.fci_number,
        match_type: 'synonym',
        confidence: 0.95,
      };
    }

    // 3. Fuzzy match (Levenshtein distance <= 2)
    let bestDist = Infinity;
    let bestBreed: BreedCanonical | null = null;

    for (const candidateSlug of this.allSlugs) {
      const dist = levenshtein(slug, candidateSlug);
      if (dist < bestDist) {
        bestDist = dist;
        bestBreed = this.slugMap.get(candidateSlug) || null;
      }
    }

    if (bestBreed && bestDist <= 2) {
      const confidence = Math.max(0.5, 1 - bestDist * 0.2);
      return {
        vbo_id: bestBreed.vbo_id,
        display_name: bestBreed.display_name,
        fci_number: bestBreed.fci_number,
        match_type: 'fuzzy',
        confidence,
      };
    }

    // 4. No match
    return null;
  }

  resolveByFci(fciNumber: number): BreedCanonical | null {
    for (const breed of this.slugMap.values()) {
      if (breed.fci_number === fciNumber) return breed;
    }
    return null;
  }

  get breedCount(): number {
    return this.slugMap.size;
  }
}

// ─── Factory ────────────────────────────────────────────────────────

export function createBreedResolver(jsonPath: string): BreedResolver {
  const data: BreedCanonical[] = JSON.parse(readFileSync(jsonPath, 'utf-8'));
  return new BreedResolver(data);
}

// ─── CLI Mode ───────────────────────────────────────────────────────

if (require.main === module) {
  const args = process.argv.slice(2);
  const jsonPath = args[0] || 'data/vbo/breed_canonical.json';
  const query = args.slice(1).join(' ');

  if (!query) {
    console.log('Usage: npx tsx scripts/breed_resolver.ts [json_path] <breed_name>');
    console.log('Example: npx tsx scripts/breed_resolver.ts "French Bulldog"');
    process.exit(0);
  }

  const resolver = createBreedResolver(jsonPath);
  console.log(`Loaded ${resolver.breedCount} breeds`);
  const result = resolver.resolve(query);
  if (result) {
    console.log(`Match: ${result.display_name} (${result.vbo_id})`);
    console.log(`  FCI: ${result.fci_number ?? 'N/A'}`);
    console.log(`  Type: ${result.match_type}, Confidence: ${result.confidence}`);
  } else {
    console.log(`No match found for "${query}"`);
  }
}
