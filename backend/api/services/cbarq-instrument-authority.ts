export type CbarqCapability =
  | 'PRODUCT_DISPLAY'
  | 'RESEARCH_ADMINISTRATION'
  | 'ITEM_STORAGE'
  | 'SCORING'
  | 'REPEATED_ADMINISTRATION'
  | 'DERIVATIVE_DISPLAY'
  | 'EXPORT_PUBLICATION';

export interface CbarqUseRequest {
  capability: CbarqCapability;
  languageCode: string;
  instrumentVersion: string;
  formVariantKey: string;
  scoringVersion?: string;
  administrationProtocolVersion?: string;
}

export type CbarqAuthorityDecision =
  | { allowed: true; status: 'AUTHORIZED'; reason: 'EXACT_AUTHORITY_MATCH' }
  | {
      allowed: false;
      status: 'DENIED' | 'UNAVAILABLE';
      reason:
        | 'INVALID_REQUEST'
        | 'AUTHORITY_NOT_CONFIGURED'
        | 'AUTHORITY_NOT_ESTABLISHED'
        | 'LICENCE_NOT_AUTHORIZED'
        | 'LICENCE_NOT_EFFECTIVE'
        | 'LICENCE_EXPIRED'
        | 'INSTRUMENT_VERSION_MISMATCH'
        | 'LANGUAGE_NOT_AUTHORIZED'
        | 'FORM_VARIANT_NOT_AUTHORIZED'
        | 'SHORT_FORM_NOT_AUTHORIZED'
        | 'SCORING_NOT_AUTHORIZED'
        | 'SCORING_VERSION_MISMATCH'
        | 'ADMIN_PROTOCOL_NOT_AUTHORIZED'
        | 'ADMIN_PROTOCOL_VERSION_MISMATCH'
        | 'CAPABILITY_NOT_AUTHORIZED';
    };

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function nonBlank(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function denied(
  reason: Extract<CbarqAuthorityDecision, { allowed: false }>['reason'],
  unavailable = false,
): CbarqAuthorityDecision {
  return { allowed: false, status: unavailable ? 'UNAVAILABLE' : 'DENIED', reason };
}

function parseDate(value: unknown): number | null {
  if (!nonBlank(value)) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const permissionKey: Record<CbarqCapability, string> = {
  PRODUCT_DISPLAY: 'productDisplay',
  RESEARCH_ADMINISTRATION: 'researchUse',
  ITEM_STORAGE: 'itemLevelStorage',
  SCORING: 'scoring',
  REPEATED_ADMINISTRATION: 'repeatedAdministration',
  DERIVATIVE_DISPLAY: 'derivativeDisplays',
  EXPORT_PUBLICATION: 'exportPublication',
};

function requiresAdministration(capability: CbarqCapability): boolean {
  return capability === 'PRODUCT_DISPLAY'
    || capability === 'RESEARCH_ADMINISTRATION'
    || capability === 'REPEATED_ADMINISTRATION';
}

function authorizedVariantFor(capability: CbarqCapability, state: unknown): boolean {
  if (capability === 'RESEARCH_ADMINISTRATION') {
    return state === 'FULL_AUTHORIZED'
      || state === 'AUTHORIZED_SHORT_FORM'
      || state === 'RESEARCH_VARIANT';
  }
  return state === 'FULL_AUTHORIZED' || state === 'AUTHORIZED_SHORT_FORM';
}

/**
 * Pure fail-closed authority evaluator for future C-BARQ integration.
 *
 * It does not fetch Penn data, grant a licence, or reproduce questionnaire text.
 * Callers must pass the controlled repository authority config or a future
 * server-side successor. Any missing/unknown field denies use.
 */
export function evaluateCbarqInstrumentUse(
  rawAuthority: unknown,
  rawRequest: unknown,
  now: number = Date.now(),
): CbarqAuthorityDecision {
  const authority = record(rawAuthority);
  const request = record(rawRequest);
  if (!authority) return denied('AUTHORITY_NOT_CONFIGURED', true);
  if (!request || !Number.isFinite(now)) return denied('INVALID_REQUEST');

  const capability = request.capability;
  if (!nonBlank(capability) || !(capability in permissionKey)) {
    return denied('INVALID_REQUEST');
  }
  const typedCapability = capability as CbarqCapability;

  for (const key of ['languageCode', 'instrumentVersion', 'formVariantKey']) {
    if (!nonBlank(request[key])) return denied('INVALID_REQUEST');
  }

  if (authority.runtimeDefault !== 'DENY_UNLESS_EXACT_AUTHORITY_MATCH') {
    return denied('AUTHORITY_NOT_ESTABLISHED', true);
  }
  if (authority.authorityStatus !== 'AUTHORIZED') {
    return denied('AUTHORITY_NOT_ESTABLISHED', true);
  }
  if (!nonBlank(authority.instrumentVersion)
      || authority.instrumentVersion !== request.instrumentVersion) {
    return denied('INSTRUMENT_VERSION_MISMATCH');
  }

  const licence = record(authority.licence);
  if (!licence || licence.status !== 'AUTHORIZED' || !nonBlank(licence.reference)) {
    return denied('LICENCE_NOT_AUTHORIZED');
  }
  if (licence.effectiveAt != null) {
    const effectiveAt = parseDate(licence.effectiveAt);
    if (effectiveAt == null || effectiveAt > now) return denied('LICENCE_NOT_EFFECTIVE');
  }
  if (licence.expiresAt != null) {
    const expiresAt = parseDate(licence.expiresAt);
    if (expiresAt == null || expiresAt <= now) return denied('LICENCE_EXPIRED');
  }

  const languages = Array.isArray(authority.languages) ? authority.languages : [];
  const language = languages
    .map(record)
    .find((entry) => entry?.languageCode === request.languageCode);
  if (!language || language.status !== 'AUTHORIZED'
      || !nonBlank(language.translationRevision)
      || !nonBlank(language.translationSource)) {
    return denied('LANGUAGE_NOT_AUTHORIZED');
  }

  const formVariants = Array.isArray(authority.formVariants) ? authority.formVariants : [];
  const variant = formVariants
    .map(record)
    .find((entry) => entry?.variantKey === request.formVariantKey);
  if (!variant) return denied('FORM_VARIANT_NOT_AUTHORIZED');
  if (request.formVariantKey === 'fr-2025-efa-63'
      && variant.disposition !== 'AUTHORIZED_SHORT_FORM') {
    return denied('SHORT_FORM_NOT_AUTHORIZED');
  }
  if (!authorizedVariantFor(typedCapability, variant.state)) {
    return denied('FORM_VARIANT_NOT_AUTHORIZED');
  }

  const permissions = record(authority.permissions);
  if (!permissions || permissions[permissionKey[typedCapability]] !== 'AUTHORIZED') {
    return denied('CAPABILITY_NOT_AUTHORIZED');
  }

  if (typedCapability === 'SCORING') {
    const scoring = record(authority.scoring);
    if (!scoring || scoring.status !== 'AUTHORIZED' || !nonBlank(scoring.methodReference)) {
      return denied('SCORING_NOT_AUTHORIZED');
    }
    if (!nonBlank(request.scoringVersion) || !nonBlank(scoring.version)
        || scoring.version !== request.scoringVersion) {
      return denied('SCORING_VERSION_MISMATCH');
    }
  }

  if (requiresAdministration(typedCapability)) {
    const protocol = record(authority.administrationProtocol);
    if (!protocol || protocol.status !== 'AUTHORIZED') {
      return denied('ADMIN_PROTOCOL_NOT_AUTHORIZED');
    }
    if (!nonBlank(request.administrationProtocolVersion)
        || !nonBlank(protocol.version)
        || protocol.version !== request.administrationProtocolVersion) {
      return denied('ADMIN_PROTOCOL_VERSION_MISMATCH');
    }
  }

  return { allowed: true, status: 'AUTHORIZED', reason: 'EXACT_AUTHORITY_MATCH' };
}
