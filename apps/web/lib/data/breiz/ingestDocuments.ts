import type { BreizDocument } from './breizDocument.schema';
import { validateBreizDocument } from './breizDocument.schema';

export interface LocalDocumentSource {
  filename: string;
  content: string;
}

export interface IngestResult {
  documents: BreizDocument[];
  rejected: Array<{ source: string; errors: string[] }>;
}

type PartialDocument = Partial<BreizDocument> & { tags?: string[] | string };

function normalizeTags(tags: string[] | string | undefined): string[] {
  if (Array.isArray(tags)) return tags.map((tag) => tag.trim()).filter(Boolean);
  if (typeof tags === 'string') return tags.split(/[;,]/).map((tag) => tag.trim()).filter(Boolean);
  return [];
}

/**
 * Generic/local ingestion is not release authority.
 *
 * A source payload may ask for a more restrictive usage mode, but it cannot
 * self-promote to `public_answer_with_source`. Public-answer authority requires
 * the separate Breiz source-rights evidence gate and a reviewed GO disposition.
 */
function normalizeIngestedUsage(value: BreizDocument['allowed_usage'] | undefined): BreizDocument['allowed_usage'] {
  if (value === 'do_not_answer') return 'do_not_answer';
  if (value === 'internal_reference') return 'internal_reference';
  return 'retrieval_only';
}

/**
 * Likewise, an imported file cannot declare itself source-verified. That state
 * belongs to a controlled verification/promotion step outside this parser.
 */
function normalizeIngestedReliability(
  value: BreizDocument['reliability_level'] | undefined,
): BreizDocument['reliability_level'] {
  if (value === 'community_pending') return 'community_pending';
  return 'unknown';
}

function withDefaults(raw: PartialDocument, sourceName: string): BreizDocument {
  const now = new Date().toISOString().slice(0, 10);
  const title = raw.title?.trim() || sourceName.replace(/\.[^.]+$/, '');
  return {
    id: raw.id?.trim() || `local-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
    title,
    source_name: raw.source_name?.trim() || 'Local file',
    source_url: raw.source_url ?? null,
    license: raw.license?.trim() || 'License review required before public use',
    territory: raw.territory?.trim() || 'Bretagne',
    region: raw.region?.trim() || 'Bretagne',
    department: raw.department ?? null,
    commune: raw.commune ?? null,
    theme: raw.theme?.trim() || 'local_knowledge',
    tags: normalizeTags(raw.tags),
    summary: raw.summary?.trim() || title,
    content: raw.content?.trim() || '',
    reliability_level: normalizeIngestedReliability(raw.reliability_level),
    last_checked_at: raw.last_checked_at?.trim() || now,
    allowed_usage: normalizeIngestedUsage(raw.allowed_usage),
  };
}

function parseCsv(content: string): PartialDocument[] {
  const rows = content.split(/\r?\n/).filter((line) => line.trim());
  if (rows.length < 2) return [];
  const headers = rows[0]!.split(',').map((header) => header.trim());
  return rows.slice(1).map((row) => {
    const values = row.split(',').map((value) => value.trim());
    return headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = values[index] ?? '';
      return acc;
    }, {});
  });
}

function parseMarkdown(source: LocalDocumentSource): PartialDocument {
  const lines = source.content.split(/\r?\n/);
  const titleLine = lines.find((line) => line.startsWith('# '));
  const title = titleLine?.replace(/^#\s+/, '').trim() || source.filename.replace(/\.md$/i, '');
  return {
    title,
    content: lines.filter((line) => !line.startsWith('# ')).join('\n').trim(),
    tags: ['markdown', 'local'],
  };
}

export function parseLocalDocumentSource(source: LocalDocumentSource): PartialDocument[] {
  if (source.filename.endsWith('.json')) {
    const parsed = JSON.parse(source.content) as PartialDocument[] | PartialDocument;
    return Array.isArray(parsed) ? parsed : [parsed];
  }
  if (source.filename.endsWith('.csv')) return parseCsv(source.content);
  if (source.filename.endsWith('.md') || source.filename.endsWith('.markdown')) return [parseMarkdown(source)];
  throw new Error(`Unsupported local document extension: ${source.filename}`);
}

export function ingestBreizDocuments(sources: LocalDocumentSource[]): IngestResult {
  const documents: BreizDocument[] = [];
  const rejected: IngestResult['rejected'] = [];

  for (const source of sources) {
    try {
      const records = parseLocalDocumentSource(source);
      for (const raw of records) {
        const document = withDefaults(raw, source.filename);
        const errors = validateBreizDocument(document);
        if (errors.length) rejected.push({ source: source.filename, errors });
        else documents.push(document);
      }
    } catch (error) {
      rejected.push({ source: source.filename, errors: [error instanceof Error ? error.message : 'Unknown parse error'] });
    }
  }

  return { documents, rejected };
}
