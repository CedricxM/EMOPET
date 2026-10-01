/**
 * Explainable Regional Pack evidence report.
 *
 * This module turns the existing release gates into a machine-readable report
 * for developer/admin surfaces. It does not create new authority.
 */

import {
  evaluateBreizSourceRights,
  getBreizSource,
  isBreizSourceReleaseReady,
  type BreizSourceRightsBlocker,
} from '../data/breiz/sourceRegistry';
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
  status: string;
  releaseReady: boolean;
  exactAssistantName: string;
  exactAssistantNameOrigin: string;
  exactNamingRule: string;
  reviewerRole: string | null;
  reviewerRef: string | null;
  reviewedAt: string | null;
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
    const source = getBreizSource(binding.sourceId);

    if (!source) {
      sources.push({
        sourceId: binding.sourceId,
        sourceKnown: false,
        domains: binding.domains,
        purpose: binding.purpose,
        ingestionPermitted: false,
        releaseReady: false,
        rightsBlockers: [],
        evidenceState: null,
        disposition: null,
        recheckAt: null,
      });
      continue;
    }

    const rights = evaluateBreizSourceRights(source);
    const evidence = source.rightsEvidence;

    sources.push({
      sourceId: source.id,
      sourceKnown: true,
      domains: binding.domains,
      purpose: binding.purpose,
      ingestionPermitted: rights.ingestionPermitted,
      releaseReady: isBreizSourceReleaseReady(source, nowMs),
      rightsBlockers: rights.blockers,
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
      status: pack.identityEvidence.status,
      releaseReady: isRegionalIdentityEvidenceReleaseReady(pack, nowMs),
      exactAssistantName: pack.identityEvidence.exactAssistantName,
      exactAssistantNameOrigin: pack.identityEvidence.exactAssistantNameOrigin,
      exactNamingRule: pack.identityEvidence.exactNamingRule,
      reviewerRole: pack.identityEvidence.reviewerRole,
      reviewerRef: pack.identityEvidence.reviewerRef,
      reviewedAt: pack.identityEvidence.reviewedAt,
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
