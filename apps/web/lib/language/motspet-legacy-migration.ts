/**
 * MotsPet legacy public-copy migration map.
 *
 * This map names known legacy UI strings that must not silently become
 * MotsPet authority. It does not authorise replacement wording.
 */

export type MotsPetLegacyMigrationDisposition =
  | 'OPEN_REMOVE_GLOBAL_INDEX_LANGUAGE'
  | 'OPEN_RENAME_WELLBEING_SURFACE'
  | 'OPEN_REVIEW_NAVIGATION_LABEL';

export interface MotsPetLegacyMigrationEntry {
  id: string;
  dictionaryPath: string;
  legacyFr: string;
  legacyEn: string;
  disposition: MotsPetLegacyMigrationDisposition;
  targetConceptId: string | null;
  rationale: string;
  authorityPaths: readonly string[];
}

const CARE_AUTHORITY = 'docs/product/EMOPET_CARE_PRODUCT_MASTER_v0.1.md';
const EXPERIENCE_AUTHORITY = 'docs/product/EMOPET_EXPERIENCE_DOCTRINE_v0.1.md';
const LANGUAGE_AUTHORITY =
  'docs/language/EMOPET_LANGUAGE_FOUNDER_DECISION_RECORD_2026-09-01.md';

export const MOTSPET_LEGACY_MIGRATION_MAP: readonly MotsPetLegacyMigrationEntry[] = [
  {
    id: 'dashboard_balance_index',
    dictionaryPath: 'dashboard.balanceIndex',
    legacyFr: "Indice d'équilibre (ELI)",
    legacyEn: 'Balance index (ELI)',
    disposition: 'OPEN_REMOVE_GLOBAL_INDEX_LANGUAGE',
    targetConceptId: null,
    rationale:
      'Current product doctrine rejects a generic global wellbeing/health score. A replacement must be composed from bounded observations, not a renamed global index.',
    authorityPaths: [CARE_AUTHORITY, EXPERIENCE_AUTHORITY, LANGUAGE_AUTHORITY],
  },
  {
    id: 'wellbeing_eyebrow',
    dictionaryPath: 'bienEtre.eyebrow',
    legacyFr: '⊙ Bien-être · ELI v6',
    legacyEn: '⊙ Well-being · ELI v6',
    disposition: 'OPEN_RENAME_WELLBEING_SURFACE',
    targetConceptId: null,
    rationale:
      'The historical surface name can imply a broad wellbeing verdict. Final navigation/surface naming remains an explicit product-language decision.',
    authorityPaths: [CARE_AUTHORITY, EXPERIENCE_AUTHORITY, LANGUAGE_AUTHORITY],
  },
  {
    id: 'wellbeing_title',
    dictionaryPath: 'bienEtre.title',
    legacyFr: 'Bien-être',
    legacyEn: 'Well-being',
    disposition: 'OPEN_RENAME_WELLBEING_SURFACE',
    targetConceptId: null,
    rationale:
      'A broad wellbeing title is not itself an observation contract and may overstate what the product can conclude.',
    authorityPaths: [CARE_AUTHORITY, EXPERIENCE_AUTHORITY],
  },
  {
    id: 'wellbeing_lead',
    dictionaryPath: 'bienEtre.lead',
    legacyFr:
      'Indicateurs de bien-être non médicaux, avec leur niveau de confiance.',
    legacyEn: 'Non-medical well-being indicators, with their confidence level.',
    disposition: 'OPEN_RENAME_WELLBEING_SURFACE',
    targetConceptId: 'confidence',
    rationale:
      'Confidence is controlled, but the generic wellbeing-indicator framing remains legacy and requires a bounded observation-based rewrite.',
    authorityPaths: [CARE_AUTHORITY, EXPERIENCE_AUTHORITY, LANGUAGE_AUTHORITY],
  },
  {
    id: 'nav_dashboard',
    dictionaryPath: 'nav.dashboard',
    legacyFr: 'ELI · Dashboard',
    legacyEn: 'ELI · Dashboard',
    disposition: 'OPEN_REVIEW_NAVIGATION_LABEL',
    targetConceptId: null,
    rationale:
      'Navigation should describe the user task/surface without reifying ELI as a universal score product.',
    authorityPaths: [CARE_AUTHORITY, EXPERIENCE_AUTHORITY],
  },
  {
    id: 'nav_wellbeing',
    dictionaryPath: 'nav.bienEtre',
    legacyFr: 'Bien-être · ELI v6',
    legacyEn: 'Well-being · ELI v6',
    disposition: 'OPEN_RENAME_WELLBEING_SURFACE',
    targetConceptId: null,
    rationale:
      'Navigation inherits the same broad wellbeing-claim risk as the underlying legacy surface.',
    authorityPaths: [CARE_AUTHORITY, EXPERIENCE_AUTHORITY, LANGUAGE_AUTHORITY],
  },
] as const;

export function getMotsPetLegacyMigrationEntry(
  dictionaryPath: string,
): MotsPetLegacyMigrationEntry | undefined {
  return MOTSPET_LEGACY_MIGRATION_MAP.find(
    (entry) => entry.dictionaryPath === dictionaryPath,
  );
}
