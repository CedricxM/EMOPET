import {
  parseDatatourismeBretagneEventsResponse,
  type DatatourismeBretagneEventRecord,
} from './datatourismeEvents';
import { prepareDatatourismeBretagneEventsRequest } from './providerRequest';
import type { BreizSourceProvenance } from './sourceProvenance';
import {
  getBreizSource,
  isBreizSourceReleaseReady,
} from './sourceRegistry';

export type DatatourismeBretagneLoadStatus =
  | 'SOURCE_NOT_REGISTERED'
  | 'SOURCE_RIGHTS_HOLD'
  | 'REQUEST_NOT_READY'
  | 'HTTP_ERROR'
  | 'INVALID_RESPONSE'
  | 'OK';

export interface DatatourismeBretagneLoadedEvent {
  event: DatatourismeBretagneEventRecord;
  provenance: BreizSourceProvenance;
}

export interface DatatourismeBretagneLoadResult {
  status: DatatourismeBretagneLoadStatus;
  events: DatatourismeBretagneLoadedEvent[];
  rejectedCount: number;
  httpStatus?: number;
  note: string;
}

export interface DatatourismeBretagneLoaderOptions {
  page?: number;
  pageSize?: number;
  lang?: string;
  timeoutMs?: number;
  nowMs?: number;
  fetchImpl?: typeof fetch;
}

const DATATOURISME_SOURCE_ID = 'datatourisme';
const DATATOURISME_API_ORIGIN = 'https://api.datatourisme.fr';

function boundedTimeoutMs(value: number | undefined): number {
  if (value === undefined) return 8_000;
  if (!Number.isSafeInteger(value) || value < 500 || value > 20_000) {
    return 8_000;
  }
  return value;
}

function isExpectedDatatourismeRequestUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      parsed.origin === DATATOURISME_API_ORIGIN &&
      parsed.pathname === '/v1/entertainmentAndEvent'
    );
  } catch {
    return false;
  }
}

function buildProvenance(
  event: DatatourismeBretagneEventRecord,
  retrievedAt: string,
  responseContentType: string,
  language: string,
): BreizSourceProvenance | null {
  const source = getBreizSource(DATATOURISME_SOURCE_ID);
  const evidence = source?.rightsEvidence;
  if (
    !source ||
    !source.license ||
    source.freshnessHours === null ||
    !evidence ||
    !evidence.allowedProductUses.includes('INGESTION')
  ) {
    return null;
  }

  return {
    sourceId: source.id,
    sourceName: source.name,
    canonicalUrl: event.uri ?? source.canonicalUrl,
    publisher: event.producerAttribution,
    retrievedAt,
    sourceUpdatedAt: event.sourceUpdatedAt,
    territory: 'Bretagne',
    contentType: responseContentType || 'application/json',
    license: source.license,
    allowedUse: [...source.usagePolicy],
    attribution: event.producerAttribution,
    language,
    checksumSha256: null,
    rightsAuthorityRevision: evidence.authorityRevision,
    rightsImmutableSourceVersion: evidence.immutableSourceVersion,
    rightsReceiptPath: evidence.receiptPath,
    rightsAttributionText: evidence.attributionText,
    rightsPermittedUseSummary: evidence.permittedUseSummary,
    rightsAllowedProductUses: [...evidence.allowedProductUses],
    rightsReviewedAt: evidence.reviewedAt,
    rightsRecheckAt: evidence.recheckAt ?? null,
    rightsReviewerRole: evidence.reviewerRole,
    freshnessPolicyHours: source.freshnessHours,
    authority: source.authority,
  };
}

/**
 * Network boundary for the Bretagne DATAtourisme events slice.
 *
 * Order is deliberate:
 * 1. exact controlled source exists;
 * 2. source is release-ready under the immutable rights evidence gate;
 * 3. credentials/feature flag produce a bounded provider request;
 * 4. URL is re-checked before I/O;
 * 5. response is normalised/minimised;
 * 6. every retained event gets item-level attribution/freshness provenance.
 *
 * With the current registry this function MUST return SOURCE_RIGHTS_HOLD and
 * MUST NOT make a network call.
 */
export async function loadDatatourismeBretagneEvents(
  options: DatatourismeBretagneLoaderOptions = {},
): Promise<DatatourismeBretagneLoadResult> {
  const nowMs = options.nowMs ?? Date.now();
  const source = getBreizSource(DATATOURISME_SOURCE_ID);

  if (!source) {
    return {
      status: 'SOURCE_NOT_REGISTERED',
      events: [],
      rejectedCount: 0,
      note: 'DATAtourisme is not present in the controlled Breiz source registry.',
    };
  }

  if (!isBreizSourceReleaseReady(source, nowMs)) {
    return {
      status: 'SOURCE_RIGHTS_HOLD',
      events: [],
      rejectedCount: 0,
      note: 'DATAtourisme has no current release-ready rights evidence; no network request was made.',
    };
  }

  const request = prepareDatatourismeBretagneEventsRequest({
    page: options.page,
    pageSize: options.pageSize,
    lang: options.lang,
  });

  if (!request.ready || !isExpectedDatatourismeRequestUrl(request.url)) {
    return {
      status: 'REQUEST_NOT_READY',
      events: [],
      rejectedCount: 0,
      note: request.ready
        ? 'Prepared DATAtourisme request failed the fixed-origin/path check.'
        : `DATAtourisme request unavailable: ${request.reason}.`,
    };
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), boundedTimeoutMs(options.timeoutMs));

  let response: Response;
  try {
    response = await fetchImpl(request.url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...request.headers,
      },
      redirect: 'error',
      signal: controller.signal,
    });
  } catch {
    return {
      status: 'HTTP_ERROR',
      events: [],
      rejectedCount: 0,
      note: 'DATAtourisme request failed or timed out.',
    };
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    return {
      status: 'HTTP_ERROR',
      events: [],
      rejectedCount: 0,
      httpStatus: response.status,
      note: `DATAtourisme returned HTTP ${response.status}.`,
    };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return {
      status: 'INVALID_RESPONSE',
      events: [],
      rejectedCount: 0,
      httpStatus: response.status,
      note: 'DATAtourisme returned a non-JSON response.',
    };
  }

  const parsed = parseDatatourismeBretagneEventsResponse(payload);
  if (
    parsed.records.length === 0 &&
    parsed.rejected.some((entry) => entry.reason === 'invalid_catalog_envelope')
  ) {
    return {
      status: 'INVALID_RESPONSE',
      events: [],
      rejectedCount: parsed.rejected.length,
      httpStatus: response.status,
      note: 'DATAtourisme response did not match the controlled catalogue envelope.',
    };
  }

  const retrievedAt = new Date(nowMs).toISOString();
  const contentType = response.headers.get('content-type') ?? 'application/json';
  const language = options.lang?.trim() || 'fr';
  const events: DatatourismeBretagneLoadedEvent[] = [];

  for (const event of parsed.records) {
    const provenance = buildProvenance(event, retrievedAt, contentType, language);
    if (!provenance) {
      continue;
    }
    events.push({ event, provenance });
  }

  if (events.length !== parsed.records.length) {
    return {
      status: 'INVALID_RESPONSE',
      events: [],
      rejectedCount: parsed.rejected.length + (parsed.records.length - events.length),
      httpStatus: response.status,
      note: 'A retained DATAtourisme record could not receive complete source provenance.',
    };
  }

  return {
    status: 'OK',
    events,
    rejectedCount: parsed.rejected.length,
    httpStatus: response.status,
    note: 'DATAtourisme Bretagne event metadata loaded with controlled provenance.',
  };
}
