/**
 * Breed Normalizer for Bleiz Content Engine
 *
 * Normalizes breed references in DogContext and BleizTargeting
 * using VBO breed_canonical data. Ensures that "Bouledogue Français"
 * matches "French Bulldog" matches FCI 101.
 *
 * Integration points:
 * - DogContext.breed → normalized via breed_slug
 * - BleizTargeting.breed → resolved against slugs + synonyms
 * - Template evaluation → breed references in prompts normalized
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface BreedCanonicalEntry {
  vbo_id: string;
  display_name: string;
  breed_slug: string;
  synonyms: string[];
  fci_number: number | null;
}

export interface NormalizedBreed {
  slug: string;
  display_name: string;
  vbo_id: string;
  fci_number: number | null;
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

// ─── Breed Normalizer ───────────────────────────────────────────────

export class BreedNormalizer {
  private slugMap: Map<string, BreedCanonicalEntry>;
  private synonymMap: Map<string, BreedCanonicalEntry>;

  constructor(breeds: BreedCanonicalEntry[]) {
    this.slugMap = new Map();
    this.synonymMap = new Map();

    for (const breed of breeds) {
      this.slugMap.set(breed.breed_slug, breed);
      this.synonymMap.set(normalize(breed.display_name), breed);
      for (const syn of breed.synonyms) {
        this.synonymMap.set(normalize(syn), breed);
      }
    }
  }

  /**
   * Resolve a raw breed string to its canonical form.
   * Used during template evaluation to normalize DogContext.breed.
   */
  normalize(input: string): NormalizedBreed | null {
    if (!input) return null;

    const slug = toSlug(input);
    const norm = normalize(input);

    // Try slug match first
    const bySlug = this.slugMap.get(slug);
    if (bySlug) {
      return {
        slug: bySlug.breed_slug,
        display_name: bySlug.display_name,
        vbo_id: bySlug.vbo_id,
        fci_number: bySlug.fci_number,
      };
    }

    // Try synonym match
    const bySynonym = this.synonymMap.get(norm);
    if (bySynonym) {
      return {
        slug: bySynonym.breed_slug,
        display_name: bySynonym.display_name,
        vbo_id: bySynonym.vbo_id,
        fci_number: bySynonym.fci_number,
      };
    }

    // Partial match: check if input is a substring of any slug
    for (const [s, breed] of this.slugMap) {
      if (s.includes(slug) || slug.includes(s)) {
        return {
          slug: breed.breed_slug,
          display_name: breed.display_name,
          vbo_id: breed.vbo_id,
          fci_number: breed.fci_number,
        };
      }
    }

    return null;
  }

  /**
   * Check if a breed string matches any entry in a targeting list.
   * Used by BleizTargeting.breed matching.
   *
   * Both the targeting list entries and the input breed are resolved
   * to slugs before comparison, so "labrador" matches "Labrador Retriever".
   */
  matchesTargeting(breedInput: string, targetingSlugs: string[]): boolean {
    const normalized = this.normalize(breedInput);
    if (!normalized) {
      // Fallback: direct slug comparison
      const inputSlug = toSlug(breedInput);
      return targetingSlugs.some((t) => toSlug(t) === inputSlug);
    }

    // Check if any targeting entry resolves to the same breed
    for (const target of targetingSlugs) {
      const targetNorm = this.normalize(target);
      if (targetNorm && targetNorm.slug === normalized.slug) return true;
      // Also check direct slug match
      if (toSlug(target) === normalized.slug) return true;
    }

    return false;
  }

  get breedCount(): number {
    return this.slugMap.size;
  }
}

/**
 * Create a BreedNormalizer from breed_canonical JSON data.
 * This is loaded once at startup and shared across all Bleiz evaluations.
 */
export function createBreedNormalizer(breeds: BreedCanonicalEntry[]): BreedNormalizer {
  return new BreedNormalizer(breeds);
}
