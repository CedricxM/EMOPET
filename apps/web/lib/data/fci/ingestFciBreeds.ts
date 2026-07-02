import type { FciBreed, RawBreedProfileRecord, RawFciCsvRecord } from './fciBreed.schema';
import { validateFciBreed } from './fciBreed.schema';
import { normalizeFciBreedFromCsv, normalizeFciBreedFromProfile } from './normalizeFciBreed';

export interface FciIngestResult {
  breeds: FciBreed[];
  rejected: Array<{ index: number; errors: string[] }>;
}

function parseCsv(content: string): RawFciCsvRecord[] {
  const rows = content.split(/\r?\n/).filter((row) => row.trim());
  if (rows.length < 2) return [];
  const headers = rows[0]!.split(',').map((header) => header.trim());
  return rows.slice(1).map((row) => {
    const values = row.split(',').map((value) => value.trim());
    return headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = values[index] ?? '';
      return acc;
    }, {});
  });
}

export function ingestFciBreedsFromCsvContent(
  content: string,
  sourceFile = 'data/reference/fci_breeds.csv',
): FciIngestResult {
  const rawRecords = parseCsv(content);
  const breeds: FciBreed[] = [];
  const rejected: FciIngestResult['rejected'] = [];
  rawRecords.forEach((record, index) => {
    const breed = normalizeFciBreedFromCsv(record, sourceFile);
    const errors = validateFciBreed(breed);
    if (errors.length) rejected.push({ index, errors });
    else breeds.push(breed);
  });
  return { breeds, rejected };
}

export function ingestFciBreedsFromProfileRecords(
  records: RawBreedProfileRecord[],
  sourceFile = 'data/breed_profiles.json',
): FciIngestResult {
  const breeds: FciBreed[] = [];
  const rejected: FciIngestResult['rejected'] = [];
  records.forEach((record, index) => {
    const breed = normalizeFciBreedFromProfile(record, sourceFile);
    const errors = validateFciBreed(breed);
    if (errors.length) rejected.push({ index, errors });
    else breeds.push(breed);
  });
  return { breeds, rejected };
}
