export interface BreizOfficialDiscovery {
  sourceId: string;
  sourceName: string;
  title: string;
  summary: string | null;
  canonicalUrl: string;
  territory: string | null;
  license: string | null;
  attribution: string;
  sourceUpdatedAt: string | null;
  retrievedAt: string;
}

export interface BreizConnectorStatus {
  sourceId: string;
  ok: boolean;
  recordCount: number;
  warning?: string;
}

export interface BreizOfficialDiscoveryResult {
  query: string;
  retrievedAt: string;
  records: BreizOfficialDiscovery[];
  sources: BreizConnectorStatus[];
}
