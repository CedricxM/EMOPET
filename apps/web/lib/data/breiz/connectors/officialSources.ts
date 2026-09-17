import type {
  BreizConnectorStatus,
  BreizOfficialDiscovery,
  BreizOfficialDiscoveryResult,
} from './types';

const DATA_GOUV_API = 'https://www.data.gouv.fr/api/1';
const REGION_BRETAGNE_API = 'https://data.bretagne.bzh/api/explore/v2.1';
const CULTURE_API = 'https://data.culture.gouv.fr/api/explore/v2.1';
const GEOBRETAGNE_CSW = 'https://geobretagne.fr/geonetwork/srv/fre/csw';
const GALLICA_SRU = 'https://gallica.bnf.fr/SRU';
const DATATOURISME_API = 'https://api.datatourisme.fr/v1/catalog';
const FETCH_TIMEOUT_MS = 8_000;

interface SearchOptions {
  perSourceLimit?: number;
}

interface ConnectorRun {
  sourceId: string;
  run: () => Promise<BreizOfficialDiscovery[]>;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asObject(value: unknown): Record<string, unknown> {
  return isObject(value) ? value : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
}

function nestedString(value: unknown, path: readonly string[]): string | null {
  let current: unknown = value;
  for (const key of path) {
    if (!isObject(current)) return null;
    current = current[key];
  }
  return stringValue(current);
}

function firstString(record: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = stringValue(record[key]);
    if (value) return value;
  }
  return null;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function cleanText(value: string | null, maxLength = 560): string | null {
  if (!value) return null;
  const cleaned = decodeEntities(
    value
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
  if (!cleaned) return null;
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 1).trimEnd()}…` : cleaned;
}

function escapeCqlLiteral(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/'/g, "''");
}

async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        'user-agent': 'EMOPET-Breiz/0.1 official-source-discovery',
        ...init.headers,
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url: string, init: RequestInit = {}): Promise<unknown> {
  const response = await fetchWithTimeout(url, {
    ...init,
    headers: { accept: 'application/json', ...init.headers },
  });
  return response.json() as Promise<unknown>;
}

async function fetchText(url: string, init: RequestInit = {}): Promise<string> {
  const response = await fetchWithTimeout(url, {
    ...init,
    headers: { accept: 'application/xml,text/xml;q=0.9,*/*;q=0.5', ...init.headers },
  });
  return response.text();
}

function extractXmlTag(block: string, tag: string): string | null {
  const pattern = new RegExp(
    `<(?:[A-Za-z0-9_-]+:)?${tag}\\b[^>]*>([\\s\\S]*?)<\\/(?:[A-Za-z0-9_-]+:)?${tag}>`,
    'i',
  );
  return cleanText(pattern.exec(block)?.[1] ?? null);
}

function extractFirstHttpUrl(block: string): string | null {
  const match = block.match(/https?:\/\/[^\s<>'"]+/i);
  return match?.[0] ? decodeEntities(match[0]) : null;
}

function xmlRecordBlocks(xml: string): string[] {
  return xml.match(/<(?:[A-Za-z0-9_-]+:)?record\b[^>]*>[\s\S]*?<\/(?:[A-Za-z0-9_-]+:)?record>/gi) ?? [];
}

function commonRecord(
  sourceId: string,
  sourceName: string,
  retrievedAt: string,
  values: Omit<BreizOfficialDiscovery, 'sourceId' | 'sourceName' | 'retrievedAt'>,
): BreizOfficialDiscovery {
  return { sourceId, sourceName, retrievedAt, ...values };
}

export async function searchDataGouv(query: string, limit = 4): Promise<BreizOfficialDiscovery[]> {
  const params = new URLSearchParams({ q: query, page_size: String(limit) });
  const payload = asObject(await fetchJson(`${DATA_GOUV_API}/datasets/?${params}`));
  const retrievedAt = new Date().toISOString();

  return asArray(payload['data']).slice(0, limit).flatMap((raw) => {
    const item = asObject(raw);
    const title = firstString(item, ['title', 'name']);
    const id = firstString(item, ['id', 'slug']);
    if (!title || !id) return [];
    const organization = asObject(item['organization']);
    const licenseObject = asObject(item['license']);
    const licence = firstString(licenseObject, ['title', 'name', 'id']) ?? stringValue(item['license']);
    const page = firstString(item, ['page']) ?? `https://www.data.gouv.fr/fr/datasets/${id}/`;

    return [commonRecord('data-gouv-fr', 'data.gouv.fr', retrievedAt, {
      title,
      summary: cleanText(firstString(item, ['description'])),
      canonicalUrl: page,
      territory: 'France',
      license: licence,
      attribution: firstString(organization, ['name']) ?? 'Producteur référencé sur data.gouv.fr',
      sourceUpdatedAt: firstString(item, ['last_update', 'last_modified', 'created_at']),
    })];
  });
}

export async function searchRegionBretagneCatalog(query: string, limit = 4): Promise<BreizOfficialDiscovery[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    where: `search("${escapeCqlLiteral(query)}")`,
  });
  const payload = asObject(await fetchJson(`${REGION_BRETAGNE_API}/catalog/datasets?${params}`));
  const retrievedAt = new Date().toISOString();

  return asArray(payload['results']).slice(0, limit).flatMap((raw) => {
    const item = asObject(raw);
    const datasetId = firstString(item, ['dataset_id', 'datasetid']);
    const title =
      nestedString(item, ['metas', 'default', 'title']) ??
      nestedString(item, ['metas', 'default', 'name']) ??
      datasetId;
    if (!datasetId || !title) return [];

    return [commonRecord('region-bretagne-open-data', 'Open data Région Bretagne', retrievedAt, {
      title,
      summary: cleanText(nestedString(item, ['metas', 'default', 'description'])),
      canonicalUrl: `https://data.bretagne.bzh/explore/dataset/${encodeURIComponent(datasetId)}/`,
      territory: 'Bretagne',
      license:
        nestedString(item, ['metas', 'default', 'license']) ??
        nestedString(item, ['metas', 'default', 'license_url']),
      attribution:
        nestedString(item, ['metas', 'default', 'publisher']) ??
        nestedString(item, ['metas', 'default', 'producer']) ??
        'Région Bretagne / producteur du jeu de données',
      sourceUpdatedAt:
        nestedString(item, ['metas', 'default', 'modified']) ??
        nestedString(item, ['metas', 'default', 'data_processed']),
    })];
  });
}

async function searchCultureDataset(
  datasetId: string,
  query: string,
  limit: number,
): Promise<BreizOfficialDiscovery[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    where: `search("${escapeCqlLiteral(query)}")`,
  });
  const payload = asObject(
    await fetchJson(`${CULTURE_API}/catalog/datasets/${encodeURIComponent(datasetId)}/records?${params}`),
  );
  const retrievedAt = new Date().toISOString();

  return asArray(payload['results']).slice(0, limit).flatMap((raw) => {
    const item = asObject(raw);
    const reference = firstString(item, ['reference', 'ref', 'identifiant', 'id']);
    const title = firstString(item, [
      'titre_editorial_de_la_notice',
      'denomination_de_l_edifice',
      'denomination',
      'nom',
      'nom_du_lieu',
      'nom_de_l_equipement',
      'name',
      'title',
    ]);
    if (!title) return [];

    const commune = firstString(item, ['commune_forme_editoriale', 'commune', 'libelle_commune']);
    const departement = firstString(item, ['departement', 'libelle_departement']);
    const territory = [commune, departement].filter(Boolean).join(', ') || 'France';
    const popUrl = reference && datasetId.includes('monuments-historiques')
      ? `https://pop.culture.gouv.fr/notice/merimee/${encodeURIComponent(reference)}`
      : null;

    return [commonRecord('pop-culture', 'Ministère de la Culture · données ouvertes', retrievedAt, {
      title,
      summary: cleanText(firstString(item, [
        'historique',
        'description_de_l_edifice',
        'description',
        'precision_de_la_localisation',
        'label_et_appellation',
      ])),
      canonicalUrl: popUrl ?? `https://data.culture.gouv.fr/explore/dataset/${encodeURIComponent(datasetId)}/`,
      territory,
      license: firstString(item, ['licence', 'license']) ?? 'Réutilisation des informations publiques POP / droits item à vérifier',
      attribution: firstString(item, ['copyright', 'source', 'producteur']) ?? 'Ministère de la Culture',
      sourceUpdatedAt: firstString(item, [
        'date_de_la_derniere_mise_a_jour',
        'date_de_derniere_mise_a_jour',
        'date_modification',
      ]),
    })];
  });
}

export async function searchCultureOpenData(query: string, limit = 4): Promise<BreizOfficialDiscovery[]> {
  const perDataset = Math.max(1, Math.ceil(limit / 2));
  const results = await Promise.all([
    searchCultureDataset('liste-des-immeubles-proteges-au-titre-des-monuments-historiques', query, perDataset),
    searchCultureDataset('base-des-lieux-et-des-equipements-culturels', query, perDataset),
  ]);
  return results.flat().slice(0, limit);
}

export async function searchGeoBretagne(query: string, limit = 4): Promise<BreizOfficialDiscovery[]> {
  const params = new URLSearchParams({
    SERVICE: 'CSW',
    VERSION: '2.0.2',
    REQUEST: 'GetRecords',
    resultType: 'results',
    typeNames: 'csw:Record',
    elementSetName: 'summary',
    outputFormat: 'application/xml',
    constraintLanguage: 'CQL_TEXT',
    constraint_language_version: '1.1.0',
    constraint: `AnyText LIKE '%${query.replace(/[%_']/g, ' ')}%'`,
    maxRecords: String(limit),
  });
  const xml = await fetchText(`${GEOBRETAGNE_CSW}?${params}`);
  const retrievedAt = new Date().toISOString();

  return xmlRecordBlocks(xml).slice(0, limit).flatMap((block) => {
    const title = extractXmlTag(block, 'title');
    if (!title) return [];
    const identifier = extractXmlTag(block, 'identifier');
    const url = extractFirstHttpUrl(block) ??
      (identifier ? `https://geobretagne.fr/datahub/dataset/${encodeURIComponent(identifier)}` : 'https://geobretagne.fr/datahub/');

    return [commonRecord('geobretagne', 'GéoBretagne', retrievedAt, {
      title,
      summary: extractXmlTag(block, 'abstract') ?? extractXmlTag(block, 'description'),
      canonicalUrl: url,
      territory: 'Bretagne',
      license: extractXmlTag(block, 'rights'),
      attribution: extractXmlTag(block, 'publisher') ?? extractXmlTag(block, 'creator') ?? 'Producteur GéoBretagne',
      sourceUpdatedAt: extractXmlTag(block, 'modified') ?? extractXmlTag(block, 'date'),
    })];
  });
}

export async function searchGallica(query: string, limit = 4): Promise<BreizOfficialDiscovery[]> {
  const cql = `gallica all "${escapeCqlLiteral(query)}"`;
  const params = new URLSearchParams({
    version: '1.2',
    operation: 'searchRetrieve',
    query: cql,
    maximumRecords: String(limit),
    startRecord: '1',
  });
  const xml = await fetchText(`${GALLICA_SRU}?${params}`);
  const retrievedAt = new Date().toISOString();

  return xmlRecordBlocks(xml).slice(0, limit).flatMap((block) => {
    const title = extractXmlTag(block, 'title');
    const identifier = extractXmlTag(block, 'identifier') ?? extractFirstHttpUrl(block);
    if (!title || !identifier) return [];

    return [commonRecord('bnf-gallica', 'BnF · Gallica', retrievedAt, {
      title,
      summary: extractXmlTag(block, 'description') ?? extractXmlTag(block, 'subject'),
      canonicalUrl: identifier,
      territory: extractXmlTag(block, 'coverage'),
      license: extractXmlTag(block, 'rights') ?? 'Licence Ouverte pour les métadonnées descriptives BnF',
      attribution: extractXmlTag(block, 'creator') ?? extractXmlTag(block, 'publisher') ?? 'Bibliothèque nationale de France',
      sourceUpdatedAt: extractXmlTag(block, 'date'),
    })];
  });
}

export async function searchDataTourisme(query: string, limit = 4): Promise<BreizOfficialDiscovery[]> {
  const apiKey = process.env['DATATOURISME_API_KEY'];
  if (!apiKey) throw new Error('DATATOURISME_API_KEY missing (free key required)');

  const params = new URLSearchParams({ lang: 'fr', search: query, limit: String(limit) });
  const payload = await fetchJson(`${DATATOURISME_API}?${params}`, {
    headers: { 'X-API-Key': apiKey },
  });
  const root = asObject(payload);
  const candidates = Array.isArray(payload)
    ? payload
    : asArray(root['data']).length
      ? asArray(root['data'])
      : asArray(root['items']).length
        ? asArray(root['items'])
        : asArray(root['results']);
  const retrievedAt = new Date().toISOString();

  return candidates.slice(0, limit).flatMap((raw) => {
    const item = asObject(raw);
    const nameValue = item['name'];
    const nameObject = asObject(nameValue);
    const title = stringValue(nameValue) ?? firstString(nameObject, ['fr', 'value']) ?? firstString(item, ['label', 'title']);
    if (!title) return [];
    const id = firstString(item, ['uuid', 'id', '@id']);
    const url = firstString(item, ['url', 'homepage', 'uri', '@id']) ??
      (id ? `https://explore.datatourisme.fr/poi/${encodeURIComponent(id)}` : 'https://explore.datatourisme.fr/');
    const description = item['description'];
    const descriptionObject = asObject(description);
    const producer = firstString(item, ['HasBeenCreatedBy', 'hasBeenCreatedBy', 'producer']);

    return [commonRecord('datatourisme', 'DATAtourisme', retrievedAt, {
      title,
      summary: cleanText(stringValue(description) ?? firstString(descriptionObject, ['fr', 'value'])),
      canonicalUrl: url,
      territory: firstString(item, ['city', 'locality', 'territory']),
      license: 'Licence Ouverte 2.0',
      attribution: producer ?? 'Producteur touristique référencé par DATAtourisme',
      sourceUpdatedAt: firstString(item, ['lastUpdate', 'last_update', 'updatedAt', 'modified']),
    })];
  });
}

export async function searchBreizOfficialSources(
  rawQuery: string,
  options: SearchOptions = {},
): Promise<BreizOfficialDiscoveryResult> {
  const query = rawQuery.trim();
  if (!query) throw new Error('query_required');
  const perSourceLimit = Math.max(1, Math.min(6, options.perSourceLimit ?? 3));
  const retrievedAt = new Date().toISOString();

  const connectors: ConnectorRun[] = [
    { sourceId: 'pop-culture', run: () => searchCultureOpenData(query, perSourceLimit) },
    { sourceId: 'bnf-gallica', run: () => searchGallica(query, perSourceLimit) },
    { sourceId: 'data-gouv-fr', run: () => searchDataGouv(query, perSourceLimit) },
    { sourceId: 'geobretagne', run: () => searchGeoBretagne(query, perSourceLimit) },
    { sourceId: 'region-bretagne-open-data', run: () => searchRegionBretagneCatalog(query, perSourceLimit) },
  ];

  if (process.env['DATATOURISME_API_KEY']) {
    connectors.push({ sourceId: 'datatourisme', run: () => searchDataTourisme(query, perSourceLimit) });
  }

  const settled = await Promise.all(connectors.map(async ({ sourceId, run }) => {
    try {
      const records = await run();
      const status: BreizConnectorStatus = { sourceId, ok: true, recordCount: records.length };
      return { records, status };
    } catch (error) {
      const warning = error instanceof Error ? error.message : 'connector_failed';
      const status: BreizConnectorStatus = { sourceId, ok: false, recordCount: 0, warning };
      return { records: [] as BreizOfficialDiscovery[], status };
    }
  }));

  if (!process.env['DATATOURISME_API_KEY']) {
    settled.push({
      records: [],
      status: {
        sourceId: 'datatourisme',
        ok: false,
        recordCount: 0,
        warning: 'free_api_key_required',
      },
    });
  }

  return {
    query,
    retrievedAt,
    records: settled.flatMap((entry) => entry.records),
    sources: settled.map((entry) => entry.status),
  };
}
