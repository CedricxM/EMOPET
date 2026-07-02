import type { FciBreed, RawBreedProfileRecord, RawFciCsvRecord } from './fciBreed.schema';

const GROUP_NAMES: Record<number, string> = {
  1: 'Sheepdogs and Cattle Dogs',
  2: 'Pinscher, Schnauzer, Molossoid and Swiss Mountain Dogs',
  3: 'Terriers',
  4: 'Dachshunds',
  5: 'Spitz and Primitive Types',
  6: 'Scent Hounds and Related Breeds',
  7: 'Pointing Dogs',
  8: 'Retrievers, Flushing Dogs and Water Dogs',
  9: 'Companion and Toy Dogs',
  10: 'Sighthounds',
};

function parseNumber(value: number | string | null | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeSize(value: string | null | undefined): FciBreed['size_category_optional'] {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  if (['toy', 'tres petite', 'très petite'].includes(normalized)) return 'toy';
  if (['small', 'petite', 'petit'].includes(normalized)) return 'small';
  if (['medium', 'moyenne', 'moyen'].includes(normalized)) return 'medium';
  if (['large', 'grande', 'grand'].includes(normalized)) return 'large';
  if (['giant', 'geante', 'géante', 'geant', 'géant'].includes(normalized)) return 'giant';
  return null;
}

function normalizeCoatLength(coatType: string | null | undefined): FciBreed['coat_length_optional'] {
  if (!coatType) return null;
  if (coatType.includes('long')) return 'long';
  if (coatType.includes('short') || coatType.includes('smooth')) return 'short';
  return null;
}

export function normalizeFciBreedFromCsv(record: RawFciCsvRecord, sourceFile = 'data/reference/fci_breeds.csv'): FciBreed {
  const fciNumber = parseNumber(record.fci_number);
  const groupNumber = parseNumber(record.fci_group);
  const name = record.breed_name_fr || record.name || record.breed_name_en || 'Unknown breed';
  const now = new Date().toISOString();
  return {
    id: fciNumber != null ? `fci-${fciNumber}` : `fci-local-${slug(name)}`,
    fci_number: fciNumber,
    breed_name_original: name,
    breed_name_fr: record.breed_name_fr || record.name || null,
    breed_name_en: record.breed_name_en || null,
    group_number: groupNumber,
    group_name: groupNumber ? GROUP_NAMES[groupNumber] ?? null : null,
    section_number: null,
    section_name: null,
    country_of_origin: record.country_origin || null,
    standard_url_optional: null,
    source_file: sourceFile,
    source_license_note: 'Local project CSV. License review required before external redistribution.',
    size_category_optional: normalizeSize(record.size_class),
    coat_type_optional: null,
    coat_length_optional: null,
    morphology_notes_optional: null,
    created_at: now,
    updated_at: now,
  };
}

export function normalizeFciBreedFromProfile(
  record: RawBreedProfileRecord,
  sourceFile = 'data/breed_profiles.json',
): FciBreed {
  const fciNumber = parseNumber(record.fci_number);
  const groupNumber = parseNumber(record.fci_group);
  const name = record.breed_name_fr || record.breed_name_en || 'Unknown breed';
  const coatType = record.morphology?.coat_type ?? null;
  const notes = record.morphology?.is_brachycephalic ? 'Morphology note present in local reference.' : null;
  const now = new Date().toISOString();
  return {
    id: fciNumber != null ? `fci-${fciNumber}` : `fci-local-${slug(name)}`,
    fci_number: fciNumber,
    breed_name_original: name,
    breed_name_fr: record.breed_name_fr ?? null,
    breed_name_en: record.breed_name_en ?? null,
    group_number: groupNumber,
    group_name: groupNumber ? GROUP_NAMES[groupNumber] ?? null : null,
    section_number: null,
    section_name: null,
    country_of_origin: record.country_origin ?? null,
    standard_url_optional: null,
    source_file: sourceFile,
    source_license_note: 'Local EMOPET curated FCI-derived reference. Missing fields remain nullable.',
    size_category_optional: normalizeSize(record.morphology?.size_class),
    coat_type_optional: coatType,
    coat_length_optional: normalizeCoatLength(coatType),
    morphology_notes_optional: notes,
    created_at: now,
    updated_at: now,
  };
}
