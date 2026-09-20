/**
 * Controlled provenance for the current web ELI demonstration surface.
 *
 * The dashboard currently derives its displayed ELI values from
 * `apps/web/lib/eli/mock.ts`. These values are deterministic local demo data;
 * they are not MAT/TAG observations and are not produced by a backend ELI
 * runtime. Keep this declaration fail-closed until the authoritative runtime
 * path tracked by ELI-ARCH-01 (#118) is implemented and evidenced.
 */
export const ELI_WEB_MOCK_PROVENANCE = {
  classification: 'DEMO_MOCK_ONLY',
  authoritative: false,
  sourceModule: 'apps/web/lib/eli/mock.ts',
  matTagObservationSource: false,
  backendInferenceSource: false,
} as const;

export const ELI_WEB_MOCK_NOTICE =
  'Mode démonstration — les valeurs ELI affichées ici sont générées localement à partir de données simulées. Elles ne proviennent pas des capteurs MAT/TAG ni d’un calcul ELI backend.';
