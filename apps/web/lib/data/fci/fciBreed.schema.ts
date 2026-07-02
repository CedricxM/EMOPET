export interface FciBreed {
  id: string;
  fci_number: number | null;
  breed_name_original: string;
  breed_name_fr: string | null;
  breed_name_en: string | null;
  group_number: number | null;
  group_name: string | null;
  section_number: string | null;
  section_name: string | null;
  country_of_origin: string | null;
  standard_url_optional: string | null;
  source_file: string;
  source_license_note: string;
  size_category_optional: 'toy' | 'small' | 'medium' | 'large' | 'giant' | null;
  coat_type_optional: string | null;
  coat_length_optional: 'short' | 'medium' | 'long' | null;
  morphology_notes_optional: string | null;
  created_at: string;
  updated_at: string;
}

export interface RawFciCsvRecord {
  fci_group?: string;
  name?: string;
  country_origin?: string;
  size_class?: string;
  fci_number?: string;
  breed_name_fr?: string;
  breed_name_en?: string;
}

export interface RawBreedProfileRecord {
  fci_number?: number | null;
  breed_name_fr?: string | null;
  breed_name_en?: string | null;
  fci_group?: number | string | null;
  country_origin?: string | null;
  morphology?: {
    size_class?: string | null;
    coat_type?: string | null;
    is_brachycephalic?: boolean | null;
  } | null;
}

export function validateFciBreed(record: FciBreed): string[] {
  const errors: string[] = [];
  if (!record.id.trim()) errors.push('id is required');
  if (!record.breed_name_original.trim()) errors.push('breed_name_original is required');
  if (!record.source_file.trim()) errors.push('source_file is required');
  if (!record.source_license_note.trim()) errors.push('source_license_note is required');
  return errors;
}
