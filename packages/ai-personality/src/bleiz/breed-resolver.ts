/**
 * Breed Resolver for Freemium App
 *
 * Enhanced breed resolution with fuzzy matching, misspelling tolerance,
 * French/English variant support, and slang handling.
 *
 * Used in onboarding and Bleiz content targeting.
 */

import type { SizeClass } from '@emopet/shared';

// ─── Types ──────────────────────────────────────────────────────────

export interface BreedResolverEntry {
  breedId: string;
  displayNameFr: string;
  displayNameEn: string;
  sizeClass: SizeClass;
  fciNumber: number | null;
}

export interface ResolvedBreed {
  breedId: string;
  displayNameFr: string;
  displayNameEn: string;
  sizeClass: SizeClass;
  fciNumber: number | null;
  matchType: 'exact' | 'synonym' | 'partial' | 'fuzzy';
  confidence: number; // 0-1
}

// ─── Common aliases & misspellings ─────────────────────────────────

const BREED_ALIASES: Record<string, string> = {
  // Slang / abbreviations
  'staff': 'staffordshire-bull-terrier',
  'staffie': 'staffordshire-bull-terrier',
  'amstaff': 'american-staffordshire-terrier',
  'am staff': 'american-staffordshire-terrier',
  'lab': 'labrador-retriever',
  'labi': 'labrador-retriever',
  'golden': 'golden-retriever',
  'bouledogue': 'bouledogue-francais',
  'frenchie': 'bouledogue-francais',
  'bulldog francais': 'bouledogue-francais',
  'bouldog francais': 'bouledogue-francais',
  'french bulldog': 'bouledogue-francais',
  'english bulldog': 'bouledogue-anglais',
  'bulldog anglais': 'bouledogue-anglais',
  'cavalier': 'cavalier-king-charles-spaniel',
  'ckc': 'cavalier-king-charles-spaniel',
  'jack russell': 'jack-russell-terrier',
  'jack': 'jack-russell-terrier',
  'jrt': 'jack-russell-terrier',
  'york': 'yorkshire-terrier',
  'yorkie': 'yorkshire-terrier',
  'berger allemand': 'berger-allemand',
  'german shepherd': 'berger-allemand',
  'gsd': 'berger-allemand',
  'ba': 'berger-allemand',
  'berger australien': 'berger-australien',
  'aussie': 'berger-australien',
  'australian shepherd': 'berger-australien',
  'border': 'border-collie',
  'bc': 'border-collie',
  'husky': 'husky-siberien',
  'siberian husky': 'husky-siberien',
  'malinois': 'berger-belge-malinois',
  'mali': 'berger-belge-malinois',
  'belgian malinois': 'berger-belge-malinois',
  'shih tzu': 'shih-tzu',
  'shihtzu': 'shih-tzu',
  'bouvier': 'bouvier-bernois',
  'bernese': 'bouvier-bernois',
  'bernese mountain dog': 'bouvier-bernois',
  'rott': 'rottweiler',
  'rottie': 'rottweiler',
  'dogue allemand': 'dogue-allemand',
  'great dane': 'dogue-allemand',
  'teckel': 'teckel',
  'dachshund': 'teckel',
  'saucisse': 'teckel',
  'caniche': 'caniche',
  'poodle': 'caniche',
  'cocker': 'cocker-anglais',
  'english cocker': 'cocker-anglais',
  'setter': 'setter-anglais',
  'english setter': 'setter-anglais',
  'epagneul breton': 'epagneul-breton',
  'brittany': 'epagneul-breton',
  'breton': 'epagneul-breton',
  'beagle': 'beagle',
  'chihuahua': 'chihuahua',
  'chiwawa': 'chihuahua',
  'chiouaoua': 'chihuahua',
  'carlin': 'carlin',
  'pug': 'carlin',
  'dalmatien': 'dalmatien',
  'dalmatian': 'dalmatien',
  'boxer': 'boxer',
  'dobermann': 'dobermann',
  'doberman': 'dobermann',
  'dobe': 'dobermann',
  'akita': 'akita-inu',
  'akita inu': 'akita-inu',
  'shiba': 'shiba-inu',
  'shiba inu': 'shiba-inu',
  'samoyede': 'samoyede',
  'samoyed': 'samoyede',
  'corgi': 'corgi-pembroke',
  'welsh corgi': 'corgi-pembroke',
  'bichon': 'bichon-frise',
  'westie': 'west-highland-white-terrier',
  'west highland': 'west-highland-white-terrier',
  'westy': 'west-highland-white-terrier',
  'schnauzer': 'schnauzer-nain',
  'mini schnauzer': 'schnauzer-nain',
  'whippet': 'whippet',
  'greyhound': 'levrier-greyhound',
  'levrier': 'levrier-greyhound',
  'basset': 'basset-hound',
  'shar pei': 'shar-pei',
  'sharpei': 'shar-pei',
  'chow chow': 'chow-chow',
  'chow': 'chow-chow',
  'dogue de bordeaux': 'dogue-de-bordeaux',
  'cane corso': 'cane-corso',
  'corso': 'cane-corso',
  'leonberg': 'leonberg',
  'leonberger': 'leonberg',
  'bull terrier': 'bull-terrier',
  'boston terrier': 'boston-terrier',
  'boston': 'boston-terrier',
  'pekinois': 'pekinois',
  'pekingese': 'pekinois',
  'spitz': 'spitz-nain',
  'spitz nain': 'spitz-nain',
  'pomeranian': 'spitz-nain',
  'pom': 'spitz-nain',
  'coton': 'coton-de-tulear',
  'coton de tulear': 'coton-de-tulear',
  'shetland': 'berger-des-shetland',
  'sheltie': 'berger-des-shetland',
  'colley': 'colley',
  'collie': 'colley',
  'lassie': 'colley',
  'berger blanc suisse': 'berger-blanc-suisse',
  'white swiss shepherd': 'berger-blanc-suisse',
  'braque de weimar': 'braque-de-weimar',
  'weimaraner': 'braque-de-weimar',
  'pointer': 'pointer',
  'setter irlandais': 'setter-irlandais',
  'irish setter': 'setter-irlandais',
  'ridgeback': 'rhodesian-ridgeback',
  'rhodesian': 'rhodesian-ridgeback',
  'saint bernard': 'saint-bernard',
  'saint-bernard': 'saint-bernard',
  'malamute': 'malamute',
  'alaskan malamute': 'malamute',
  'fox terrier': 'fox-terrier',
  'cairn': 'cairn-terrier',
  'scottish terrier': 'scottish-terrier',
  'scottie': 'scottish-terrier',
  'airedale': 'airedale-terrier',
  'briard': 'briard',
  'beauceron': 'beauceron',
  'bas rouge': 'beauceron',
  'flat coated': 'flat-coated-retriever',
  'flat': 'flat-coated-retriever',
  'lagotto': 'lagotto-romagnolo',
  'terre neuve': 'terre-neuve',
  'newfoundland': 'terre-neuve',
  'montagne des pyrenees': 'montagne-des-pyrenees',
  'patou': 'montagne-des-pyrenees',
  'great pyrenees': 'montagne-des-pyrenees',
  'dogue du tibet': 'dogue-du-tibet',
  'tibetan mastiff': 'dogue-du-tibet',
  'hovawart': 'hovawart',
  'eurasier': 'eurasier',
  'vizsla': 'vizsla',
  'braque hongrois': 'vizsla',
  'braque allemand': 'braque-allemand',
  'german shorthaired pointer': 'braque-allemand',
  'springer': 'springer-anglais',
  'english springer': 'springer-anglais',
  'kerry blue': 'kerry-blue-terrier',
  'nova scotia': 'nova-scotia',
  'toller': 'nova-scotia',

  // Mixed breed shortcuts
  'croise': 'croise-moyen',
  'batard': 'croise-moyen',
  'corniaud': 'croise-moyen',
  'labradoodle': 'labradoodle',
  'cockapoo': 'cockapoo',
  'goldendoodle': 'goldendoodle',
  'pomsky': 'pomsky',
  'maltipoo': 'maltipoo',
  'cavapoo': 'cavapoo',
  'bernedoodle': 'bernedoodle',
  'aussiedoodle': 'aussiedoodle',
  'shorkie': 'shorkie',
  'puggle': 'puggle',
  'morkie': 'morkie',
};

// ─── Helpers ────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function toSlug(s: string): string {
  return normalize(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Levenshtein distance for fuzzy matching.
 * Returns edit distance between two strings.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array<number>(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i]![j] = a[i - 1] === b[j - 1]
        ? dp[i - 1]![j - 1]!
        : 1 + Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!);
    }
  }

  return dp[m]![n]!;
}

// ─── Mixed breed size selector ─────────────────────────────────────

const MIXED_BREED_BY_SIZE: Record<string, string> = {
  xs: 'croise-petit',
  small: 'croise-petit',
  medium: 'croise-moyen',
  large: 'croise-grand',
  giant: 'croise-geant',
};

// ─── Breed Resolver ────────────────────────────────────────────────

export class BreedResolver {
  private entries: Map<string, BreedResolverEntry>; // breedId → entry
  private slugIndex: Map<string, string>; // normalized slug → breedId
  private nameIndex: Map<string, string>; // normalized name → breedId

  constructor(breeds: BreedResolverEntry[]) {
    this.entries = new Map();
    this.slugIndex = new Map();
    this.nameIndex = new Map();

    for (const breed of breeds) {
      this.entries.set(breed.breedId, breed);
      this.slugIndex.set(toSlug(breed.displayNameFr), breed.breedId);
      this.slugIndex.set(toSlug(breed.displayNameEn), breed.breedId);
      this.nameIndex.set(normalize(breed.displayNameFr), breed.breedId);
      this.nameIndex.set(normalize(breed.displayNameEn), breed.breedId);
    }
  }

  /**
   * Resolve a breed input string to a known breed.
   *
   * Handles:
   * - Exact match: "Labrador" → Labrador Retriever
   * - Alias/slang: "Staff" → Staffordshire Bull Terrier
   * - Common misspellings: "Bouldog Francais" → Bouledogue Français
   * - French/English variants: "French Bulldog" → Bouledogue Français
   * - Partial match: "Berger" → first matching Berger breed
   */
  resolve(input: string): ResolvedBreed | null {
    if (!input || !input.trim()) return null;

    const norm = normalize(input);
    const slug = toSlug(input);

    // 1. Exact slug match
    const bySlug = this.slugIndex.get(slug);
    if (bySlug) {
      const entry = this.entries.get(bySlug)!;
      return { ...entry, matchType: 'exact', confidence: 1.0 };
    }

    // 2. Exact name match
    const byName = this.nameIndex.get(norm);
    if (byName) {
      const entry = this.entries.get(byName)!;
      return { ...entry, matchType: 'exact', confidence: 1.0 };
    }

    // 3. Known alias/slang
    const aliasId = BREED_ALIASES[norm];
    if (aliasId) {
      const entry = this.entries.get(aliasId);
      if (entry) {
        return { ...entry, matchType: 'synonym', confidence: 0.95 };
      }
    }

    // 4. Partial slug match (input is substring of breed or vice versa)
    const partialMatches: Array<{ entry: BreedResolverEntry; score: number }> = [];
    for (const [s, breedId] of this.slugIndex) {
      if (s.includes(slug) || slug.includes(s)) {
        const entry = this.entries.get(breedId)!;
        const overlapRatio = Math.min(slug.length, s.length) / Math.max(slug.length, s.length);
        partialMatches.push({ entry, score: overlapRatio });
      }
    }
    if (partialMatches.length > 0) {
      partialMatches.sort((a, b) => b.score - a.score);
      const best = partialMatches[0]!;
      return { ...best.entry, matchType: 'partial', confidence: Math.min(0.9, best.score) };
    }

    // 5. Fuzzy match (Levenshtein distance)
    let bestFuzzy: { entry: BreedResolverEntry; distance: number } | null = null;
    for (const [s, breedId] of this.slugIndex) {
      const dist = levenshtein(slug, s);
      const maxLen = Math.max(slug.length, s.length);
      // Allow up to 30% edits
      if (dist <= maxLen * 0.3) {
        if (!bestFuzzy || dist < bestFuzzy.distance) {
          bestFuzzy = { entry: this.entries.get(breedId)!, distance: dist };
        }
      }
    }
    if (bestFuzzy) {
      const maxLen = Math.max(slug.length, toSlug(bestFuzzy.entry.displayNameFr).length);
      const confidence = 1 - (bestFuzzy.distance / maxLen);
      return { ...bestFuzzy.entry, matchType: 'fuzzy', confidence: Math.max(0.5, confidence) };
    }

    return null;
  }

  /**
   * Get all breeds matching a partial input (for autocomplete).
   * Returns up to `limit` results sorted by relevance.
   */
  search(input: string, limit = 10): ResolvedBreed[] {
    if (!input || input.trim().length < 2) return [];

    const norm = normalize(input);
    const results: ResolvedBreed[] = [];

    for (const [breedId, entry] of this.entries) {
      const frNorm = normalize(entry.displayNameFr);
      const enNorm = normalize(entry.displayNameEn);

      if (frNorm.includes(norm) || enNorm.includes(norm) || breedId.includes(toSlug(input))) {
        const exactStart = frNorm.startsWith(norm) || enNorm.startsWith(norm);
        results.push({
          ...entry,
          matchType: 'partial',
          confidence: exactStart ? 0.9 : 0.7,
        });
      }
    }

    results.sort((a, b) => b.confidence - a.confidence);
    return results.slice(0, limit);
  }

  /**
   * Resolve a mixed-breed dog by size class.
   * Used when user selects "Je ne sais pas" during onboarding.
   */
  resolveMixed(sizeClass: SizeClass): ResolvedBreed | null {
    const breedId = MIXED_BREED_BY_SIZE[sizeClass];
    if (!breedId) return null;

    const entry = this.entries.get(breedId);
    if (!entry) return null;

    return { ...entry, matchType: 'exact', confidence: 0.8 };
  }

  get breedCount(): number {
    return this.entries.size;
  }
}

/**
 * Create a BreedResolver from breed knowledge data.
 * Loaded once at startup and shared across all evaluations.
 */
export function createBreedResolver(breeds: BreedResolverEntry[]): BreedResolver {
  return new BreedResolver(breeds);
}
