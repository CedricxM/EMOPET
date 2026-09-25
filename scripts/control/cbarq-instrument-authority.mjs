const AUTHORIZED_FORM_VARIANTS = new Set([
  'FULL_AUTHORIZED',
  'AUTHORIZED_SHORT_FORM',
  'RESEARCH_VARIANT',
]);

export function evaluateCbarqInstrumentAuthority(config, requestedUse) {
  if (!config || config.instrumentCode !== 'cbarq') {
    return { allowed: false, reason: 'instrument_mismatch' };
  }

  if (!AUTHORIZED_FORM_VARIANTS.has(config.formVariant)) {
    return { allowed: false, reason: 'form_variant_not_authorized' };
  }

  if (!config.instrumentVersion || !config.languageCode || !config.translationRevision) {
    return { allowed: false, reason: 'instrument_provenance_incomplete' };
  }

  if (!config.licenceAuthorityReference) {
    return { allowed: false, reason: 'licence_authority_missing' };
  }

  const useMap = {
    product_display: 'productDisplay',
    product_scoring: 'productScoring',
    item_level_storage: 'itemLevelStorage',
    repeated_longitudinal: 'repeatedLongitudinalAdministration',
    derivative_display: 'derivativeDisplays',
    research_administration: 'researchAdministration',
    publication_export: 'publicationExport',
  };

  const key = useMap[requestedUse];
  if (!key) {
    return { allowed: false, reason: 'unknown_requested_use' };
  }

  if (config.allowedUse?.[key] !== true) {
    return { allowed: false, reason: 'requested_use_not_authorized' };
  }

  if (config.formVariant === 'AUTHORIZED_SHORT_FORM' &&
      config.shortFormDisposition !== 'AUTHORIZED_SHORT_FORM') {
    return { allowed: false, reason: 'short_form_authority_mismatch' };
  }

  return { allowed: true, reason: 'explicit_authority_present' };
}
