/**
 * Explainable Regional Pack evidence report.
 *
 * This module turns existing release gates into a machine-readable report for
 * developer/admin surfaces. It creates no new authority and does not bypass
 * identity, language, rights or provenance gates.
 */

import {
  getBreizSource,
  type BreizSourceRightsBlocker,
} from '../data/breiz/sourceRegistry';
import {
  evaluateRegionalSourceReadiness,
  type RegionalSourceEffectiveBlocker,
  type RegionalSourceReadinessScope,
} from './regional-source-readiness';
import {
  evaluateRegionalPackReleaseReadiness,
  isRegionalIdentityEvidenceReleaseReady,
  type RegionalDataDomain,
  type RegionalPack,
  type RegionalPackReleaseBlocker,
} from './regional-pack';
import { getVerifiedRegionalLexicon } from './regional-lexicon';

export type RegionalDomainEvidenceStatus = 'READY' | 'BLOCKED' | 'UNBOUND';

export interface RegionalPackSourceEvidence {
  sourceId: string;
  sourceKnown: boolean;
  domains: readonly RegionalDataDomain[];
  purpose: string;
  ingestionPermitted: boolean;
  releaseReady: boolean;
  rightsBlockers: readonly BreizSourceRightsBlocker[];
  readinessKind: RegionalSourceReadinessScope['kind'];
  scopedResourceIds: readonly string[];
  readyScopedResourceIds: readonly string[];
  effectiveBlockers: readonly RegionalSourceEffectiveBlocker[];
  evidenceState: string | null;
  disposition: string | null;
  recheckAt: string | null;
}

export interface RegionalPackDomainEvidence {
  domain: RegionalDataDomain;
  required: boolean;
  status: RegionalDomainEvidenceStatus;
  candidateSourceIds: readonly string[];
  releaseReadySourceIds: readonly string[];
}

export interface RegionalPackIdentityEvidence {
  assistantName: string;
  reviewStatus: string;
  releaseReady: boolean;
  reviewedAt: string | null;
  reviewerRole: string | null;
  reviewerReferencePresent: boolean;
  reviewReceiptPresent: boolean;
}

export interface RegionalPackEvidenceReport {
  packId: string;
  regionId: string;
  profileStatus: string;
  identity: RegionalPackIdentityEvidence;
  verifiedRegionalTermCount: number;
  releaseReady: boolean;
  releaseBlockers: readonly RegionalPackReleaseBlocker[];
  unknownSourceIds: readonly string[];
  sources: readonly RegionalPackSourceEvidence[];
  domains: readonly RegionalPackDomainEvidence[];
}

export function buildRegionalPackEvidenceReport(
  pack: RegionalPack,
  nowMs: number = Date.now(),
): RegionalPackEvidenceReport {
  const verdict = evaluateRegionalPackReleaseReadiness(pack, nowMs);
  const sources: RegionalPackSourceEvidence[] = [];

  for (const binding of pack.sourceBindings) {
    const readiness = evaluateRegionalSourceReadiness(binding, nowMs);
    const source = getBreizSource(binding.sourceId);
    const evidence = source?.rightsEvidence;

    sources.push({
      sourceId: binding.sourceId,
      sourceKnown: readiness.sourceKnown,
      domains: binding.domains,
      purpose: binding.purpose,
      ingestionPermitted: readiness.effectiveIngestionPermitted,
      releaseReady: readiness.releaseReady,
      rightsBlockers: readiness.sourceRightsBlockers,
      readinessKind: readiness.readinessKind,
      scopedResourceIds: readiness.scopedResourceIds,
      readyScopedResourceIds: readiness.readyScopedResourceIds,
      effectiveBlockers: readiness.effectiveBlockers,
      evidenceState: evidence?.evidenceState ?? null,
      disposition: evidence?.disposition ?? null,
      recheckAt: evidence?.recheckAt ?? null,
    });
  }

  const domainUniverse = new Set<RegionalDataDomain>([
    ...pack.requiredDataDomains,
    ...pack.sourceBindings.flatMap((binding) => binding.domains),
  ]);

  const domains: RegionalPackDomainEvidence[] = [...domainUniverse].map((domain) => {
    const candidates = sources.filter((source) => source.domains.includes(domain));
    const releaseReadySourceIds = candidates
      .filter((source) => source.releaseReady)
      .map((source) => source.sourceId);

    return {
      domain,
      required: pack.requiredDataDomains.includes(domain),
      status:
        candidates.length === 0
          ? 'UNBOUND'
          : releaseReadySourceIds.length > 0
            ? 'READY'
            : 'BLOCKED',
      candidateSourceIds: candidates.map((source) => source.sourceId),
      releaseReadySourceIds,
    };
  });

  return {
    packId: pack.id,
    regionId: pack.regionId,
    profileStatus: pack.profile.status,
    identity: {
      assistantName: pack.profile.assistantName,
      reviewStatus: pack.identityEvidence.status,
      releaseReady: isRegionalIdentityEvidenceReleaseReady(pack, nowMs),
      reviewedAt: pack.identityEvidence.reviewedAt,
      reviewerRole: pack.identityEvidence.reviewerRole,
      reviewerReferencePresent: Boolean(pack.identityEvidence.reviewerRef?.trim()),
      reviewReceiptPresent: Boolean(pack.identityEvidence.reviewReceipt?.trim()),
    },
    verifiedRegionalTermCount: getVerifiedRegionalLexicon(pack.regionId).length,
    releaseReady: verdict.releaseReady,
    releaseBlockers: verdict.blockers,
    unknownSourceIds: verdict.unknownSourceIds,
    sources,
    domains,
  };
}
