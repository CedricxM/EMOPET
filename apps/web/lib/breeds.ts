/**
 * Races — type canonique + mappages (purs, client ET serveur).
 *
 * ⚠ On N'INVENTE AUCUNE donnée de race. Les valeurs proviennent du référentiel
 * `data/breed_profiles.json` (dérivé FCI). Tout attribut non mappable de façon
 * sûre reste `null` (la déclaration du propriétaire prime — cf. interprétation ELI).
 */

export type CoatTypeDefault = 'court' | 'moyen' | 'long' | 'double';
export type SizeCategory = 'toy' | 'petit' | 'moyen' | 'grand' | 'geant';
export type VerificationStatus = 'VERIFIED' | 'PENDING_VERIFIED';

export interface Breed {
  id: string; // `fci-${number}`
  fciStandardNumber: number | null;
  nameOfficial: string;
  nameFr: string | null;
  fciGroup: string | null; // '1'..'10'
  countryOfOrigin: string | null;
  /** Défaut proposé à l'inscription ; jamais autoritaire. `null` si non sûr. */
  coatTypeDefault: CoatTypeDefault | null;
  sizeCategory: SizeCategory | null;
  /** Faits morphologiques, NON médicaux (ex. « race brachycéphale »). */
  morphologyNotes: string | null;
  source: string;
  sourceVersion: string;
  verificationStatus: VerificationStatus;
}

export const COAT_LABELS: Record<CoatTypeDefault, string> = { court: 'poil court', moyen: 'poil moyen', long: 'poil long', double: 'poil double' };
export const SIZE_LABELS: Record<SizeCategory, string> = { toy: 'très petit', petit: 'petit', moyen: 'moyen', grand: 'grand', geant: 'géant' };

/** coat_type brut (référentiel) → défaut sûr, sinon null (ne pas deviner). */
export function mapCoat(raw: string | null | undefined): CoatTypeDefault | null {
  switch (raw) {
    case 'smooth':
    case 'short':
      return 'court';
    case 'long':
      return 'long';
    case 'double_short':
    case 'double_long':
      return 'double';
    default:
      return null; // wire, curly, null → on laisse le propriétaire déclarer
  }
}

/** size_class brut → catégorie, sinon null. */
export function mapSize(raw: string | null | undefined): SizeCategory | null {
  switch (raw) {
    case 'toy':
    case 'toy_small':
      return 'toy';
    case 'small':
      return 'petit';
    case 'medium':
      return 'moyen';
    case 'large':
      return 'grand';
    case 'giant':
      return 'geant';
    default:
      return null;
  }
}
