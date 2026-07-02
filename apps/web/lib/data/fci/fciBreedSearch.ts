import type { FciBreed } from './fciBreed.schema';
import { MOCK_FCI_BREEDS } from './mockFciBreeds';

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export interface FciBreedSearchOptions {
  limit?: number;
  groupNumber?: number;
}

export function searchFciBreeds(
  query: string,
  breeds: FciBreed[] = MOCK_FCI_BREEDS,
  options: FciBreedSearchOptions = {},
): FciBreed[] {
  const limit = options.limit ?? 10;
  const q = normalize(query);
  if (!q) return [];

  return breeds
    .filter((breed) => options.groupNumber == null || breed.group_number === options.groupNumber)
    .map((breed) => {
      const haystack = normalize([
        breed.breed_name_original,
        breed.breed_name_fr,
        breed.breed_name_en,
        breed.group_name,
        breed.country_of_origin,
      ].filter(Boolean).join(' '));
      const starts = haystack.startsWith(q) ? 4 : 0;
      const includes = haystack.includes(q) ? 2 : 0;
      const tokenHits = q.split(/\s+/).filter((token) => haystack.includes(token)).length;
      return { breed, score: starts + includes + tokenHits };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.breed.breed_name_original.localeCompare(b.breed.breed_name_original))
    .slice(0, limit)
    .map((item) => item.breed);
}

export function findFciBreedById(id: string, breeds: FciBreed[] = MOCK_FCI_BREEDS): FciBreed | null {
  return breeds.find((breed) => breed.id === id) ?? null;
}
