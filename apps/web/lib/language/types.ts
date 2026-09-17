export type TruthClass = 'OBSERVED' | 'DECLARED' | 'INTERPRETED' | 'EXTERNAL_CONTEXT';

export type EvidenceLevel =
  | 'measured'
  | 'preprocessed'
  | 'inferred'
  | 'mixed_or_inferred'
  | 'external_context'
  | 'unknown';

export type PublicationGate = 'VALID' | 'DEGRADED' | 'SUPPRESSED' | 'UNKNOWN';

export interface SemanticVersions {
  els: string;
  motspet: string;
  claimGuard: string;
  persona?: string;
}

export interface SemanticEvidenceEnvelope {
  truthClass: TruthClass;
  evidenceLevel: EvidenceLevel;
  publicationGate: PublicationGate;
  qualityState?: string;
  confidence?: string | number;
  provenance?: string[];
  freshness?: string;
  baselineReference?: string;
  missingModalities?: string[];
  allowedClaims?: string[];
  blockedClaims?: string[];
  semanticVersions: SemanticVersions;
}

/**
 * Determines whether the turn must enter the stricter semantic path.
 *
 * OBSERVED, DECLARED and INTERPRETED all require truth-class preservation.
 * A Guardian declaration must never be allowed to drift into an observed or
 * interpreted biological fact merely because it did not match a keyword regex.
 * Pure VALID external context can remain on the ordinary regional path, while
 * any non-VALID publication gate remains restricted.
 */
export function isEvidenceRestricted(envelope?: SemanticEvidenceEnvelope): boolean {
  if (!envelope) return false;
  return (
    envelope.truthClass === 'OBSERVED' ||
    envelope.truthClass === 'DECLARED' ||
    envelope.truthClass === 'INTERPRETED' ||
    envelope.publicationGate !== 'VALID'
  );
}

export function semanticEnvelopeSummary(envelope: SemanticEvidenceEnvelope): string {
  const parts = [
    `truthClass=${envelope.truthClass}`,
    `evidenceLevel=${envelope.evidenceLevel}`,
    `publicationGate=${envelope.publicationGate}`,
  ];
  if (envelope.qualityState) parts.push(`qualityState=${envelope.qualityState}`);
  if (envelope.confidence !== undefined) parts.push(`confidence=${String(envelope.confidence)}`);
  if (envelope.baselineReference) parts.push(`baselineReference=${envelope.baselineReference}`);
  if (envelope.missingModalities?.length) parts.push(`missingModalities=${envelope.missingModalities.join(',')}`);
  return parts.join('; ');
}
