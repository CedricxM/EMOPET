/**
 * Chargement + normalisation du référentiel des races (server-only).
 *
 * Source : `data/breed_profiles.json` (dérivé FCI, 335 races). On NE reconstruit
 * pas la liste « de mémoire » et on n'invente aucune valeur. `VERIFIED` exige
 * n° de standard + groupe + pays ; sinon `PENDING_VERIFIED`. Morphologie : `null`
 * si non mappable de façon sûre.
 *
 * ⚠ Le référentiel n'est PAS complet (335/354 races FCI) : un import partiel mais
 * juste vaut mieux qu'un import complet mais faux.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { mapCoat, mapSize } from '../breeds';
import type { Breed } from '../breeds';

const SOURCE = 'EMOPET breed_profiles (dérivé FCI)';
const SOURCE_VERSION = '2026-04';

interface RawBreed {
  fci_number?: number;
  breed_name_fr?: string;
  breed_name_en?: string;
  fci_group?: number;
  country_origin?: string;
  morphology?: { size_class?: string; coat_type?: string; is_brachycephalic?: boolean };
}

let cache: Breed[] | null = null;

function normalize(r: RawBreed): Breed {
  const m = r.morphology ?? {};
  const fciStandardNumber = typeof r.fci_number === 'number' ? r.fci_number : null;
  const fciGroup = r.fci_group != null ? String(r.fci_group) : null;
  const countryOfOrigin = r.country_origin?.trim() || null;
  const nameFr = r.breed_name_fr?.trim() || null;
  const nameOfficial = nameFr || r.breed_name_en?.trim() || 'Race inconnue';
  const verified = fciStandardNumber != null && fciGroup != null && !!countryOfOrigin;
  return {
    id: `fci-${fciStandardNumber ?? nameOfficial.toLowerCase().replace(/\s+/g, '-')}`,
    fciStandardNumber,
    nameOfficial,
    nameFr,
    fciGroup,
    countryOfOrigin,
    coatTypeDefault: mapCoat(m.coat_type),
    sizeCategory: mapSize(m.size_class),
    morphologyNotes: m.is_brachycephalic ? 'Race brachycéphale (museau court).' : null,
    source: SOURCE,
    sourceVersion: SOURCE_VERSION,
    verificationStatus: verified ? 'VERIFIED' : 'PENDING_VERIFIED',
  };
}

export function listBreeds(): Breed[] {
  if (cache) return cache;
  try {
    const path = join(process.cwd(), '..', '..', 'data', 'breed_profiles.json');
    const raw = JSON.parse(readFileSync(path, 'utf8')) as RawBreed[];
    cache = raw.map(normalize).sort((a, b) => a.nameOfficial.localeCompare(b.nameOfficial, 'fr'));
  } catch {
    cache = [];
  }
  return cache;
}

export function getBreed(id: string): Breed | undefined {
  return listBreeds().find((b) => b.id === id);
}

export function searchBreeds(q: string, limit = 20): Breed[] {
  const norm = q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (!norm) return listBreeds().slice(0, limit);
  return listBreeds()
    .filter((b) => `${b.nameOfficial} ${b.nameFr ?? ''}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(norm))
    .slice(0, limit);
}
