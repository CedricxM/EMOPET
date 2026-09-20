import type { BreizDocument } from './breizDocument.schema';
import { validateBreizDocument } from './breizDocument.schema';

export interface LocalDocumentSource {
  filename: string;
  content: string;
  /**
   * Reçu de licence couvrant ce fichier, quand le format n'a pas de champ pour
   * le porter — c'est le cas du markdown, qui ne transporte que titre et texte.
   *
   * Sans ce reçu, et sans licence dans l'enregistrement lui-même, le document
   * part en `rejected`. L'opérateur déclare la preuve ; le code ne l'invente
   * pas à sa place.
   */
  license?: string;
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

function withDefaults(raw: PartialDocument, source: LocalDocumentSource): BreizDocument {
  const now = new Date().toISOString().slice(0, 10);
  const title = raw.title?.trim() || source.filename.replace(/\.[^.]+$/, '');
  return {
    id: raw.id?.trim() || `local-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
    title,
    source_name: raw.source_name?.trim() || 'Local file',
    source_url: raw.source_url ?? null,
    // Une licence absente reste absente.
    //
    // La valeur par défaut d'origine était la phrase « License review required
    // before public use ». Elle rendait le champ non vide, donc la règle
    // `license is required` de `validateBreizDocument` ne pouvait plus jamais
    // se déclencher sur ce chemin : tout document sans licence était accepté,
    // porteur d'une phrase occupant la place d'un reçu. Laisser le champ vide
    // rend cette règle à son office et envoie le document dans `rejected`.
    license: raw.license?.trim() || source.license?.trim() || '',
    territory: raw.territory?.trim() || 'Bretagne',
    region: raw.region?.trim() || 'Bretagne',
    department: raw.department ?? null,
    commune: raw.commune ?? null,
    theme: raw.theme?.trim() || 'local_knowledge',
    tags: normalizeTags(raw.tags),
    summary: raw.summary?.trim() || title,
    content: raw.content?.trim() || '',
    reliability_level: raw.reliability_level ?? 'unknown',
    last_checked_at: raw.last_checked_at?.trim() || now,
    allowed_usage: raw.allowed_usage ?? 'retrieval_only',
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
        const document = withDefaults(raw, source);
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
