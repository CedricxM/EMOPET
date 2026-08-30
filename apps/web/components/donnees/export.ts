'use client';

import type { CategoryId, LevelId } from './data';

const ACTIVE_DOG_STORAGE_KEY = 'emopet-active-dog-id';
const ACCESS_TOKEN_STORAGE_KEY = 'emopet-access-token';

function getRuntimeExportContext(): { dogId: string; token: string } {
  const dogId = window.localStorage.getItem(ACTIVE_DOG_STORAGE_KEY)?.trim();
  const token = window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)?.trim();
  if (!dogId || !token) {
    throw new Error(
      'Export indisponible : la session backend et le chien actif doivent être connectés. Aucune donnée fictive ne sera générée.',
    );
  }
  return { dogId, token };
}

function filenameFromDisposition(disposition: string | null, fallback: string): string {
  const match = disposition?.match(/filename="?([^";]+)"?/i);
  return match?.[1] ?? fallback;
}

/**
 * Exporte les données réellement disponibles dans le backend EMOPET.
 *
 * Le paramètre `categoryState` est conservé temporairement pour compatibilité UI,
 * mais la portée réglementaire de l'export ne doit pas être réduite par des toggles
 * de présentation. Le backend reste l'autorité sur les données exportables.
 */
export async function exportData(
  format: 'csv' | 'json',
  _categoryState: Record<CategoryId, { on: boolean; level: LevelId }>,
): Promise<void> {
  const { dogId, token } = getRuntimeExportContext();
  const base = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '');
  const url = `${base}/api/data-export?dog_id=${encodeURIComponent(dogId)}&format=${format}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: format === 'csv' ? 'text/csv' : 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Échec export EMOPET (${response.status})${detail ? `: ${detail}` : ''}`);
  }

  const blob = await response.blob();
  const fallback = `emopet-data-export-${new Date().toISOString().slice(0, 10)}.${format}`;
  const filename = filenameFromDisposition(response.headers.get('content-disposition'), fallback);
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
