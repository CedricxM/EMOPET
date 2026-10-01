import { DATATOURISME_BRETAGNE_DEPARTMENTS } from './providerRequest';

export interface DatatourismeBretagneEventRecord {
  uuid: string;
  uri: string | null;
  label: string;
  types: readonly string[];
  department: string;
  producerAttribution: string;
  sourceUpdatedAt: string;
  datatourismeUpdatedAt: string | null;
}

export interface DatatourismeCatalogMeta {
  total: number | null;
  page: number | null;
  pageSize: number | null;
  totalPages: number | null;
  next: string | null;
  previous: string | null;
}

export interface DatatourismeBretagneEventsParseResult {
  records: DatatourismeBretagneEventRecord[];
  rejected: Array<{ index: number; reason: string }>;
  meta: DatatourismeCatalogMeta;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function localizedString(value: unknown, preferredLanguage = 'fr'): string | null {
  const direct = nonEmptyString(value);
  if (direct) return direct;
  if (!isRecord(value)) return null;

  const preferred = nonEmptyString(value[preferredLanguage]);
  if (preferred) return preferred;

  for (const candidate of Object.values(value)) {
    const text = nonEmptyString(candidate);
    if (text) return text;
  }

  return null;
}

function nested(record: UnknownRecord, path: readonly string[]): unknown {
  let current: unknown = record;
  for (const key of path) {
    if (!isRecord(current)) return undefined;
    current = current[key];
  }
  return current;
}

function normalizeTypes(value: unknown): readonly string[] {
  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized ? [normalized] : [];
  }
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => nonEmptyString(item))
    .filter((item): item is string => item !== null);
}

function producerAttribution(value: unknown): string | null {
  const direct = nonEmptyString(value);
  if (direct) return direct;

  const candidates = Array.isArray(value) ? value : [value];
  for (const candidate of candidates) {
    if (!isRecord(candidate)) continue;
    for (const key of ['legalName', 'label', 'name', 'uri', 'identifier']) {
      const text = localizedString(candidate[key]);
      if (text) return text;
    }
  }

  return null;
}

function validIsoTimestamp(value: unknown): string | null {
  const text = nonEmptyString(value);
  if (!text) return null;
  return Number.isFinite(Date.parse(text)) ? text : null;
}

function integerOrNull(value: unknown): number | null {
  return Number.isSafeInteger(value) ? (value as number) : null;
}

export function sanitizeDatatourismePaginationLink(value: unknown): string | null {
  const raw = nonEmptyString(value);
  if (!raw) return null;

  let url: URL;
  try {
    url = new URL(raw, 'https://api.datatourisme.fr');
  } catch {
    return null;
  }

  if (url.protocol !== 'https:' || url.hostname !== 'api.datatourisme.fr') {
    return null;
  }
  if (!url.pathname.startsWith('/v1/')) {
    return null;
  }

  for (const key of [...url.searchParams.keys()]) {
    if (/api[_-]?key|token|secret/i.test(key)) {
      url.searchParams.delete(key);
    }
  }

  return url.toString();
}

/**
 * Normalize a DATAtourisme catalogue response into the minimum metadata needed
 * by the Bretagne events workstream.
 *
 * Fail-closed rules:
 * - no producer attribution => reject;
 * - no valid provider update timestamp => reject;
 * - no structured Brittany department => reject;
 * - no UUID/label => reject;
 * - no contact/media/description data is retained by this v0 contract.
 *
 * This parser does not authorize release. Source rights and Regional Pack
 * release gates remain independent.
 */
export function parseDatatourismeBretagneEventsResponse(
  payload: unknown,
): DatatourismeBretagneEventsParseResult {
  const result: DatatourismeBretagneEventsParseResult = {
    records: [],
    rejected: [],
    meta: {
      total: null,
      page: null,
      pageSize: null,
      totalPages: null,
      next: null,
      previous: null,
    },
  };

  if (!isRecord(payload) || !Array.isArray(payload.objects)) {
    result.rejected.push({ index: -1, reason: 'invalid_catalog_envelope' });
    return result;
  }

  if (isRecord(payload.meta)) {
    result.meta = {
      total: integerOrNull(payload.meta.total),
      page: integerOrNull(payload.meta.page),
      pageSize: integerOrNull(payload.meta.page_size),
      totalPages: integerOrNull(payload.meta.total_pages),
      next: sanitizeDatatourismePaginationLink(payload.meta.next),
      previous: sanitizeDatatourismePaginationLink(payload.meta.previous),
    };
  }

  payload.objects.forEach((raw, index) => {
    if (!isRecord(raw)) {
      result.rejected.push({ index, reason: 'invalid_object' });
      return;
    }

    const uuid = nonEmptyString(raw.uuid);
    const label = localizedString(raw.label);
    const department = nonEmptyString(
      nested(raw, [
        'isLocatedAt',
        'address',
        'hasAddressCity',
        'isPartOfDepartment',
        'insee',
      ]),
    );
    const producer = producerAttribution(raw.hasBeenCreatedBy);
    const sourceUpdatedAt = validIsoTimestamp(raw.lastUpdate);

    if (!uuid) {
      result.rejected.push({ index, reason: 'missing_uuid' });
      return;
    }
    if (!label) {
      result.rejected.push({ index, reason: 'missing_label' });
      return;
    }
    if (!department || !DATATOURISME_BRETAGNE_DEPARTMENTS.includes(
      department as (typeof DATATOURISME_BRETAGNE_DEPARTMENTS)[number],
    )) {
      result.rejected.push({ index, reason: 'outside_bretagne_or_missing_department' });
      return;
    }
    if (!producer) {
      result.rejected.push({ index, reason: 'missing_producer_attribution' });
      return;
    }
    if (!sourceUpdatedAt) {
      result.rejected.push({ index, reason: 'missing_or_invalid_last_update' });
      return;
    }

    result.records.push({
      uuid,
      uri: nonEmptyString(raw.uri),
      label,
      types: normalizeTypes(raw.type),
      department,
      producerAttribution: producer,
      sourceUpdatedAt,
      datatourismeUpdatedAt: validIsoTimestamp(raw.lastUpdateDatatourisme),
    });
  });

  return result;
}
