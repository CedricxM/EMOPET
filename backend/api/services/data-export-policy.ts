export interface PersistedEliExportRow {
  id: string;
  dogId: string;
  timestamp: Date;
  arousal: number;
  valence: number;
  load: number;
  confidence: number | null;
  gateStatus: string;
  sensorReliability: unknown;
  createdAt: Date | null;
}

export interface GuardianEliExportRow {
  id: string;
  dogId: string;
  timestamp: Date;
  confidence: number | null;
  gateStatus: string;
  sensorReliability: unknown;
  createdAt: Date | null;
  publicationScope: 'GUARDIAN_V1';
  latentValuesStatus: 'PUBLISHED' | 'WITHHELD_BY_ELI_GATE';
  arousal?: number;
  load?: number;
  provenance: {
    level: 'inferred';
    warning: string;
  };
}

/**
 * Serialize one persisted ELI state for a Guardian-facing export.
 *
 * Scientific publication authority is intentionally enforced here rather than
 * leaking the persistence schema through `...row`:
 * - valence is internal to V1 and is never exported;
 * - arousal/load are included only for states whose gate is PUBLISH;
 * - confidence, gate status and reliability remain available to explain why a
 *   value was published or withheld.
 *
 * This is a user-facing/export disclosure policy, not a mutation of the
 * internal ELI persistence model.
 */
export function serializeEliForGuardianExport(row: PersistedEliExportRow): GuardianEliExportRow {
  const common: GuardianEliExportRow = {
    id: row.id,
    dogId: row.dogId,
    timestamp: row.timestamp,
    confidence: row.confidence,
    gateStatus: row.gateStatus,
    sensorReliability: row.sensorReliability,
    createdAt: row.createdAt,
    publicationScope: 'GUARDIAN_V1',
    latentValuesStatus: row.gateStatus === 'PUBLISH' ? 'PUBLISHED' : 'WITHHELD_BY_ELI_GATE',
    provenance: {
      level: 'inferred',
      warning: row.gateStatus === 'PUBLISH'
        ? 'Derived ELI output under the current Guardian publication gate; do not treat as raw sensor data or a veterinary diagnosis.'
        : 'Derived ELI latent values withheld because the current publication gate does not authorize their disclosure for this state.',
    },
  };

  if (row.gateStatus !== 'PUBLISH') return common;

  return {
    ...common,
    arousal: row.arousal,
    load: row.load,
  };
}

export function csvField(value: unknown): string {
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? null);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function exportEnvelopeToCsv(envelope: Record<string, unknown>): string {
  const rows: Array<Record<string, unknown>> = [];
  const pushRows = (recordType: string, values: unknown) => {
    if (!Array.isArray(values)) return;
    for (const value of values) rows.push({ record_type: recordType, ...(value as Record<string, unknown>) });
  };

  pushRows('device', envelope['devices']);
  pushRows('preprocessed_sensor_summary', envelope['preprocessed']);
  pushRows('inferred_eli_state', envelope['inferred']);
  pushRows('baseline', envelope['baselines']);

  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const lines = [headers.map(csvField).join(',')];
  for (const row of rows) {
    lines.push(headers.map((header) => csvField(row[header])).join(','));
  }
  return `${lines.join('\r\n')}\r\n`;
}
