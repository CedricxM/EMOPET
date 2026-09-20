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
 *
 * RÈGLE DE VÉRITÉ : « référentiel illisible » n'est pas « aucune race ».
 * Le même principe que l'absence d'invention de valeurs : si la source ne peut
 * pas être lue, on le dit, au lieu d'affirmer une liste vide. Un échec n'est
 * jamais mis en cache — sinon une indisponibilité passagère au premier appel
 * condamnerait tout le processus à répondre « aucune race » jusqu'à son
 * redémarrage, même une fois la source revenue.
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

/**
 * Le référentiel n'a pas pu être chargé. Distinct d'un référentiel vide : un
 * appelant peut dire « aucun résultat » pour une recherche infructueuse, jamais
 * pour un référentiel dont l'état n'a pas pu être établi.
 */
export class BreedReferenceUnavailableError extends Error {
  constructor(reason: string, options?: { cause?: unknown }) {
    super(`Référentiel des races indisponible : ${reason}. État inconnu, pas vide.`, options);
    this.name = 'BreedReferenceUnavailableError';
  }
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

  const path = join(process.cwd(), '..', '..', 'data', 'breed_profiles.json');

  let contents: string;
  try {
    contents = readFileSync(path, 'utf8');
  } catch (cause) {
    throw new BreedReferenceUnavailableError('source illisible', { cause });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch (cause) {
    throw new BreedReferenceUnavailableError('source JSON invalide', { cause });
  }

  if (!Array.isArray(parsed)) {
    throw new BreedReferenceUnavailableError('la source n’est pas un tableau');
  }

  // Le cache n'est renseigné que sur un chargement réussi : un échec reste
  // réessayable au prochain appel.
  cache = (parsed as RawBreed[])
    .map(normalize)
    .sort((a, b) => a.nameOfficial.localeCompare(b.nameOfficial, 'fr'));
  return cache;
}

/** Réinitialise le cache mémoire. Réservé aux tests. */
export function resetBreedCacheForTests(): void {
  cache = null;
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
