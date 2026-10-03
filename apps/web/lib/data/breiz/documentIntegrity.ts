import type { BreizDocument, BreizDocumentChunk } from './breizDocument.schema';

const SHA256_HEX_RE = /^[a-f0-9]{64}$/;

function canonicalDocumentPayload(document: BreizDocument): string {
  return JSON.stringify({
    id: document.id,
    title: document.title,
    source_name: document.source_name,
    source_url: document.source_url,
    source_registry_id: document.source_registry_id ?? null,
    license: document.license,
    territory: document.territory,
    region: document.region,
    department: document.department,
    commune: document.commune,
    theme: document.theme,
    tags: [...document.tags],
    summary: document.summary,
    content: document.content,
    reliability_level: document.reliability_level,
    last_checked_at: document.last_checked_at,
    allowed_usage: document.allowed_usage,
  });
}

export function isSha256Hex(value: string | null | undefined): value is string {
  return typeof value === 'string' && SHA256_HEX_RE.test(value);
}

export async function sha256Hex(value: string): Promise<string | null> {
  try {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) return null;
    const digest = await subtle.digest(
      'SHA-256',
      new TextEncoder().encode(value),
    );
    return Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('');
  } catch {
    return null;
  }
}

export function canonicalizeBreizDocumentPayload(
  document: BreizDocument,
): string {
  return canonicalDocumentPayload(document);
}

export async function computeBreizDocumentPayloadSha256(
  document: BreizDocument,
): Promise<string | null> {
  return sha256Hex(canonicalDocumentPayload(document));
}

export async function verifyBreizDocumentPayloadIntegrity(
  document: BreizDocument,
): Promise<boolean> {
  const expected = document.source_authority_binding?.document_payload_sha256;
  if (!isSha256Hex(expected)) return false;
  const actual = await computeBreizDocumentPayloadSha256(document);
  return actual !== null && actual === expected;
}

export async function computeBreizChunkContentSha256(
  chunk: Pick<BreizDocumentChunk, 'content'>,
): Promise<string | null> {
  return sha256Hex(chunk.content);
}

export async function verifyBreizChunkContentIntegrity(
  chunk: BreizDocumentChunk,
): Promise<boolean> {
  if (!isSha256Hex(chunk.content_sha256)) return false;
  const actual = await computeBreizChunkContentSha256(chunk);
  return actual !== null && actual === chunk.content_sha256;
}
